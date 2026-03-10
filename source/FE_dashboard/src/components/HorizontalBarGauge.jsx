import React from 'react';

const HorizontalBarGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "val", 
  unit = "", 
  fillColor = "from-emerald-400 to-teal-500",
  emptyColor = "bg-slate-800/50",
  tickCount = 10
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = ((clampValue - min) / (max - min)) * 100;
  const ticks = Array.from({ length: tickCount });

  return (
    <div className="w-full flex flex-col mb-4">
      <div className="flex items-baseline justify-center gap-2 mb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        {unit && <span className="text-[10px] font-medium text-slate-500 uppercase">{unit}</span>}
      </div>

      <div className="flex flex-col w-full">
        <div className={`w-full h-8 ${emptyColor} rounded-full relative overflow-hidden border border-white/5 shadow-inner z-10 backdrop-blur-sm`}>
          <div 
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${fillColor} transition-all duration-700 ease-out shadow-[5px_0_15px_rgba(255,255,255,0.1)]`}
            style={{ width: `${percentage}%` }}
          ></div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[11px] font-bold tracking-wider bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
              {clampValue.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="flex flex-row justify-between px-4 pt-1 border-t border-slate-700 mt-2 mx-2 opacity-70">
          {ticks.map((_, i) => (
            <div key={i} className="w-[1px] h-2 bg-slate-500"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalBarGauge;