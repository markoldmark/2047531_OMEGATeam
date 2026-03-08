const WarningLight = ({ 
  isOn = true,          
  text = "",             
  label = "",            
  activeColor = "bg-amber-400", 
  inactiveColor = "bg-slate-800", 
  shape = "circle",      
  size = "w-7 h-7",    
  isBlinking = false     
}) => {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";
  const currentColor = isOn ? activeColor : inactiveColor;
  const animationClass = (isOn && isBlinking) ? "animate-pulse" : "";
  const glowStyle = isOn ? { boxShadow: '0 0 15px currentColor' } : {};

  return (
    <div className="flex items-center gap-2 mb-2">
      {label && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>}
      
      <div 
        style={glowStyle}
        className={`
          ${size} ${shapeClass} ${currentColor} ${animationClass}
          border border-white/10 flex items-center justify-center 
          font-bold text-sm text-slate-900 transition-colors duration-300
        `}
      >
        {text}
      </div>
    </div>
  );
};

export default WarningLight;