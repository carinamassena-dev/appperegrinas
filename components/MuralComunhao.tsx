import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Heart, MessageCircle, Send, PlusCircle, Bell } from 'lucide-react';

interface Post {
  id: string;
  user_name: string;
  content: string;
  type: 'Testemunho' | 'Oração' | 'Palavra';
  likes: number;
  comments_count: number;
}

const MuralComunhao = ({ userProfile }: { userProfile: any }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'Testemunho' | 'Oração' | 'Palavra'>('Testemunho');

  // Subscrever ao Realtime para notificações sem polling (Economiza Egress)
  useEffect(() => {
    const channel = supabase
      .channel('mural_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mural' }, payload => {
        setPosts(prev => [payload.new as Post, ...prev]);
        // Trigger de notificação visual simples
        if (Notification.permission === 'granted') {
          new Notification("Nova mensagem no Mural!");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLike = async (postId: string) => {
    // Optimistic Update: Atualiza na UI instantaneamente
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    
    // RPC no Supabase para incrementar (mais barato que SELECT + UPDATE)
    await supabase.rpc('increment_likes', { post_id: postId });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* HEADER LEVE */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Mural de Comunhão</h2>
          <span className="flex items-center text-[10px] font-bold text-lime-600 animate-pulse">
            <span className="w-2 h-2 bg-lime-600 rounded-full mr-2"></span> AO VIVO
          </span>
        </div>
        <div className="relative p-2 bg-gray-100 rounded-full">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
        </div>
      </div>

      {/* INPUT CARD */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          {['Testemunho', 'Oração', 'Palavra'].map((t) => (
            <button
              key={t}
              onClick={() => setPostType(t as any)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
                postType === t ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Edifique a geração..."
            className="w-full p-4 bg-gray-50 rounded-2xl resize-none outline-none focus:ring-2 ring-lime-200 text-sm font-medium"
            rows={3}
          />
          <button className="p-4 bg-lime-peregrinas rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-lime-200">
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* FEED DE CARDS */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-5 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-lime-100">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_name}`} alt="avatar" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight">{post.user_name}</h4>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{post.type}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">{post.content}</p>
            <div className="flex items-center gap-6 border-t pt-4">
              <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors">
                <Heart size={18} className={post.likes > 0 ? 'fill-red-500 text-red-500' : ''} />
                <span className="text-xs font-bold">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-400 hover:text-lime-600 transition-colors">
                <MessageCircle size={18} />
                <span className="text-xs font-bold">{post.comments_count}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MuralComunhao;
