import React from 'react';

const TempGraph = ({ data = [40, 25, 45, 30, 55, 40, 50], label = "temp" }) => {
  // Trasformiamo i dati in coordinate per il path SVG
  // M = Start, L = Line to
  const points = data.map((val, i) => `${i * 20},${60 - val}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      {/* Contenitore Schermo */}
      <div className="w-40 h-28 bg-[#d9d9d9] rounded-[30px] border-[3px] border-[#555] overflow-hidden flex items-center justify-center shadow-inner relative">
        
        {/* Griglia di sfondo (opzionale, per stile industriale) */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-10">
          {[...Array(12)].map((_, i) => <div key={i} className="border border-black"></div>)}
        </div>

        {/* Grafico Lineare */}
        <svg viewBox="0 0 120 60" className="w-full h-full p-2 z-10">
          <polyline
            fill="none"
            stroke="#991b1b" // Rosso scuro come nel mockup
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-500"
          />
        </svg>
      </div>

      {/* Etichetta */}
      <div className="text-black font-bold text-sm mt-1 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
};

export default TempGraph;