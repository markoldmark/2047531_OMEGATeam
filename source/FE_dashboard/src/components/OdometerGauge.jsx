import React from 'react';

const OdometerGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "", 
  needleColor = "bg-rose-500" 
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = (clampValue - min) / (max - min);
  const rotation = (percentage * 180) - 90;

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">{label}</div>}
      
      <div className="w-24 h-12 bg-slate-800/80 rounded-t-full relative overflow-hidden border border-b-0 border-white/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        
        {/* Lancetta Neon */}
        <div 
          className={`absolute bottom-0 left-1/2 w-1 h-10 ${needleColor} origin-bottom transition-transform duration-700 ease-out shadow-[0_0_8px_currentColor]`}
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        ></div>
        
        <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-slate-900 border border-slate-600 rounded-full transform -translate-x-1/2 translate-y-1/2 z-10"></div>
      </div>
      
      <div className="mt-3 text-xs font-bold text-cyan-50 bg-slate-900/80 px-3 py-1 rounded-md border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.3)] tracking-wider">
        {clampValue.toFixed(1)}
      </div>
    </div>
  );
};

export default OdometerGauge;