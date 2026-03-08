import React from 'react';

const VerticalBarGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "val", 
  unit = "", 
  fillColor = "from-cyan-400 to-blue-500", // Supporto per i gradienti Tailwind
  tickCount = 6 
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = ((clampValue - min) / (max - min)) * 100;
  const ticks = Array.from({ length: tickCount });

  return (
    <div className="flex items-stretch h-full pb-10"> 
      
      {/* Tacchette Esterne Sottili */}
      <div className="flex flex-col justify-between py-2 pr-2 border-r border-slate-700 mr-2 h-full opacity-70">
        {ticks.map((_, i) => (
          <div key={i} className="w-1.5 h-[1px] bg-slate-500"></div>
        ))}
      </div>

      <div className="flex flex-col items-center relative h-full">
        
        {/* Corpo della Barra Glassmorphism */}
        <div className="w-8 h-full bg-slate-800/50 rounded-full relative overflow-hidden border border-white/5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <div 
            className={`absolute bottom-0 w-full bg-gradient-to-t ${fillColor} transition-all duration-700 ease-out shadow-[0_-5px_15px_rgba(255,255,255,0.1)]`}
            style={{ height: `${percentage}%` }}
          ></div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[10px] font-bold tracking-wider bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
              {clampValue.toFixed(0)}
            </span>
          </div>
        </div>
        
        {/* Etichette posizionate sotto */}
        <div className="absolute top-full mt-3 flex flex-col items-center justify-center w-max">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">{label}</span>
          {unit && <span className="text-[9px] text-slate-500 uppercase text-center opacity-80">[{unit}]</span>}
        </div>
        
      </div>
    </div>
  );
};

export default VerticalBarGauge;