import React from 'react';

const Spy = ({ label, isOn = false }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Label (D, P, I) */}
      <span className="text-gray-800 font-black text-sm w-3 text-right">{label}</span>
      
      {/* Cerchio della spia */}
      <div className={`w-6 h-6 rounded-full border-2 border-black shadow-md transition-all duration-300
        ${isOn 
          ? 'bg-[#7c3aed] shadow-[0_0_12px_rgba(124,58,237,0.8)] border-purple-400' 
          : 'bg-[#4c1d95] opacity-40 border-black'}`}>
      </div>
    </div>
  );
};

// QUESTA RIGA È FONDAMENTALE:
export default Spy;