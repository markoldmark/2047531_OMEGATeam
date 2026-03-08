const OdometerGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "", 
  needleColor = "bg-rose-500",
  ticks = [],
  scale = 1
}) => {
  const clampValue = Math.min(Math.max(value, min), max);
  const percentage = (clampValue - min) / (max - min);
  const rotation = (percentage * 180) - 90;

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">{label}</div>}
      
      <div 
        className="flex flex-col items-center" 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'top center',
          marginBottom: `${(scale - 1) * 15}px` 
        }}
      >
        <div className="w-24 h-12 bg-slate-950 rounded-t-full relative overflow-hidden border border-b-0 border-white/20 shadow-[inset_0_4px_20px_rgba(0,0,0,1)] backdrop-blur-md">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.6)_50%)] bg-[length:100%_2px] pointer-events-none z-0"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-40"></div>
          <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-white/5 -skew-x-12 transform pointer-events-none z-40"></div>
          {ticks.map((tick, i) => {
            const tickPerc = (tick - min) / (max - min);
            const tickRot = (tickPerc * 180) - 90;
            return (
              <div 
                key={i}
                className="absolute bottom-0 left-1/2 w-[1px] h-full origin-bottom z-10"
                style={{ transform: `translateX(-50%) rotate(${tickRot}deg)` }}
              >
                <div className="w-full h-1.5 bg-slate-400 shadow-[0_0_2px_rgba(255,255,255,0.2)]"></div>
              </div>
            );
          })}

          <div 
            className={`absolute bottom-0 left-1/2 w-1 h-10 ${needleColor} origin-bottom transition-transform duration-700 ease-out shadow-[0_0_8px_currentColor] z-20`}
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          ></div>

          <div className="absolute bottom-0 left-1/2 w-5 h-5 bg-black border-2 border-slate-700 rounded-full transform -translate-x-1/2 translate-y-1/2 z-30 shadow-[0_-2px_8px_rgba(0,0,0,1)]"></div>
        </div>

        <div className="mt-1 relative overflow-hidden bg-slate-950 rounded-lg border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,1)] flex items-center justify-center px-4 py-1.5 backdrop-blur-md">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.6)_50%)] bg-[length:100%_2px] pointer-events-none z-0"></div>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 -skew-y-12 transform -translate-y-2 pointer-events-none z-20"></div>
          
          <span className="text-sm font-bold text-white tracking-widest z-10 relative drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            {clampValue.toFixed(max <= 1 ? 2 : 1)}
          </span>
        </div>

      </div>
    </div>
  );
};

export default OdometerGauge;