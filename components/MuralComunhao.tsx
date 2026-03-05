import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, Send, Trash2, Edit2, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserAccount } from '../types';

interface Comment {
    id: string;
    autor: string;
    conteudo: string;
    created_at: string;
}

interface ForumPost {
    id: string;
    autor: string;
    role: string;
    conteudo: string;
    topico: string;
    is_fixed: boolean;
    created_at: string;
    comentarios?: Comment[];
}

interface MuralComunhaoProps {
    userProfile: UserAccount;
}

const MuralComunhao: React.FC<MuralComunhaoProps> = ({ userProfile }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [novoPost, setNovoPost] = useState("");
    const [topico, setTopico] = useState("Testemunho");

    // Estados auxiliares de UI
    const [editandoPostId, setEditandoPostId] = useState<string | null>(null);
    const [textoEditado, setTextoEditado] = useState("");

    const [comentandoPostId, setComentandoPostId] = useState<string | null>(null);
    const [novoComentario, setNovoComentario] = useState("");

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        let query = supabase
            .from('forum_posts')
            .select('id, record')
            .order('created_at', { ascending: false })
            .limit(20);

        if (userProfile.organization_id) {
            query = query.eq('organization_id', userProfile.organization_id);
        }

        const { data } = await query;
        if (data) {
            const mapped = data.map((d: any) => ({
                id: d.id,
                ...d.record
            })) as ForumPost[];

            // Ordenar no cliente pelos fixados primeiro (já que extraímos do record)
            mapped.sort((a, b) => {
                if (a.is_fixed === b.is_fixed) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                return a.is_fixed ? -1 : 1;
            });

            setPosts(mapped);
        }
    };

    const enviarPost = async () => {
        if (!novoPost.trim()) return;
        const { supabaseService } = await import('../services/supabaseService');

        try {
            const postRecord = {
                id: crypto.randomUUID(),
                autor: userProfile.nome,
                role: userProfile.role,
                conteudo: novoPost,
                topico: topico,
                is_fixed: false,
                created_at: new Date().toISOString(),
                comentarios: []
            };
            await supabaseService.upsert('forum_posts', postRecord);
            setNovoPost("");
            fetchPosts();
        } catch (e) {
            console.error("Erro ao enviar post", e);
            alert("Erro ao enviar post. Verifique a conexão.");
        }
    };

    const excluirPost = async (id: string, autor: string) => {
        if (autor !== userProfile.nome && userProfile.role !== 'Master' && userProfile.role !== 'Líder') {
            return alert("Sem permissão para excluir.");
        }
        if (!confirm("Deletar post permanentemente?")) return;

        const { supabaseService } = await import('../services/supabaseService');
        try {
            await supabaseService.delete('forum_posts', id);
            setPosts(posts.filter(p => p.id !== id));
        } catch (e) {
            console.error(e);
            alert("Erro ao excluir.");
        }
    };

    const iniciarEdicao = (post: ForumPost) => {
        if (post.autor !== userProfile.nome && userProfile.role !== 'Master') {
            return alert("Sem permissão para editar.");
        }
        setEditandoPostId(post.id);
        setTextoEditado(post.conteudo);
    };

    const salvarEdicao = async (post: ForumPost) => {
        if (!textoEditado.trim()) return;
        const { supabaseService } = await import('../services/supabaseService');

        try {
            const updated = { ...post, conteudo: textoEditado };
            await supabaseService.upsert('forum_posts', updated);
            setEditandoPostId(null);
            setTextoEditado("");
            fetchPosts();
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar edição.");
        }
    };

    const enviarComentario = async (post: ForumPost) => {
        if (!novoComentario.trim()) return;
        const { supabaseService } = await import('../services/supabaseService');

        try {
            const comment = {
                id: crypto.randomUUID(),
                autor: userProfile.nome,
                conteudo: novoComentario,
                created_at: new Date().toISOString()
            };

            const updatedPost = {
                ...post,
                comentarios: [...(post.comentarios || []), comment]
            };

            await supabaseService.upsert('forum_posts', updatedPost);
            setComentandoPostId(null);
            setNovoComentario("");
            fetchPosts();
        } catch (e) {
            console.error(e);
            alert("Erro ao comentar.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100 pb-10">
            <div className="p-6 bg-black text-white flex justify-between items-center border-b-[6px] border-lime-peregrinas">
                <h2 className="font-black uppercase flex items-center gap-3 tracking-tighter text-xl">
                    <MessageSquare size={24} className="text-lime-500" /> Mural de Comunhão
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest text-lime-400">Ao Vivo</span>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                {posts.length === 0 && (
                    <div className="text-center py-10 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                        Nenhuma mensagem encontrada.
                    </div>
                )}
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`p-4 rounded-3xl border shadow-sm transition-all ${post.is_fixed
                            ? 'bg-lime-50 border-lime-300'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <span className="font-black text-sm text-gray-900 uppercase">
                                    {post.autor}
                                </span>
                                <span className={`font-bold text-[9px] uppercase tracking-widest ${post.is_fixed ? 'text-lime-700' : 'text-gray-400'}`}>
                                    {post.topico} • {new Date(post.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex gap-2 items-center">
                                {post.is_fixed && <Pin size={16} className="text-lime-600 fill-lime-600" />}
                                {(post.autor === userProfile.nome || userProfile.role === 'Master') && (
                                    <>
                                        <button onClick={() => iniciarEdicao(post)} className="text-gray-400 hover:text-black transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => excluirPost(post.id, post.autor)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                        </div>

                        {editandoPostId === post.id ? (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={textoEditado}
                                    onChange={e => setTextoEditado(e.target.value)}
                                    className="w-full p-3 text-sm border-2 rounded-xl outline-none focus:border-black"
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditandoPostId(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                    <button onClick={() => salvarEdicao(post)} className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-black text-white rounded-lg hover:scale-105 transition-all">Salvar</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{post.conteudo}</p>
                        )}

                        {/* Seção de Comentários */}
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                            <ul className="space-y-2 mb-2">
                                {(post.comentarios || []).map(c => (
                                    <li key={c.id} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{c.autor}</span>
                                        <span className="text-xs text-gray-600 font-medium">{c.conteudo}</span>
                                    </li>
                                ))}
                            </ul>

                            {comentandoPostId === post.id ? (
                                <div className="flex flex-col gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={novoComentario}
                                        onChange={e => setNovoComentario(e.target.value)}
                                        placeholder="Escreva um comentário..."
                                        className="w-full p-3 text-xs border rounded-xl outline-none focus:border-black font-semibold"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') enviarComentario(post); }}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setComentandoPostId(null)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                        <button onClick={() => enviarComentario(post)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-colors">Enviar</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setComentandoPostId(post.id)}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                                >
                                    <MessageCircle size={14} /> Responder
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input de Texto principal */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <select
                    value={topico}
                    onChange={(e) => setTopico(e.target.value)}
                    className="mb-2 w-full p-3 text-[10px] font-black border rounded-xl bg-gray-50 outline-none uppercase tracking-widest cursor-pointer hover:border-black transition-colors"
                >
                    <option>Testemunho</option>
                    <option>Pedido de Oração</option>
                    <option>Insight CD</option>
                </select>
                <div className="flex gap-2">
                    <textarea
                        value={novoPost}
                        onChange={(e) => setNovoPost(e.target.value)}
                        placeholder="Edifique a geração..."
                        className="flex-1 p-3 text-sm border-2 rounded-xl resize-none outline-none focus:border-black font-medium"
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                enviarPost();
                            }
                        }}
                    />
                    <button
                        onClick={enviarPost}
                        className="bg-lime-400 text-black p-4 rounded-xl self-end hover:scale-105 active:scale-95 transition-all shadow-md group border border-lime-500 hover:bg-lime-500"
                    >
                        <Send size={20} className="transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MuralComunhao;

