import React from 'react';

const HorizontalBarGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "val", 
  unit = "", 
  fillColor = "bg-green-500",
  emptyColor = "bg-gray-600",
  tickCount = 10 // Numero di tacchette di default per l'orizzontale
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = ((clampValue - min) / (max - min)) * 100;
  
  // Array per renderizzare le tacchette
  const ticks = Array.from({ length: tickCount });

  return (
    <div className="w-full flex flex-col mb-4">
      
      {/* Etichetta e Unità di misura CENTRATE */}
      <div className="flex items-baseline justify-center gap-2 mb-1">
        <span className="text-xs font-bold text-gray-800 uppercase tracking-widest">{label}</span>
        {unit && <span className="text-[10px] font-bold text-gray-600 uppercase">[{unit}]</span>}
      </div>

      <div className="flex flex-col w-full">
        {/* Corpo della Barra Orizzontale */}
        <div className={`w-full h-8 ${emptyColor} rounded-[30px] relative overflow-hidden border-[2px] border-gray-500 shadow-inner z-10`}>
          <div 
            className={`absolute top-0 left-0 h-full ${fillColor} transition-all duration-500 ease-in-out`}
            style={{ width: `${percentage}%` }}
          ></div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[11px] font-black tracking-tighter drop-shadow-md bg-black/30 px-2 py-[2px] rounded">
              {clampValue.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Tacchette Esterne (posizionate sotto la barra) */}
        {/* px-4 serve a far partire le tacchette dove finisce la curva del bordo arrotondato */}
        <div className="flex flex-row justify-between px-4 pt-1 border-t-2 border-gray-500 mt-1 mx-2">
          {ticks.map((_, i) => (
            <div key={i} className="w-[2px] h-2 bg-gray-600"></div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default HorizontalBarGauge;