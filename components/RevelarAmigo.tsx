import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, Sparkles, Loader2, Lock, AlertCircle } from 'lucide-react';
import { revelarAmigoSecretoByToken } from '../services/dataService';

export const RevelarAmigo: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [resultado, setResultado] = useState<any | null>(null);
    const [isRevelado, setIsRevelado] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const t = queryParams.get('id');

        if (t) {
            setToken(t);
            carregarSorteio(t);
        } else {
            setErro('Link de Revelação Inválido. Peça à sua líder que envie o link novamente.');
            setIsLoading(false);
        }
    }, [location]);

    const carregarSorteio = async (t: string) => {
        setIsLoading(true);
        try {
            const data = await revelarAmigoSecretoByToken(t);
            if (data) {
                setResultado(data);
            } else {
                setErro('Sorteio não encontrado ou Token inválido.');
            }
        } catch (error) {
            setErro('Erro de conexão ao buscar o seu amigo secreto.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-pulse">
                <Loader2 className="animate-spin text-lime-500 w-16 h-16 mb-4" />
                <h1 className="text-xl font-black uppercase tracking-widest text-gray-900">Descriptografando...</h1>
                <p className="text-xs text-gray-500 font-bold uppercase mt-2">Buscando o seu papel do sorteio</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
                    <AlertCircle className="text-red-500 w-16 h-16 mx-auto mb-4" />
                    <h1 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-2">Ops! Algo Deu Errado</h1>
                    <p className="text-sm font-bold text-gray-500 leading-relaxed">{erro}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-6 font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-black transition-colors"
                    >
                        Página Inicial
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 selection:bg-lime-500 selection:text-black">
            <div className={`bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center transform transition-all duration-700 ${isRevelado ? 'scale-100 ring-4 ring-lime-400/50' : 'scale-95'}`}>

                <div className="mb-8">
                    <div className="w-20 h-20 bg-lime-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner relative overflow-hidden group">
                        <Gift className={`text-lime-600 w-10 h-10 transition-transform duration-500 ${isRevelado ? 'scale-125 rotate-12' : 'animate-bounce'}`} />
                        {isRevelado && <Sparkles className="absolute top-2 right-2 text-yellow-400 w-4 h-4 animate-ping" />}
                    </div>

                    <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-none">
                        Amigo Secreto
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                        {new Date(resultado.created_at).toLocaleDateString()}
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Olá,</p>
                        <h2 className="text-xl font-black text-black uppercase truncate px-2">{resultado.nome_participante}</h2>
                    </div>

                    <div className="relative">
                        {!isRevelado ? (
                            <button
                                onClick={() => setIsRevelado(true)}
                                className="w-full bg-lime-400 hover:bg-lime-500 text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_8px_30px_rgb(204,255,0,0.3)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 overflow-hidden relative group"
                            >
                                <Lock size={18} className="group-hover:hidden" />
                                <Sparkles size={18} className="hidden group-hover:block animate-spin-slow" />
                                Tocar para Revelar
                            </button>
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-500 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 relative">
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-black tracking-widest uppercase text-gray-400">
                                    Seu Amigo Secreto é:
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black uppercase text-lime-600 break-words leading-tight bg-clip-text text-transparent bg-gradient-to-r from-lime-600 to-green-600">
                                    {resultado.nome_sorteado}
                                </h3>
                            </div>
                        )}
                    </div>
                </div>

                {isRevelado && (
                    <p className="mt-8 text-[10px] uppercase font-bold text-gray-400 tracking-widest animate-in slide-in-from-bottom-2 fade-in duration-700 delay-300">
                        Guarde esse nome só para você! 🤫
                    </p>
                )}
            </div>
        </div>
    );
};
