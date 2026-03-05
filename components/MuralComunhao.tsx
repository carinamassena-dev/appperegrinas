import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserAccount } from '../types';

interface ForumPost {
    id: string;
    titulo: string;
    conteudo: string;
    autor: string;
    autorUsername: string;
    data: string;
    categoria: string;
    fixado: boolean;
}

interface MuralProps {
    userProfile: UserAccount | null;
}

const MuralComunhao: React.FC<MuralProps> = ({ userProfile }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [titulo, setTitulo] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [categoria, setCategoria] = useState('Geral');
    const [postando, setPostando] = useState(false);
    const [loading, setLoading] = useState(true);

    const isMasterOrLider = userProfile?.role === 'Master' || userProfile?.role === 'Líder';

    const loadPosts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('mural')
                .select('*')
                .order('fixado', { ascending: false })
                .order('data', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) setPosts(data as ForumPost[]);
        } catch (error) {
            console.error('Erro ao buscar mural:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
        
        // Setup real-time listener para novos posts
        const channel = supabase
            .channel('mural_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'mural' }, 
                () => {
                    loadPosts();
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handlePostar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !conteudo || !userProfile) return;

        setPostando(true);
        try {
            const newPost = {
                id: `POST_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                titulo,
                conteudo,
                categoria,
                autor: userProfile.nome || 'Visitante',
                autorUsername: userProfile.username,
                data: new Date().toISOString(),
                fixado: false
            };

            const { error } = await supabase.from('mural').insert([newPost]);
            
            if (error) throw error;

            setTitulo('');
            setConteudo('');
            // A atualização da lista acontecerá automaticamente via real-time channel
        } catch (error) {
            console.error('Erro ao postar no mural:', error);
            alert('Não foi possível enviar a mensagem.');
        } finally {
            setPostando(false);
        }
    };

    const handleFixar = async (id: string, estaFixado: boolean) => {
        try {
            const { error } = await supabase
                .from('mural')
                .update({ fixado: !estaFixado })
                .eq('id', id);
                
            if (error) throw error;
        } catch (error) {
            console.error('Erro ao fixar post:', error);
            alert('Apenas líderes ou masters podem fixar avisos.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase flex items-center gap-3 tracking-tighter">
                    <MessageSquare className="text-lime-500" size={32} />
                    Mural de Comunhão
                </h1>
                <p className="text-gray-500 text-sm font-medium">Compartilhe avisos, dúvidas ou testemunhos com a rede.</p>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
                <form onSubmit={handlePostar} className="space-y-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Tema / Título da Mensagem..."
                            required
                            className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-lime-200 transition-all text-sm"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                        />
                        <select
                            className="w-40 p-4 bg-gray-50 rounded-2xl font-bold outline-none border-none text-sm cursor-pointer"
                            value={categoria}
                            onChange={e => setCategoria(e.target.value)}
                        >
                            <option value="Avisos">Avisos</option>
                            <option value="Pedido de Oração">Pedido de Oração</option>
                            <option value="Testemunho">Testemunho</option>
                            <option value="Geral">Assunto Geral</option>
                        </select>
                    </div>
                    <textarea
                        required
                        placeholder="Escreva sua mensagem aqui para todos verem..."
                        rows={3}
                        className="w-full p-4 bg-gray-50 rounded-2xl font-medium outline-none border-2 border-transparent focus:border-lime-200 transition-all text-sm resize-none"
                        value={conteudo}
                        onChange={e => setConteudo(e.target.value)}
                    ></textarea>
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={postando || !titulo || !conteudo}
                            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-gray-800"
                        >
                            <Send size={16} /> {postando ? 'Enviando...' : 'Publicar Agora'}
                        </button>
                    </div>
                </form>
            </div>

            {loading ? (
                 <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold">O mural está vazio. Seja a primeira a postar! ✨</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className={`p-6 rounded-[2rem] border transition-all ${post.fixado ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-white shadow-sm'}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                                            post.categoria === 'Avisos' ? 'bg-red-100 text-red-600' :
                                            post.categoria === 'Pedido de Oração' ? 'bg-blue-100 text-blue-600' :
                                            post.categoria === 'Testemunho' ? 'bg-green-100 text-green-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>{post.categoria}</span>
                                        {post.fixado && <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded-md"><Pin size={10} /> Fixado Oficial</span>}
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 leading-tight">{post.titulo}</h3>
                                    <div className="flex items-center gap-2 mt-1 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Por: {post.autor} (@{post.autorUsername})</span>
                                        <span>•</span>
                                        <span>{new Date(post.data).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{post.conteudo}</p>
                                </div>
                                
                                {isMasterOrLider && (
                                    <button 
                                        onClick={() => handleFixar(post.id, post.fixado)}
                                        className={`p-3 rounded-xl transition-all ${post.fixado ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
                                        title={post.fixado ? 'Desafixar Aviso' : 'Fixar no Topo'}
                                    >
                                        <Pin size={18} fill={post.fixado ? 'currentColor' : 'none'} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}
        </div>
    );
};

export default MuralComunhao;
