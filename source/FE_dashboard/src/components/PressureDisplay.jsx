import React from 'react';

const PressureDisplay = ({ value = 0, label = "press" }) => {
  return (
    <div className="flex flex-col items-center scale-75">
      <div className="w-40 h-16 bg-slate-900/80 rounded-2xl border -mt-8 scale-75 border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden backdrop-blur-md">
        
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 -skew-y-12 transform -translate-y-4"></div>

        <span className="text-3xl font-black text-cyan-400 tracking-widest z-10 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
          {Math.round(value)}
        </span>
      </div>

      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest -mt-1">
        {label}
      </div>
    </div>
  );
};

export default PressureDisplay;