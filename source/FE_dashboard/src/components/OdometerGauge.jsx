import React from 'react';

const OdometerGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "", 
  needleColor = "bg-red-600" 
}) => {
  // Evitiamo che la lancetta "esca" dal tachimetro se i dati sballano
  const clampValue = Math.min(Math.max(value, min), max);
  
  // Calcolo la percentuale (da 0 a 1)
  const percentage = (clampValue - min) / (max - min);
  
  // Mappo la percentuale da 0 a 1 in un angolo da -90 a 90 gradi
  const rotation = (percentage * 180) - 90;

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-xs font-bold text-gray-700 mb-2 uppercase">{label}</div>}
      
      {/* Semicerchio del tachimetro */}
      <div className="w-24 h-12 bg-gray-300 rounded-t-full relative overflow-hidden border-4 border-b-0 border-gray-600 shadow-inner">
        
        {/* Lancetta */}
        <div 
          className={`absolute bottom-0 left-1/2 w-1 h-10 ${needleColor} origin-bottom transition-transform duration-500 ease-out`}
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        ></div>
        
        {/* Perno centrale */}
        <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-gray-800 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      {/* Valore numerico testuale */}
      <div className="mt-2 text-sm font-bold text-gray-800 bg-gray-300 px-2 rounded border border-gray-400">
        {clampValue.toFixed(1)}
      </div>
    </div>
  );
};

export default OdometerGauge;