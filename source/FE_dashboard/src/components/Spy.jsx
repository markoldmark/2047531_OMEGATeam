// Spy.jsx
import React from 'react';

const Spy = ({ label, isOn = false }) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 font-bold text-xs w-4 text-center font-mono">{label}</span>
      <div className={`w-8 h-8 rounded-full border transition-all duration-300
        ${isOn 
          ? 'bg-violet-500 border-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.8)]' 
          : 'bg-slate-800 opacity-50 border-white/10'}`}>
      </div>
    </div>
  );
};
export default Spy;