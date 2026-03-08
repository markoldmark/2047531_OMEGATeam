import React, { useState, useEffect, useRef } from 'react';

const O2Graph = ({ data = [], label = "o2 %", maxPoints = 100 }) => {
  const minY = 20;
  const maxY = 21;
  const width = 120;
  const height = 60;

  const [plotData, setPlotData] = useState([]);
  const latestValueRef = useRef(20.5);
  const smoothedValueRef = useRef(20.5);

  useEffect(() => {
    if (data && data.length > 0) latestValueRef.current = data[data.length - 1];
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      smoothedValueRef.current += (latestValueRef.current - smoothedValueRef.current) * 0.15;
      setPlotData(prev => {
        const newData = [...prev, smoothedValueRef.current];
        return newData.length > maxPoints ? newData.slice(-maxPoints) : newData;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [maxPoints]);

  const points = plotData.map((val, i) => {
    const x = (i / (maxPoints - 1)) * width;
    const numericVal = Number(val) || 20.5;
    const clampedVal = Math.max(minY, Math.min(maxY, numericVal));
    const y = height - ((clampedVal - minY) / (maxY - minY)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <div className="w-80 h-48 flex items-center justify-center relative pl-12 pb-8">
        
        {/* Sfondo Dark con Griglia */}
        <div className="absolute left-12 top-0 right-0 bottom-8 bg-slate-900/60 rounded-tr-xl border border-white/5 shadow-inner z-0 overflow-hidden backdrop-blur-sm">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={`grid-${i}`} className="absolute w-full h-px bg-white/5" style={{ top: `${(i / 10) * 100}%` }}></div>
          ))}
        </div>

        {/* Asse Y Dark */}
        <div className="absolute left-0 top-0 bottom-8 w-12 border-r border-slate-700 z-10">
          {Array.from({ length: 11 }).map((_, i) => {
            const val = 21.0 - i * 0.1;
            const topPercent = (i / 10) * 100;
            return (
              <div key={`tenth-${i}`} className="absolute right-0 flex items-center justify-end w-full" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                <span className={`text-[10px] font-semibold mr-1.5 leading-none tracking-wider ${val === 20.5 ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.8)]' : 'text-slate-500'}`}>
                  {val.toFixed(1)}
                </span>
                <div className="w-1.5 h-[1px] bg-slate-600"></div>
              </div>
            );
          })}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`hundredth-${i}`} className="absolute right-0 flex items-center" style={{ top: `${((i + 0.5) / 10) * 100}%`, transform: 'translateY(-50%)' }}>
              <div className="w-1 h-[1px] bg-rose-500/50"></div>
            </div>
          ))}
        </div>

        {/* Asse X Dark */}
        <div className="absolute left-12 right-0 bottom-0 h-8 border-t border-slate-700 flex justify-between items-start pt-2 z-10">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">-10s</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">0s</span>
        </div>

        {/* Tracciato SVG Neon Cyan */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible z-20 relative drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
          <polyline fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
      </div>

      <div className="text-slate-400 font-semibold text-xs mt-3 uppercase tracking-[0.2em]">
        {label}
      </div>
    </div>
  );
};

export default O2Graph;