import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AuthContext, hasPermission } from '../App';
import { loadData, saveRecord, getDiscipleByName } from '../services/dataService';
import { Ticket, TicketMessage, TicketStatus, TicketType } from '../types';
import { MessageSquarePlus, Clock, CheckCircle2, Search, X, MessageCircle, Send, Plus, Filter, AlertCircle, Bookmark, UserCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { logAction } from '../services/auditService';
import { Disciple } from '../types';
import imageCompression from 'browser-image-compression';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

interface InputFieldProps {
    label: string;
    type?: string;
    value: string | number;
    onChange: (val: string) => void;
    options?: string[];
    required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, type = "text", value, onChange, options, required }) => (
    <div className="space-y-1 w-full">
        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">{label} {required && <span className="text-red-400">*</span>}</label>
        {options ? (
            <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none text-xs focus:ring-4 focus:ring-lime-100 transition-all shadow-sm appearance-none" value={value} onChange={e => onChange(e.target.value)} required={required}>
                <option value="" disabled>Selecione...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ) : type === 'textarea' ? (
            <textarea className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none text-xs focus:ring-4 focus:ring-lime-100 transition-all shadow-sm resize-none h-32" value={value} onChange={e => onChange(e.target.value)} required={required} />
        ) : (
            <input type={type} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none text-xs focus:ring-4 focus:ring-lime-100 transition-all shadow-sm" value={value} onChange={e => onChange(e.target.value)} required={required} />
        )}
    </div>
);

export const Tickets: React.FC = () => {
    const { user: currentUser } = useContext(AuthContext);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState('');

    const [newTicket, setNewTicket] = useState<Partial<Ticket>>({
        title: '', description: '', type: 'Oração', status: 'Aberto'
    });
    const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);

    // For 'Atualização Cadastral'
    const [requestChanges, setRequestChanges] = useState<{ field: string, newValue: string }[]>([
        { field: '', newValue: '' }
    ]);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTickets();

        const handleSync = () => loadTickets();
        window.addEventListener('ticketsSync', handleSync);
        return () => window.removeEventListener('ticketsSync', handleSync);
    }, [currentUser]);

    useEffect(() => {
        if (selectedTicket) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages]);

    const loadTickets = async () => {
        // Lightweight query for the list
        const { data, error } = await supabase.from('tickets').select('id, record->>title, record->>type, record->>status, record->>creatorId, record->>creatorName, record->>createdAt, record->>updatedAt, record->description').order('id', { ascending: false });
        if (error || !data) {
            console.error(error);
            return;
        }

        const mapped = data.map(d => ({
            id: d.id,
            title: d.title,
            type: d.type as TicketType,
            status: d.status as TicketStatus,
            creatorId: d.creatorId,
            creatorName: d.creatorName,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            description: d.description || '',
            messages: [] // Don't load messages in list
        }));
        setTickets(mapped as Ticket[]);
    };

    const loadTicketFull = async (id: string) => {
        const { data } = await supabase.from('tickets').select('record').eq('id', id).single();
        if (data && data.record) {
            setSelectedTicket(data.record as Ticket);
        }
    };

    const canManageTickets = hasPermission(currentUser, 'tickets', 'edit');


    const displayedTickets = useMemo(() => {
        let filtered = tickets.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

            // Regra de visibilidade baseada no usuário logado
            const matchesVisibility = canManageTickets ? true : t.creatorId === currentUser?.id;

            return matchesSearch && matchesStatus && matchesVisibility;
        });

        return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [tickets, searchTerm, filterStatus, currentUser, canManageTickets]);

    const handleSaveTicket = async () => {
        if (!newTicket.type) return;

        let reqChangesArray: { field: string, label: string, newValue: string }[] | undefined;

        if (newTicket.type === 'Atualização Cadastral') {
            const validChanges = requestChanges.filter(c => c.field.trim() !== '' && c.newValue.trim() !== '');
            if (validChanges.length === 0) return alert("Selecione pelo menos um campo e preencha o novo valor.");

            const fieldMap: Record<string, string> = {
                'WhatsApp': 'whatsapp',
                'Data de Nascimento': 'dataAniversario',
                'Endereço': 'endereco',
                'Bairro': 'bairro',
                'Profissão': 'profissao',
                'Estado Civil': 'statusRelacionamento',
                'Ministério': 'ministerio',
                'Líder Direta': 'liderDireta',
                'Líder 12 (Pastor)': 'lider12',
                'Área de Formação': 'areaFormacao',
                'Cores Preferidas': 'coresPreferidas',
                'Presentes Preferidos': 'presentesPreferidos',
                'Livros Preferidos': 'livrosPreferidos',
                'Observação': 'observacao'
            };

            reqChangesArray = validChanges.map(change => ({
                field: fieldMap[change.field] || change.field,
                label: change.field,
                newValue: change.newValue
            }));

        } else {
            if (!newTicket.title || !newTicket.description) return alert("Preencha o título e a descrição.");
        }

        const isUpdate = newTicket.type === 'Atualização Cadastral';

        let finalTitle = newTicket.title!;
        let finalDesc = newTicket.description!;

        if (isUpdate && reqChangesArray) {
            const fieldsStr = reqChangesArray.map(r => r.label).join(', ');
            finalTitle = `Atualização de Cadastro: ${fieldsStr.length > 30 ? fieldsStr.substring(0, 30) + '...' : fieldsStr}`;

            const detailsList = reqChangesArray.map(r => `• ${r.label}: ${r.newValue}`).join('\n');
            finalDesc = `Solicito a alteração do(s) seguinte(s) campo(s) no meu cadastro:\n\n${detailsList}`;
        }

        // Handle attachment upload with compression (max 100KB)
        if (ticketAttachment) {
            try {
                const options = { maxSizeMB: 0.1, maxWidthOrHeight: 1280, useWebWorker: true };
                const compressedFile = await imageCompression(ticketAttachment, options);
                const fileExt = ticketAttachment.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const url = await supabaseService.uploadImage(compressedFile, fileName, 'tickets');
                finalDesc += `\n\n📷 Anexo de Evidência: ${url}`;
            } catch (err) {
                console.error('Erro no upload do anexo:', err);
                alert("Falha ao enviar e comprimir o anexo. O ticket será salvo sem ele.");
            }
        }

        const ticketToSave: Ticket = {
            id: `TCK_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            title: finalTitle,
            description: finalDesc,
            type: newTicket.type as TicketType,
            status: 'Aberto',
            creatorId: currentUser?.id || 'unknown',
            creatorName: currentUser?.nome || 'Anônimo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            requestedChanges: reqChangesArray
        };

        const updatedList = [ticketToSave, ...tickets];
        setTickets(updatedList);
        await saveRecord('tickets', ticketToSave);

        logAction("Novo Ticket", `Ticket "${ticketToSave.title}" criado por ${currentUser?.nome}`, "EVENTO");
        setShowModal(false);
        setNewTicket({ title: '', description: '', type: 'Oração', status: 'Aberto' });
        setRequestChanges([{ field: '', newValue: '' }]);
        setTicketAttachment(null);
        window.dispatchEvent(new Event('ticketsSync'));
    };

    const handleApproveUpdate = async () => {
        if (!selectedTicket || !selectedTicket.requestedChanges || selectedTicket.requestedChanges.length === 0) return;

        try {
            // Optimized: fetch only the specific disciple by name (zero full-list egress)
            const disciple = await getDiscipleByName(selectedTicket.creatorName);

            if (!disciple) {
                alert(`Não foi possível encontrar a Peregrina "${selectedTicket.creatorName}" no cadastro geral para fazer a atualização automática. Você deverá alterar manualmente lá.`);
                return;
            }

            // Update specific fields safely
            const updatedDisciple = { ...disciple } as any;
            let changesSummary = [];

            for (const change of selectedTicket.requestedChanges) {
                updatedDisciple[change.field] = change.newValue;
                changesSummary.push(`"${change.label}" para "${change.newValue}"`);
            }

            await saveRecord('disciples', updatedDisciple);

            // Add auto-message and close ticket
            const autoMsg: TicketMessage = {
                id: `MSG_${Math.random().toString(36).substr(2, 9)}`,
                authorId: 'system',
                authorName: 'Sistema',
                content: `✅ Solicitação aprovada por ${currentUser?.nome}. Os seguintes campos foram atualizados automaticamente: \n\n${changesSummary.join('\n')}`,
                createdAt: new Date().toISOString()
            };

            const closedTicket: Ticket = {
                ...selectedTicket,
                status: 'Concluído',
                updatedAt: new Date().toISOString(),
                messages: [...selectedTicket.messages, autoMsg]
            };

            const updatedList = tickets.map(t => t.id === selectedTicket.id ? closedTicket : t);
            setTickets(updatedList);
            setSelectedTicket(closedTicket);
            await saveRecord('tickets', closedTicket);

            logAction("Aprovação de Cadastro", `${currentUser?.nome} aprovou atualização (múltiplos campos) de ${selectedTicket.creatorName}`, "USUARIO");
            alert("Cadastro atualizado com sucesso!");
            window.dispatchEvent(new Event('ticketsSync'));

        } catch (err) {
            console.error(err);
            alert("Ocorreu um erro ao atualizar o cadastro.");
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;

        const message: TicketMessage = {
            id: `MSG_${Math.random().toString(36).substr(2, 9)}`,
            authorId: currentUser?.id || 'unknown',
            authorName: currentUser?.nome || 'Anônimo',
            content: newMessage.trim(),
            createdAt: new Date().toISOString()
        };

        // Atualiza status se um líder responder a um ticket aberto
        let newStatus = selectedTicket.status;
        if (canManageTickets && selectedTicket.creatorId !== currentUser?.id && selectedTicket.status === 'Aberto') {
            newStatus = 'Respondido';
        } else if (!canManageTickets && selectedTicket.status === 'Respondido') {
            newStatus = 'Aberto'; // Volta para aberto se o criador respondeu
        }

        const updatedTicket = {
            ...selectedTicket,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            messages: [...selectedTicket.messages, message]
        };

        const updatedList = tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t);
        setTickets(updatedList);
        setSelectedTicket(updatedTicket);
        setNewMessage('');
        await saveRecord('tickets', updatedTicket);

        logAction("Mensagem no Ticket", `Mensagem em "${updatedTicket.title}" por ${currentUser?.nome}`, "EVENTO");
        window.dispatchEvent(new Event('ticketsSync'));
    };

    const updateStatus = async (newStatus: TicketStatus) => {
        if (!selectedTicket) return;

        const updatedTicket = { ...selectedTicket, status: newStatus, updatedAt: new Date().toISOString() };
        const updatedList = tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t);

        setTickets(updatedList);
        setSelectedTicket(updatedTicket);
        await saveRecord('tickets', updatedTicket);

        logAction("Status do Ticket", `Ticket "${updatedTicket.title}" mudou para ${newStatus}`, "EVENTO");
        window.dispatchEvent(new Event('ticketsSync'));
    };

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'Aberto': return 'bg-red-100 text-red-600 border-red-200';
            case 'Em Andamento': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
            case 'Respondido': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'Concluído': return 'bg-green-100 text-green-600 border-green-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getTypeIcon = (type: TicketType) => {
        switch (type) {
            case 'Oração': return <Bookmark size={14} className="text-purple-500" />;
            case 'Agendamento': return <Clock size={14} className="text-blue-500" />;
            case 'Dúvida': return <MessageCircle size={14} className="text-yellow-500" />;
            case 'Suporte': return <AlertCircle size={14} className="text-red-500" />;
            case 'Atualização Cadastral': return <UserCircle size={14} className="text-lime-600" />;
            default: return <MessageSquarePlus size={14} className="text-gray-500" />;
        }
    };

    return (
        <div className="space-y-4 animate-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900 leading-tight">Ouvidoria & Tickets</h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Suporte, Orações e Agendamentos</p>
                </div>
                <button onClick={() => setShowModal(true)} className="w-full md:w-auto bg-black text-white px-6 py-4 rounded-xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Plus size={18} /> Novo Ticket
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border shadow-sm mx-1 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input type="text" placeholder="Buscar chamados..." className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl font-bold outline-none border-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <Filter size={16} className="text-gray-400 ml-2" />
                        {['all', 'Aberto', 'Respondido', 'Em Andamento', 'Concluído'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status as any)}
                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${filterStatus === status ? 'bg-black text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                {status === 'all' ? 'Todos' : status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mx-1">
                {displayedTickets.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2rem] p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquarePlus className="text-gray-300" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhum chamado encontrado</p>
                            <p className="text-gray-300 text-xs mt-1 font-medium">Crie um novo ticket para enviar uma solicitação.</p>
                        </div>
                    </div>
                ) : (
                    displayedTickets.map((ticket) => {
                        const isUnreadForCreator = !canManageTickets && (ticket.status === 'Respondido' || ticket.status === 'Em Andamento');
                        const isUnreadForLeader = canManageTickets && ticket.status === 'Aberto';
                        const showPulse = isUnreadForCreator || isUnreadForLeader;

                        return (
                            <div
                                key={ticket.id}
                                onClick={() => loadTicketFull(ticket.id)}
                                className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-lime-200 hover:shadow-md transition-all cursor-pointer relative"
                            >
                                {showPulse && (
                                    <div className="absolute top-5 right-5 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200" title="Atualização não lida!" />
                                )}

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-2 flex-1 pr-6 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(ticket.type)}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{ticket.type}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-gray-900 line-clamp-1">{ticket.title}</h3>
                                            <p className="text-xs font-medium text-gray-500 line-clamp-1 mt-1">{ticket.description}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 pt-2 border-t border-gray-50">
                                            <span>👤 {ticket.creatorName}</span>
                                            <span>📅 {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                                            <span>💬 {ticket.messages.length} mensagens</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Ticket Details/Chat Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-3xl h-[90vh] md:h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                            <div className="space-y-2 relative pr-8">
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(selectedTicket.type)}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedTicket.type}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getStatusColor(selectedTicket.status)}`}>
                                        {selectedTicket.status}
                                    </span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{selectedTicket.title}</h2>
                                <p className="text-[11px] font-bold text-gray-400">Criado por {selectedTicket.creatorName} em {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="px-4 py-2 bg-white flex-shrink-0 flex items-center gap-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm cursor-pointer border text-[10px] font-black uppercase tracking-wider">
                                <X size={16} /> Fechar
                            </button>
                        </div>


                        {/* Actions (Líder/Master) */}
                        {canManageTickets && (
                            <div className="px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap md:flex-nowrap gap-2 items-center">
                                <span className="text-[10px] font-black uppercase text-gray-400 py-2 w-full md:w-auto">Alterar Status:</span>
                                {['Em Andamento', 'Respondido', 'Concluído'].map(s => (
                                    <button key={s} onClick={() => updateStatus(s as TicketStatus)}
                                        className={`px-3 py-1.5 flex-1 md:flex-none rounded-lg text-[10px] font-black uppercase tracking-wider ${selectedTicket.status === s ? getStatusColor(s as TicketStatus) : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                        {s}
                                    </button>
                                ))}

                                {selectedTicket.type === 'Atualização Cadastral' && selectedTicket.status === 'Aberto' && selectedTicket.requestedChanges && (
                                    <button
                                        onClick={handleApproveUpdate}
                                        className="ml-auto w-full md:w-auto mt-2 md:mt-0 bg-lime-500 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-md flex items-center justify-center gap-2 hover:bg-lime-400 transition-all border border-lime-600"
                                    >
                                        <CheckCircle2 size={16} /> Aprovar e Atualizar
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/30">
                            {/* Opener message */}
                            <div className="flex flex-col items-start gap-1">
                                <div className="bg-white border shadow-sm rounded-2xl p-4 max-w-[90%] md:max-w-[75%]">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                                    {selectedTicket.description.includes('📷 Anexo de Evidência:') && (
                                        <div className="mt-3">
                                            <a href={selectedTicket.description.split('📷 Anexo de Evidência: ')[1]} target="_blank" rel="noreferrer" className="text-xs font-bold text-lime-600 underline">
                                                Visualizar Anexo Completo
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 ml-2">{selectedTicket.creatorName} • {new Date(selectedTicket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {selectedTicket.messages.map((msg) => {
                                const isMe = msg.authorId === currentUser?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-2xl p-4 max-w-[90%] md:max-w-[75%] shadow-sm ${isMe ? 'bg-lime-peregrinas text-black rounded-tr-sm' : 'bg-white border rounded-tl-sm'}`}>
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe ? 'font-medium' : 'text-gray-700'}`}>{msg.content}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold text-gray-400 ${isMe ? 'mr-2' : 'ml-2'}`}>
                                            {msg.authorName} • {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        {selectedTicket.status !== 'Concluído' ? (
                            <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                                <textarea
                                    className="flex-1 p-4 bg-gray-50 rounded-2xl font-medium outline-none border border-transparent focus:border-lime-200 text-sm resize-none h-14 hide-scrollbar"
                                    placeholder="Digite sua resposta..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-lime-400 hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
                                >
                                    <Send size={20} className={newMessage.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 bg-green-50 text-center border-t border-green-100">
                                <p className="text-[10px] font-black uppercase text-green-600 tracking-widest flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> Ticket Encerrado
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Ticket Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 md:p-8 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Plus size={24} className="text-lime-600" /> Novo Chamado</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-white rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <InputField label="Categoria" type="select" options={['Oração', 'Agendamento', 'Dúvida', 'Suporte', 'Atualização Cadastral', 'Outros']} value={newTicket.type || ''} onChange={v => setNewTicket({ ...newTicket, type: v as TicketType })} required />

                            {newTicket.type === 'Atualização Cadastral' ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Campos para Atualização</p>
                                        <button
                                            onClick={() => setRequestChanges([...requestChanges, { field: '', newValue: '' }])}
                                            className="text-[10px] font-black uppercase text-lime-600 bg-lime-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-lime-100 transition-colors"
                                        >
                                            <Plus size={14} /> Adicionar Campo
                                        </button>
                                    </div>

                                    {requestChanges.map((change, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-100 relative">
                                            <div className="flex-1 w-full">
                                                <InputField
                                                    label={`Campo ${index + 1}`}
                                                    type="select"
                                                    options={['WhatsApp', 'Data de Nascimento', 'Endereço', 'Bairro', 'Profissão', 'Estado Civil', 'Ministério', 'Líder Direta', 'Líder 12 (Pastor)', 'Área de Formação', 'Cores Preferidas', 'Presentes Preferidos', 'Livros Preferidos', 'Observação']}
                                                    value={change.field}
                                                    onChange={v => {
                                                        const newArr = [...requestChanges];
                                                        newArr[index].field = v;
                                                        setRequestChanges(newArr);
                                                    }}
                                                    required
                                                />
                                            </div>
                                            <div className="flex-1 w-full">
                                                <InputField
                                                    label="Novo Valor Exato"
                                                    value={change.newValue}
                                                    onChange={v => {
                                                        const newArr = [...requestChanges];
                                                        newArr[index].newValue = v;
                                                        setRequestChanges(newArr);
                                                    }}
                                                    required
                                                />
                                            </div>
                                            {requestChanges.length > 1 && (
                                                <button
                                                    onClick={() => setRequestChanges(requestChanges.filter((_, i) => i !== index))}
                                                    className="p-3 text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-colors md:mt-5"
                                                    title="Remover campo"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="bg-lime-50 border border-lime-100 rounded-xl p-4 text-[11px] text-lime-800 font-medium">
                                        Sua solicitação será analisada pela liderança. Se aprovada, seu cadastro será modificado automaticamente com os exatos valores preenchidos.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <InputField label="Assunto / Título Resumido" value={newTicket.title || ''} onChange={v => setNewTicket({ ...newTicket, title: v })} required />
                                    <InputField label="Descreva os detalhes..." type="textarea" value={newTicket.description || ''} onChange={v => setNewTicket({ ...newTicket, description: v })} required />
                                    <div className="space-y-1 w-full mt-4">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest flex items-center gap-1">
                                            <ImageIcon size={14} /> Anexar Evidência/Foto (Max 100KB automático)
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setTicketAttachment(e.target.files[0]);
                                                }
                                            }}
                                            className="w-full p-3 bg-gray-50 rounded-2xl font-bold text-xs outline-none border border-gray-100"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 grid grid-cols-2 gap-4">
                                <button onClick={() => setShowModal(false)} className="py-4 bg-gray-50 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button onClick={handleSaveTicket} className="py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-lime-400 hover:text-black transition-colors shadow-lg">Abrir Ticket</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
