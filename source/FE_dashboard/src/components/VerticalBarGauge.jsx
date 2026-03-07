import React from 'react';

const VerticalBarGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "val", 
  unit = "", 
  fillColor = "bg-gray-300",
  tickCount = 6 
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = ((clampValue - min) / (max - min)) * 100;
  const ticks = Array.from({ length: tickCount });

  return (
    // Il pb-10 serve a "prenotare" lo spazio in basso per le etichette,
    // garantendo che la barra usi esattamente l'altezza rimanente della card.
    <div className="flex items-stretch h-full pb-10"> 
      
      {/* Tacchette Esterne (si allungano solo quanto la barra) */}
      <div className="flex flex-col justify-between py-2 pr-2 border-r-2 border-gray-500 mr-2 h-full">
        {ticks.map((_, i) => (
          <div key={i} className="w-2 h-[2px] bg-gray-600"></div>
        ))}
      </div>

      {/* Wrapper della Barra: usiamo relative per posizionare le etichette qui sotto */}
      <div className="flex flex-col items-center relative h-full">
        
        {/* Corpo della Barra */}
        <div className="w-10 h-full bg-gray-600 rounded-[30px] relative overflow-hidden border-[2px] border-gray-500 shadow-inner">
          <div 
            className={`absolute bottom-0 w-full ${fillColor} transition-all duration-500 ease-in-out`}
            style={{ height: `${percentage}%` }}
          ></div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[11px] font-black tracking-tighter drop-shadow-md bg-black/30 px-1 rounded">
              {clampValue.toFixed(0)}
            </span>
          </div>
        </div>
        
        {/* Etichette: centrate esclusivamente rispetto alla barra (w-8).
            w-max evita che il testo vada a capo se è più largo della barra. */}
        <div className="absolute top-full mt-2 flex flex-col items-center justify-center w-max">
          <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest text-center">{label}</span>
          {unit && <span className="text-[9px] font-bold text-gray-600 uppercase text-center">[{unit}]</span>}
        </div>
        
      </div>
      
    </div>
  );
};

export default VerticalBarGauge;