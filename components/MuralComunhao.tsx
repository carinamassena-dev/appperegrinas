import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserAccount } from '../types';

interface ForumPost {
    id: string;
    autor: string;
    role: string;
    conteudo: string;
    topico: string;
    is_fixed: boolean;
    created_at: string;
}

interface MuralComunhaoProps {
    userProfile: UserAccount;
}

// Estrutura Ultra-Lite: Texto Puro para Zero Egress de Mídia
const MuralComunhao: React.FC<MuralComunhaoProps> = ({ userProfile }) => {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [novoPost, setNovoPost] = useState("");
    const [topico, setTopico] = useState("Testemunho");

    useEffect(() => {
        fetchPosts();
    }, []);

    // Busca apenas os últimos 20 posts para economizar banda
    const fetchPosts = async () => {
        let query = supabase
            .from('forum_posts')
            .select('id, autor, role, conteudo, topico, is_fixed, created_at')
            .order('is_fixed', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20);

        if (userProfile.organization_id) {
            query = query.eq('organization_id', userProfile.organization_id);
        }

        const { data } = await query;
        if (data) setPosts(data as ForumPost[]);
    };

    const enviarPost = async () => {
        if (!novoPost.trim()) return;

        const { supabaseService } = await import('../services/supabaseService');

        try {
            await supabaseService.upsert('forum_posts', {
                id: Math.random().toString(36).substr(2, 9),
                autor: userProfile.nome,
                role: userProfile.role, // Master ou Líder
                conteudo: novoPost,
                topico: topico,
                is_fixed: false,
                created_at: new Date().toISOString()
            });
            setNovoPost("");
            fetchPosts();
        } catch (e) {
            console.error("Erro ao enviar post", e);
            alert("Erro ao enviar post. Verifique a conexão.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-4 bg-purple-700 text-white flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2">
                    <MessageSquare size={20} /> Mural de Comunhão
                </h2>
                <span className="text-xs opacity-80">90 Discípulas Conectadas</span>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`p-3 rounded-lg border ${post.is_fixed
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-white border-gray-100'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-purple-900">
                                {post.autor}{' '}
                                <span className="font-normal text-gray-400">({post.topico})</span>
                            </span>
                            {post.is_fixed && <Pin size={14} className="text-yellow-600" />}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{post.conteudo}</p>
                    </div>
                ))}
            </div>

            {/* Input de Texto (Sem upload de imagem/arquivo) */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <select
                    value={topico}
                    onChange={(e) => setTopico(e.target.value)}
                    className="mb-2 w-full p-2 text-xs border rounded bg-gray-50 outline-none"
                >
                    <option>Testemunho</option>
                    <option>Pedido de Oração</option>
                    <option>Insight CD</option>
                </select>
                <div className="flex gap-2">
                    <textarea
                        value={novoPost}
                        onChange={(e) => setNovoPost(e.target.value)}
                        placeholder="Escreva sua palavra..."
                        className="flex-1 p-2 text-sm border rounded-lg resize-none outline-none focus:border-purple-500"
                        rows={2}
                    />
                    <button
                        onClick={enviarPost}
                        className="bg-purple-600 text-white p-2 rounded-lg self-end hover:bg-purple-700"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MuralComunhao;
