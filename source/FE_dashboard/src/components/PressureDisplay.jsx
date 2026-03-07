import React from 'react';

const PressureDisplay = ({ value = 0, label = "press" }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Contenitore principale (Lo "schermetto") */}
      <div className="w-36 h-24 bg-[#e5e7eb] rounded-[25px] border-[3px] border-gray-500 shadow-inner flex items-center justify-center relative overflow-hidden">
        
        {/* Riflesso opzionale per dare l'effetto "vetro" dello schermo */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-y-12 transform -translate-y-4"></div>

        {/* Valore numerico */}
        <span className="text-4xl font-black text-[#4b5563] tracking-tighter z-10">
          {Math.round(value)}
        </span>
      </div>

      {/* Etichetta sotto lo schermo */}
      <div className="mt-1 text-sm font-bold text-black uppercase tracking-widest opacity-80">
        {label}
      </div>
    </div>
  );
};

export default PressureDisplay;