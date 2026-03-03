
import React, { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

const ImageGenerator: React.FC = () => {
  useEffect(() => {
    console.log('[ImageGenerator] tela carregada');
  }, []);

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-white rounded-[3rem] border p-10 text-center">
      <div className="space-y-4">
        <ShieldAlert size={60} className="mx-auto text-gray-200" />
        <h2 className="text-xl font-black uppercase text-gray-400">Funcionalidade Desabilitada</h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">As funcionalidades de Inteligência Artificial foram removidas deste projeto.</p>
      </div>
    </div>
  );
};

export default ImageGenerator;
