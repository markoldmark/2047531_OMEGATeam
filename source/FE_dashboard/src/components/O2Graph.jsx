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
    <div className="flex flex-col items-center w-full">
      {/* Contenitore principale con dimensioni fisse per stabilizzare i posizionamenti assoluti */}
      <div className="relative w-[180px] h-[100px]">
        
        {/* Sfondo Dark con Griglia (rientrato a sinistra e in basso per gli assi) */}
        <div className="absolute left-8 top-0 right-0 bottom-6 bg-slate-900/60 rounded-tr-xl border border-white/5 shadow-inner z-0 overflow-hidden backdrop-blur-sm">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={`grid-${i}`} className="absolute w-full h-px bg-white/5" style={{ top: `${(i / 10) * 100}%` }}></div>
          ))}
        </div>

        {/* Asse Y Dark */}
        <div className="absolute left-0 top-0 bottom-6 w-8 border-r border-slate-700 z-10">
          {Array.from({ length: 11 }).map((_, i) => {
            const val = 21.0 - i * 0.1;
            const topPercent = (i / 10) * 100;
            // Mostra il testo solo per gli indici pari (0=21.0, 2=20.8, 4=20.6, ecc.)
            const showText = i % 2 === 0; 

            return (
              <div key={`tenth-${i}`} className="absolute right-0 flex items-center justify-end w-full" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                {showText && (
                  <span className="text-[9px] font-semibold mr-1 leading-none tracking-wider text-slate-500">
                    {val.toFixed(1)}
                  </span>
                )}
                {/* Rende la lineetta leggermente più corta se non è accompagnata dal numero, per un look più pulito */}
                <div className={`h-[1px] bg-slate-600 ${showText ? 'w-1.5' : 'w-1'}`}></div>
              </div>
            );
          })}
        </div>

        {/* Tracciato SVG Vincolato strettamente sopra la griglia */}
        <div className="absolute left-8 top-0 right-0 bottom-6 z-20 overflow-hidden">
          {/* preserveAspectRatio="none" fa spalmare la linea esattamente nel box, eliminando l'overflow */}
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            <polyline fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
          </svg>
        </div>
      </div>

      <div className="text-slate-400 font-semibold text-xs mt-1 uppercase tracking-[0.2em] -mt-4">
        {label}
      </div>
    </div>
  );
};

export default O2Graph;