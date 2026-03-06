import React from 'react';

const WarningLight = ({ 
  isOn = true,          // Stato della spia (accesa/spenta)
  text = "",             // Testo all'interno (es. "1", "!")
  label = "",            // Testo all'esterno (es. "D", "P", "I")
  activeColor = "bg-red-600", 
  inactiveColor = "bg-gray-700", // Colore di quando è spenta
  shape = "circle",      // "circle" per tonda, "rounded" per rettangolare
  size = "w-8 h-8",    // Dimensioni personalizzabili
  isBlinking = false     // Attiva il lampeggio se isOn è true
}) => {
  // Calcoliamo le classi dinamiche
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";
  const currentColor = isOn ? activeColor : inactiveColor;
  
  // Aggiungiamo il lampeggio (pulse) e un bagliore se è accesa
  const animationClass = (isOn && isBlinking) ? "animate-pulse" : "";
  const glowClass = isOn ? "shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "shadow-inner";

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Etichetta esterna (se presente) */}
      {label && <span className="text-xs font-bold text-gray-800">{label}</span>}
      
      {/* Corpo della Spia */}
      <div 
        className={`
          ${size} ${shapeClass} ${currentColor} ${animationClass} ${glowClass}
          border-2 border-gray-500 flex items-center justify-center 
          font-bold text-xl text-black transition-colors duration-300
        `}
      >
        {text}
      </div>
    </div>
  );
};

export default WarningLight;