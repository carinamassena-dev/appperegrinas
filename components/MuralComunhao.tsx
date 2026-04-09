
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Pin, Send, Trash2, Edit2, MessageCircle, Heart, User, Check, Flame, Star } from 'lucide-react';
import { UserAccount } from '../types';
import { loadData, saveRecord } from '../services/dataService';

interface Comment {
    id: string;
    autor: string;
    conteudo: string;
    created_at: string;
}

interface ForumPost {
    id: string;
    autor: string;
    autor_id?: string;
    role: string;
    conteudo: string;
    topico: string;
    is_fixed: boolean;
    created_at: string;
    likes?: string[]; // IDs of users who liked
    comentarios?: Comment[];
}

interface MuralComunhaoProps {
    userProfile: UserAccount;
}

const CATEGORIES = [
    { id: 'Testemunho', label: 'Testemunho', emoji: '🙌' },
    { id: 'Pedido de Oração', label: 'Pedido de Oração', emoji: '🙏' },
    { id: 'Palavra de Fé', label: 'Palavra de Fé', emoji: '📖' },
    { id: 'Gratidão', label: 'Gratidão', emoji: '✨' },
    { id: 'Praise', label: 'Praise', emoji: '🎸' }
];

const MuralComunhao: React.FC<MuralComunhaoProps> = ({ userProfile }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [novoPost, setNovoPost] = useState("");
    const [topico, setTopico] = useState("Testemunho");
    const [loading, setLoading] = useState(true);

    // UI helpers
    const [editandoPostId, setEditandoPostId] = useState<string | null>(null);
    const [textoEditado, setTextoEditado] = useState("");
    const [comentandoPostId, setComentandoPostId] = useState<string | null>(null);
    const [novoComentario, setNovoComentario] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const { supabaseService } = await import('../services/supabaseService');
            const mapped = await supabaseService.getMuralPosts(userProfile.organization_id);
            if (mapped) {
                const sorted = [...mapped].sort((a: any, b: any) => {
                    if (a.is_fixed === b.is_fixed) {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                    return a.is_fixed ? -1 : 1;
                });
                setPosts(sorted as ForumPost[]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const enviarPost = async () => {
        if (!novoPost.trim()) return;
        try {
            const { supabaseService } = await import('../services/supabaseService');
            const postRecord: ForumPost = {
                id: crypto.randomUUID(),
                autor: userProfile.nome,
                autor_id: userProfile.id,
                role: userProfile.role,
                conteudo: novoPost,
                topico: topico,
                is_fixed: false,
                created_at: new Date().toISOString(),
                likes: [],
                comentarios: []
            };
            await supabaseService.upsert('forum_posts', postRecord);
            setNovoPost("");
            fetchPosts();
        } catch (e) {
            console.error(e);
            alert("Erro ao enviar post.");
        }
    };

    const handleLike = async (post: ForumPost) => {
        const userId = userProfile.id;
        const likes = post.likes || [];
        const newLikes = likes.includes(userId)
            ? likes.filter(id => id !== userId)
            : [...likes, userId];

        const updatedPost = { ...post, likes: newLikes };
        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));

        const { supabaseService } = await import('../services/supabaseService');
        await supabaseService.upsert('forum_posts', updatedPost);
    };

    const excluirPost = async (id: string, autor: string) => {
        if (autor !== userProfile.nome && userProfile.role !== 'Master' && userProfile.role !== 'Líder') {
            return alert("Sem permissão para excluir.");
        }
        if (!confirm("Deletar post permanentemente?")) return;
        try {
            const { supabaseService } = await import('../services/supabaseService');
            await supabaseService.delete('forum_posts', id);
            setPosts(posts.filter(p => p.id !== id));
        } catch (e) {
            alert("Erro ao excluir.");
        }
    };

    const salvarEdicao = async (post: ForumPost) => {
        if (!textoEditado.trim()) return;
        try {
            const { supabaseService } = await import('../services/supabaseService');
            const updated = { ...post, conteudo: textoEditado };
            await supabaseService.upsert('forum_posts', updated);
            setEditandoPostId(null);
            setTextoEditado("");
            fetchPosts();
        } catch (e) {
            alert("Erro ao salvar.");
        }
    };

    const enviarComentario = async (post: ForumPost) => {
        if (!novoComentario.trim()) return;
        try {
            const { supabaseService } = await import('../services/supabaseService');
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
            alert("Erro ao comentar.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-white md:rounded-[3rem] shadow-sm overflow-hidden border border-gray-100 relative">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-16 bg-lime-peregrinas rounded-full"></div>
                    <div>
                        <h2 className="text-[22px] font-extrabold tracking-tight leading-tight uppercase text-gray-900">Mural de Comunhão</h2>
                        <p className="text-sm font-black uppercase text-gray-400 tracking-[0.2em] mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Ao Vivo
                        </p>
                    </div>
                </div>
            </div>

            {/* Posts List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-6 pb-40 bg-gray-50/50 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-20 animate-pulse text-lime-600"><Flame size={40} /></div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-gray-300 font-black uppercase text-xs tracking-widest">Inicie a conversa edificar a geração!</div>
                ) : (
                    posts.map((post) => {
                        const hasLiked = post.likes?.includes(userProfile.id);
                        const categoryObj = CATEGORIES.find(c => c.id === post.topico) || CATEGORIES[0];

                        return (
                            <div key={post.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all animate-in slide-in-from-bottom-4">
                                {/* Post Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-lime-peregrinas p-0.5 overflow-hidden bg-gray-50 flex items-center justify-center">
                                            {(post as any).foto_url ? (
                                                <img src={(post as any).foto_url} className="w-full h-full object-cover rounded-full" alt="" />
                                            ) : (
                                                <User className="text-gray-300" size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-base text-gray-900 leading-none">{post.autor}</h3>
                                            <p className="text-[10px] font-black uppercase text-gray-400 mt-1 flex items-center gap-1">
                                                <span className="text-xs">{categoryObj.emoji}</span> {categoryObj.label}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {post.is_fixed && <Pin size={16} className="text-lime-600 fill-lime-600" />}
                                        {(post.autor === userProfile.nome || userProfile.role === 'Master') && (
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditandoPostId(post.id); setTextoEditado(post.conteudo); }} className="p-1.5 text-gray-300 hover:bg-gray-50 rounded-lg"><Edit2 size={14} /></button>
                                                <button onClick={() => excluirPost(post.id, post.autor)} className="p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                {editandoPostId === post.id ? (
                                    <div className="space-y-3">
                                        <textarea value={textoEditado} onChange={e => setTextoEditado(e.target.value)} className="w-full p-4 border-2 rounded-2xl outline-none focus:border-black font-medium text-sm" rows={3} autoFocus />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditandoPostId(null)} className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                                            <button onClick={() => salvarEdicao(post)} className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase">Salvar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-700 text-sm md:text-base leading-relaxed font-medium mb-6">{post.conteudo}</p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-6 border-t pt-4">
                                    <button
                                        onClick={() => handleLike(post)}
                                        className={`flex items-center gap-2 text-xs font-black uppercase transition-all ${hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                                    >
                                        <Heart size={18} className={hasLiked ? 'fill-red-500' : ''} />
                                        {hasLiked ? 'Amei' : 'Ame'} {post.likes?.length > 0 && <span className="opacity-60 ml-1">{post.likes.length}</span>}
                                    </button>
                                    <button
                                        onClick={() => setComentandoPostId(comentandoPostId === post.id ? null : post.id)}
                                        className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-black transition-all"
                                    >
                                        <MessageCircle size={18} /> Comentar {post.comentarios?.length > 0 && <span className="opacity-60 ml-1">{post.comentarios.length}</span>}
                                    </button>
                                </div>

                                {/* Comments */}
                                {comentandoPostId === post.id && (
                                    <div className="mt-4 animate-in slide-in-from-top-2">
                                        <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {(post.comentarios || []).map(c => (
                                                <div key={c.id} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-900 uppercase mb-1">{c.autor}</p>
                                                    <p className="text-xs text-gray-600 font-medium">{c.conteudo}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={novoComentario}
                                                onChange={e => setNovoComentario(e.target.value)}
                                                placeholder="Escreva algo..."
                                                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-lime-peregrinas font-medium text-xs"
                                                onKeyDown={e => e.key === 'Enter' && enviarComentario(post)}
                                            />
                                            <button onClick={() => enviarComentario(post)} className="p-3 bg-lime-peregrinas text-black rounded-xl hover:scale-105 transition-all"><Send size={16} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Bottom Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-30">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* Category Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setTopico(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-[10px] font-black uppercase transition-all border ${topico === cat.id ? 'bg-gray-900 text-white border-black shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span>{cat.emoji}</span> {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={novoPost}
                                onChange={e => setNovoPost(e.target.value)}
                                placeholder="Edifique a geração..."
                                className="w-full pl-6 pr-14 py-4 md:py-5 bg-gray-100 border-2 border-transparent rounded-[2rem] font-bold text-sm outline-none focus:bg-white focus:border-lime-200 transition-all shadow-inner"
                                onKeyDown={e => e.key === 'Enter' && enviarPost()}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2">
                                <button
                                    onClick={() => alert("Upload de fotos em breve!")}
                                    className="p-2 text-gray-400 hover:text-black transition-colors"
                                >
                                    <Star size={18} />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={enviarPost}
                            disabled={!novoPost.trim()}
                            className="w-14 h-14 md:w-16 md:h-16 rounded-[2rem] bg-lime-peregrinas text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale group"
                        >
                            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MuralComunhao;
