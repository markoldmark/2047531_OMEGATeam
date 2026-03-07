import React, { useState, useEffect, useRef } from 'react';

const O2Graph = ({ data = [], label = "o2 %", maxPoints = 100 }) => {
  // Range asse Y impostato: min 20, max 21
  const minY = 20;
  const maxY = 21;
  const width = 120;
  const height = 60;

  const [plotData, setPlotData] = useState([]);
  
  const latestValueRef = useRef(20.5);
  const smoothedValueRef = useRef(20.5);

  useEffect(() => {
    if (data && data.length > 0) {
      latestValueRef.current = data[data.length - 1];
    }
  }, [data]);

  // Il motore a 10Hz per l'interpolazione fluida
  useEffect(() => {
    const interval = setInterval(() => {
      smoothedValueRef.current += (latestValueRef.current - smoothedValueRef.current) * 0.15;

      setPlotData(prev => {
        const newData = [...prev, smoothedValueRef.current];
        if (newData.length > maxPoints) {
          return newData.slice(-maxPoints);
        }
        return newData;
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
        
        {/* Sfondo grigiolino con sottili linee di griglia per i decimi */}
        <div className="absolute left-12 top-0 right-0 bottom-8 bg-gray-200 rounded-tr-lg shadow-inner z-0 overflow-hidden">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={`grid-${i}`} className="absolute w-full h-px bg-gray-300" style={{ top: `${(i / 10) * 100}%` }}></div>
          ))}
        </div>

        {/* Asse Y Generato Dinamicamente */}
        <div className="absolute left-0 top-0 bottom-8 w-12 border-r-2 border-[#555] z-10">
          
          {/* Tacche dei Decimi (20.0, 20.1, ... 21.0) */}
          {Array.from({ length: 11 }).map((_, i) => {
            const val = 21.0 - i * 0.1;
            const topPercent = (i / 10) * 100; // Posizione esatta in percentuale
            return (
              <div key={`tenth-${i}`} className="absolute right-0 flex items-center justify-end w-full" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                <span className={`text-[10px] font-bold mr-1 leading-none ${val === 20.5 ? 'text-red-600' : 'text-gray-700'}`}>
                  {val.toFixed(1)}
                </span>
                <div className="w-2 h-[2px] bg-[#555]"></div>
              </div>
            );
          })}

          {/* Tacche dei 5 Centesimi (20.05, 20.15, ... 20.95) - ROSSE */}
          {Array.from({ length: 10 }).map((_, i) => {
            const topPercent = ((i + 0.5) / 10) * 100; // A metà strada tra ogni decimo
            return (
              <div key={`hundredth-${i}`} className="absolute right-0 flex items-center" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                {/* Solo la lineetta rossa, senza numero per non sovrapporre i testi */}
                <div className="w-1.5 h-[2px] bg-red-500"></div>
              </div>
            );
          })}

        </div>

        {/* Asse X (Temporale) */}
        <div className="absolute left-12 right-0 bottom-0 h-8 border-t-2 border-[#555] flex justify-between items-start pt-2 z-10">
          <span className="text-xs font-bold text-gray-700 leading-none">-10s</span>
          <span className="text-xs font-bold text-gray-700 leading-none">0s</span>
        </div>

        {/* Grafico SVG */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible z-20 relative">
          <polyline
            fill="none"
            stroke="#1d4ed8" // Linea blu dell'Ossigeno
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      {/* Etichetta */}
      <div className="text-black font-bold text-base mt-2 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
};

export default O2Graph;