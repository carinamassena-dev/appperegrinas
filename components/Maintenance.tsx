import React from 'react';
import { Settings, Wrench, Sprout, Heart, Flower2 } from 'lucide-react';

export const Maintenance: React.FC = () => {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">

            {/* Decorative Top */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-lime-50 to-transparent pointer-events-none"></div>

            <div className="relative z-10 max-w-lg w-full flex flex-col items-center">

                {/* Icon Cluster */}
                <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
                    <div className="absolute inset-0 bg-lime-100/50 rounded-full animate-pulse decoration-clone"></div>
                    <div className="w-32 h-32 bg-lime-peregrinas rounded-[2rem] rotate-12 flex items-center justify-center shadow-xl shadow-lime-200">
                        <Flower2 size={60} className="text-black -rotate-12" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-lime-50">
                        <Settings size={22} className="text-gray-400 animate-[spin_4s_linear_infinite]" />
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase mb-6">
                    Pausa para <br />
                    <span className="text-lime-600">Florescer</span>
                </h1>

                <div className="bg-gray-50 border border-gray-100 p-8 rounded-[2.5rem] shadow-sm mb-8">
                    <p className="text-gray-500 font-medium leading-relaxed mb-4 text-sm md:text-base">
                        O aplicativo das Peregrinas está passando por uma manutenção programada nos nossos servidores (Supabase) para receber novas melhorias e garantir a segurança dos seus dados.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-lime-700 font-black uppercase tracking-widest text-[10px] md:text-xs">
                        <Wrench size={14} /> Retornaremos em breve
                    </div>
                </div>

                {/* Footer info */}
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 justify-center">
                    Feito com <Heart size={12} className="text-red-400 fill-red-400" /> para a Geração de Luz
                </p>

            </div>
        </div>
    );
};

export default Maintenance;
