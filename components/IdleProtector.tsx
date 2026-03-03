import React, { useState, useEffect, useCallback } from 'react';
import { Lock } from 'lucide-react';

export const IdleProtector: React.FC = () => {
    const [isIdle, setIsIdle] = useState(false);
    const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutos

    const resetTimer = useCallback(() => {
        if (isIdle) return; // Se já estiver bloqueado, ignorar os eventos normais até o clique de desbloqueio

        // Limpa o timer atual e cria um novo
        if ((window as any).idleTimer) {
            clearTimeout((window as any).idleTimer);
        }

        (window as any).idleTimer = setTimeout(() => {
            setIsIdle(true);
        }, IDLE_TIMEOUT);
    }, [isIdle]);

    useEffect(() => {
        // Inicializa o timer pela primeira vez
        resetTimer();

        // Eventos a serem monitorados
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

        const handleUserActivity = () => {
            resetTimer();
        };

        events.forEach(event => {
            // passive: true para não prejudicar performance do scroll
            window.addEventListener(event, handleUserActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
            if ((window as any).idleTimer) {
                clearTimeout((window as any).idleTimer);
            }
        };
    }, [resetTimer]);

    const unlockSession = () => {
        setIsIdle(false);
        // O resetTimer será recriado pelos eventos nativos, mas garantimos o reset aqui
        if ((window as any).idleTimer) {
            clearTimeout((window as any).idleTimer);
        }
        (window as any).idleTimer = setTimeout(() => {
            setIsIdle(true);
        }, IDLE_TIMEOUT);
    };

    if (!isIdle) return null;

    return (
        <div
            onClick={unlockSession}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/30 backdrop-blur-md cursor-pointer animate-in fade-in duration-500"
        >
            <div
                className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-gray-100 animate-in zoom-in-95 duration-500"
                onClick={(e) => e.stopPropagation()} // Opcional: ou deixar clicar na própria caixa pra desbloquear
            >
                <div className="w-20 h-20 bg-lime-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <Lock size={40} className="text-lime-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2 text-center uppercase tracking-tighter">
                    Sessão Protegida
                </h2>
                <p className="text-gray-500 text-center font-medium mb-8">
                    Sua sessão foi ocultada por inatividade para proteger seus dados.
                </p>

                <button
                    onClick={unlockSession}
                    className="w-full py-4 bg-lime-peregrinas text-black font-black uppercase tracking-widest text-[11px] rounded-2xl hover:scale-105 transition-transform shadow-xl hover:shadow-lime-500/20 active:scale-95"
                >
                    Clique para voltar
                </button>
            </div>
        </div>
    );
};
