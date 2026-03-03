import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Ticket, AlertTriangle, CloudOff, FileText, DollarSign, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HelpCenter: React.FC = () => {
    const navigate = useNavigate();
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">

            {/* Maintenance Banner */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="text-yellow-600 shrink-0 mt-1" size={24} />
                <div>
                    <h3 className="text-yellow-800 font-black uppercase text-sm tracking-tight">Aviso de Manutenção</h3>
                    <p className="text-yellow-700 text-xs font-medium mt-1">O sistema de tickets está em modo de leitura. Novas solicitações poderão ser enviadas assim que a manutenção do banco de dados for concluída.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 leading-none flex items-center gap-3">
                        <HelpCircle size={32} className="text-lime-600" /> Central de Ajuda
                    </h1>
                    <p className="text-gray-400 italic font-medium text-xs md:text-sm mt-2">Manual Rápido e Suporte Oficial do Aplicativo Peregrinas</p>
                </div>
                <button
                    onClick={() => navigate('/tickets')}
                    className="bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Ticket size={18} /> ABRIR TICKET DE SUPORTE
                </button>
            </div>

            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border p-6 md:p-10 space-y-4">

                <AccordionItem
                    title="Cadastro de Discípulas"
                    icon={Users}
                    isOpen={openSection === 'discipulas'}
                    onClick={() => toggleSection('discipulas')}
                >
                    <p className="text-gray-600 text-sm mb-4">A tela "Rede" ou "Peregrinas" permite adicionar novas ovelhas ao seu rebanho.</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        <li>Ao clicar em "Adicionar", você deve preencher o nome e o WhatsApp da discípula obrigatoriamente.</li>
                        <li><b>Auto-Cadastro:</b> No botão "Exportar & Ferramentas", você pode gerar um Link Único. Envie este link para a discípula preencher os próprios dados no celular dela sem precisar baixar o aplicativo.</li>
                        <li>Excluir alguém exige confirmação para evitar perdas de dados.</li>
                    </ul>
                </AccordionItem>

                <AccordionItem
                    title="Financeiro e Lançamentos"
                    icon={DollarSign}
                    isOpen={openSection === 'finance'}
                    onClick={() => toggleSection('finance')}
                >
                    <p className="text-gray-600 text-sm mb-4">Controle entradas (Dízimos e Ofertas) e saídas (Despesas) da sua célula.</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        <li>Certifique-se de registrar a data exata da transação.</li>
                        <li><b>Caixa Atual:</b> O topo da página financeiro faz um cálculo do mês inteiro somando entradas e subtraindo saídas de todas as células.</li>
                        <li>Atente-se à categoria para facilitar o relatório mensal (ex: "Cantina", "Oração").</li>
                    </ul>
                </AccordionItem>

                <AccordionItem
                    title="Relatórios de Célula (Atas)"
                    icon={FileText}
                    isOpen={openSection === 'atas'}
                    onClick={() => toggleSection('atas')}
                >
                    <p className="text-gray-600 text-sm mb-4">O envio das Atas de Célula é semanal e contabiliza a presença no reino.</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        <li>Ao criar a ata, selecione a data do encontro e a célula correta.</li>
                        <li>Adicione visitantes (nome e origem) para a liderança poder entrar em contato através do módulo de "Colheita".</li>
                        <li>Os números da oferta da célula inseridos na ata devem bater também com um lançamento no módulo Financeiro!</li>
                    </ul>
                </AccordionItem>

                <AccordionItem
                    title="Modo Offline e Rascunhos (NOVO)"
                    icon={CloudOff}
                    isOpen={openSection === 'offline'}
                    onClick={() => toggleSection('offline')}
                >
                    <div className="bg-lime-50/50 p-4 rounded-xl border border-lime-100 mb-4">
                        <p className="text-sm text-lime-800 font-medium">O aplicativo agora conta com o sistema inteligente "Offline-First". Suas digitações estão seguras mesmo que a internet caia.</p>
                    </div>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        <li><b>Auto-Save:</b> Sempre que você digita em formulários grandes (como Nova Peregrina ou Evento), o app salva seu progresso secretamente no seu aparelho a cada tecla digitada.</li>
                        <li>Se você fechar o app por engano e voltar, seus dados estarão lá te esperando!</li>
                        <li><b>Se a internet cair na hora de salvar:</b> O app mostrará um aviso. Haverá um ícone de Nuvem no topo da tela indicando "Rascunhos Pendentes". Clique na nuvem para mandar tudo pro servidor assim que a internet voltar.</li>
                    </ul>
                </AccordionItem>

                <AccordionItem
                    title="Suporte e Tickets"
                    icon={Ticket}
                    isOpen={openSection === 'support'}
                    onClick={() => toggleSection('support')}
                >
                    <p className="text-gray-600 text-sm mb-4">Como solicitar ajuda oficial ao time de tecnologia ou à liderança Master?</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                        <li>O módulo <b>"Chamados & Tickets"</b> da barra lateral (ou o botão preto no topo desta página) é o canal oficial de comunicação de bugs, solicitação de novas funções ou dúvidas operacionais.</li>
                        <li>Não mande dúvidas técnicas em grupos do WhatsApp. Registre um Ticket oficial. A Ouvidoria do app acompanha e resolve.</li>
                        <li>Após abrir o ticket, acompanhe o status (Aberto, Em Análise, Concluído) no mesmo menu.</li>
                        <li className="text-lime-700 font-bold mt-4 p-2 bg-lime-50 rounded-lg"><b>Usuárias antigas:</b> seu primeiro acesso continua sendo pelo nome de usuário. O sistema solicitará seu e-mail na sequência da autenticação.</li>
                    </ul>
                </AccordionItem>

            </div>
        </div>
    );
};

const AccordionItem = ({ title, icon: Icon, isOpen, onClick, children }: any) => (
    <div className="border border-gray-100 rounded-2xl overflow-hidden transition-all">
        <button
            onClick={onClick}
            className={`w-full p-5 md:p-6 flex items-center justify-between transition-colors ${isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isOpen ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon size={20} />
                </div>
                <span className="font-black text-sm md:text-base uppercase tracking-tight text-gray-900">{title}</span>
            </div>
            {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>
        {isOpen && (
            <div className="p-6 bg-white border-t border-gray-50">
                {children}
            </div>
        )}
    </div>
);

export default HelpCenter;
