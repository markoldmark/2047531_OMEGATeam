import React from 'react';

const HorizontalBarGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "val", 
  unit = "", 
  fillColor = "bg-green-500",
  emptyColor = "bg-gray-600"
}) => {
  // Evitiamo valori fuori scala
  const clampValue = Math.min(Math.max(value, min), max);
  
  // Calcolo la percentuale per la larghezza del riempimento
  const percentage = ((clampValue - min) / (max - min)) * 100;

  return (
    <div className="w-full flex flex-col mb-2">
      
      {/* Etichetta e Unità di misura posizionate sopra la barra e CENTRATE */}
      <div className="flex items-baseline justify-center gap-2 mb-1">
        <span className="text-xs font-bold text-gray-800 uppercase tracking-widest">{label}</span>
        {unit && <span className="text-[10px] font-bold text-gray-600 uppercase">[{unit}]</span>}
      </div>

      {/* Corpo della Barra Orizzontale */}
      <div className={`w-full h-8 ${emptyColor} rounded-[30px] relative overflow-hidden border-[2px] border-gray-500 shadow-inner`}>
        
        {/* Riempimento dinamico (cresce da sinistra a destra) */}
        <div 
          className={`absolute top-0 left-0 h-full ${fillColor} transition-all duration-500 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>

        {/* Valore testuale centrato */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-[11px] font-black tracking-tighter drop-shadow-md bg-black/30 px-2 py-[2px] rounded">
            {clampValue.toFixed(1)}
          </span>
        </div>
        
      </div>
    </div>
  );
};

export default HorizontalBarGauge;