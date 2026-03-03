import React, { useState } from 'react';
import { Calculator, DollarSign, Sprout, Coins } from 'lucide-react';

const TitheCalculator: React.FC = () => {
    const [inputValue, setInputValue] = useState<string>('');

    const parseCurrency = (val: string) => {
        // Remove non-numeric chars except comma
        const clean = val.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    };

    const rawValue = parseCurrency(inputValue);
    const dizimo = rawValue * 0.1;
    const primicia = rawValue / 30;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="space-y-4 animate-in pb-10 max-w-2xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div className="text-left w-full">
                    <h1 className="text-2xl md:text-3xl font-black uppercase text-gray-900 leading-tight flex items-center gap-3">
                        <Calculator className="text-lime-600" /> Calculadora
                    </h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Dízimos e Primícias</p>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 ml-1 mr-1 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">

                <div className="w-full relative mb-8">
                    <label className="text-[11px] font-black uppercase text-gray-400 ml-1 mb-2 block text-left">Valor Bruto do Salário / Renda</label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</div>
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-2xl outline-none focus:border-lime-300 focus:bg-white transition-all text-gray-900 shadow-inner"
                            placeholder="0,00"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-2 text-left uppercase tracking-widest">
                        Este cálculo é privado e feito apenas no seu celular. Nenhum dado é salvo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="bg-lime-50/50 p-6 rounded-3xl border border-lime-100 flex flex-col items-center text-center shadow-sm">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-xs flex items-center justify-center text-lime-600 mb-4">
                            <DollarSign size={24} strokeWidth={3} />
                        </div>
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-1">Dízimo (10%)</h3>
                        <p className="text-3xl font-black text-lime-600 tracking-tighter">
                            {formatCurrency(dizimo)}
                        </p>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex flex-col items-center text-center shadow-sm">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-xs flex items-center justify-center text-amber-500 mb-4">
                            <Sprout size={24} strokeWidth={3} />
                        </div>
                        <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-1">Primícia (1 Dia)</h3>
                        <p className="text-3xl font-black text-amber-500 tracking-tighter">
                            {formatCurrency(primicia)}
                        </p>
                    </div>
                </div>

                {(rawValue > 0) && (
                    <div className="mt-4 w-full bg-gray-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                <Coins size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-lime-400">Entrega Total</p>
                                <p className="text-xs font-medium text-gray-400">Dízimo + Primícia</p>
                            </div>
                        </div>
                        <p className="text-3xl font-black tracking-tighter">
                            {formatCurrency(dizimo + primicia)}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TitheCalculator;
