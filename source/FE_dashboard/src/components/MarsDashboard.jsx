import React, { useState } from 'react';

const MarsDashboard = () => {
  // Stato per l'interruttore Manuale/Automatico (User Story 20)
  const [isAuto, setIsAuto] = useState(true);

  // Stato per gli attuatori
  const [actuators, setActuators] = useState({
    coolingFan: false,
    habitatHeater: false,
    entranceHumidifier: false,
    hallVentilation: false,
  });

  const toggleActuator = (name) => {
    if (!isAuto) {
      setActuators((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-8 font-sans">
      {/* Main Container */}
      <div className="bg-[#d1d5db] w-full max-w-6xl rounded-[40px] p-6 shadow-2xl border-4 border-gray-400 flex flex-col gap-6">
        
        {/* 4 Quadrants Grid + Absolute Center */}
        <div className="relative grid grid-cols-2 grid-rows-2 gap-6 h-[600px]">
          
          {/* 1. GREENHOUSE (Top Left) */}
          <div className="bg-[#9ca3af] rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col justify-between shadow-inner">
            <div className="text-right text-white font-bold text-xl tracking-widest uppercase opacity-70">greenhouse</div>
            <div className="flex justify-between items-end h-full mt-4">
              {/* Temp & Wlev bars mockup */}
              <div className="flex gap-8">
                <div className="w-4 h-32 bg-gray-600 rounded-t relative">
                  <div className="absolute bottom-0 w-full h-1/2 bg-gray-300"></div>
                  <div className="text-xs absolute -bottom-6 left-1/2 -translate-x-1/2 font-bold text-gray-700">temp</div>
                </div>
                <div className="w-4 h-32 bg-gray-600 rounded-t relative">
                  <div className="absolute bottom-0 w-full h-1/4 bg-gray-300"></div>
                  <div className="text-xs absolute -bottom-6 left-1/2 -translate-x-1/2 font-bold text-gray-700">wlev</div>
                </div>
              </div>
              {/* pH and Warnings */}
              <div className="flex flex-col items-end gap-4 w-1/2">
                <div className="w-full">
                  <div className="text-xs font-bold text-gray-700 mb-1">ph</div>
                  <div className="w-full h-8 bg-green-200 border-4 border-black rounded-full overflow-hidden relative">
                    <div className="w-[80%] h-full bg-green-500"></div>
                    <div className="absolute top-0 right-[20%] w-1 h-full bg-black"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-10 h-10 bg-yellow-400 border-4 border-black rounded-full flex items-center justify-center font-bold">1</div>
                  <div className="w-12 h-10 bg-yellow-400 border-4 border-black rounded-lg flex items-center justify-center font-bold text-xl">!</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. HABITAT (Top Right) */}
          <div className="bg-[#9ca3af] rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col justify-between shadow-inner">
            <div className="text-left text-white font-bold text-xl tracking-widest uppercase opacity-70">habitat</div>
            <div className="flex justify-between items-start mt-4">
               {/* CO2 Gauge Mockup */}
               <div className="w-24 h-24 border-t-4 border-gray-600 rounded-full relative overflow-hidden">
                 <div className="absolute bottom-0 left-1/2 w-1 h-12 bg-red-600 origin-bottom transform rotate-45"></div>
               </div>
               {/* Chart Mockup */}
               <div className="w-32 h-20 bg-gray-200 border-4 border-gray-500 rounded-xl">
                  {/* Fake SVG Line */}
                  <svg viewBox="0 0 100 50" className="w-full h-full stroke-red-600 stroke-[3] fill-transparent">
                    <path d="M0,40 Q20,10 40,30 T80,10 L100,20" />
                  </svg>
               </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="w-20 h-16 bg-gray-200 border-4 border-gray-500 rounded-xl flex items-center justify-center text-2xl font-black text-gray-700">95</div>
              {/* Hum/PM25 bars */}
              <div className="flex gap-6">
                <div className="w-8 h-24 bg-gray-300 border-2 border-gray-500"></div>
                <div className="w-8 h-24 bg-gray-300 border-2 border-gray-500"></div>
              </div>
            </div>
          </div>

          {/* 3. AIRLOCK (Bottom Left) */}
          <div className="bg-[#9ca3af] rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col justify-between shadow-inner">
             <div className="flex justify-between w-[40%]">
                <div className="text-center w-full">
                  <div className="text-xs font-bold text-gray-700 mb-2">radiation</div>
                  <div className="w-24 h-12 border-t-4 border-gray-600 rounded-t-full relative mx-auto">
                    <div className="absolute bottom-0 left-1/2 w-1 h-10 bg-blue-600 origin-bottom transform -rotate-12 -translate-x-1/2"></div>
                  </div>
                </div>
             </div>
             <div className="flex items-end justify-between w-full">
                <div className="w-2/3">
                  <div className="flex gap-2 mb-2 ml-16">
                    <div className="w-10 h-10 bg-yellow-400 border-4 border-black rounded-full flex items-center justify-center font-bold">2</div>
                    <div className="w-12 h-10 bg-yellow-400 border-4 border-black rounded-lg flex items-center justify-center font-bold text-xl">!</div>
                  </div>
                  <div className="text-xs font-bold text-gray-700 mb-1">cycles</div>
                  <div className="w-full h-10 bg-blue-200 border-4 border-black rounded-full overflow-hidden">
                    <div className="w-[60%] h-full bg-blue-600"></div>
                  </div>
                </div>
                {/* D P I Lights */}
                <div className="flex flex-col gap-2 items-center mr-8">
                  <div className="flex items-center gap-2"><span className="text-xs font-bold">D</span><div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-black"></div></div>
                  <div className="flex items-center gap-2"><span className="text-xs font-bold">P</span><div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-black"></div></div>
                  <div className="flex items-center gap-2"><span className="text-xs font-bold">I</span><div className="w-6 h-6 rounded-full bg-purple-800 border-2 border-black"></div></div>
                </div>
             </div>
             <div className="text-right text-white font-bold text-xl tracking-widest uppercase opacity-70 mt-2">airlock</div>
          </div>

          {/* 4. POWER (Bottom Right) */}
          <div className="bg-[#9ca3af] rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col justify-between shadow-inner">
             <div className="flex justify-end gap-4">
                {/* Fake dashed bars */}
                <div className="flex gap-4">
                  <div className="w-1 h-32 border-l-4 border-dotted border-gray-600"></div>
                  <div className="w-1 h-32 border-l-4 border-dotted border-gray-600"></div>
                </div>
                <div className="flex items-end gap-2 ml-8">
                  <div className="w-10 h-20 bg-gray-200 border-2 border-gray-500"></div>
                  <div className="w-10 h-20 bg-gray-200 border-2 border-gray-500"></div>
                </div>
             </div>
             <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="w-24 h-12 border-t-4 border-gray-600 rounded-t-full relative mx-auto mb-2">
                    <div className="absolute bottom-0 left-1/2 w-2 h-10 bg-orange-500 origin-bottom transform translate-x-1/2 rotate-12"></div>
                  </div>
                </div>
             </div>
             <div className="text-left text-white font-bold text-xl tracking-widest uppercase opacity-70">power</div>
          </div>

          {/* CENTER ACTUATORS (Absolute positioned in the middle of the grid) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#d1d5db] p-3 rounded-[30px]">
            <div className="grid grid-cols-2 gap-2 w-[300px] h-[200px]">
              <button 
                onClick={() => toggleActuator('coolingFan')}
                className={`rounded-2xl border-4 ${actuators.coolingFan ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`}
                disabled={isAuto}
              >
                <span className="text-white font-black text-center text-lg leading-tight">COOLING<br/>FAN</span>
              </button>
              <button 
                onClick={() => toggleActuator('habitatHeater')}
                className={`rounded-2xl border-4 ${actuators.habitatHeater ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`}
                disabled={isAuto}
              >
                <span className="text-white font-black text-center text-lg leading-tight">HABITAT<br/>HEATER</span>
              </button>
              <button 
                onClick={() => toggleActuator('entranceHumidifier')}
                className={`rounded-2xl border-4 ${actuators.entranceHumidifier ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`}
                disabled={isAuto}
              >
                <span className="text-white font-black text-center text-lg leading-tight">ENTRANCE<br/>HUMIDIFIER</span>
              </button>
              <button 
                onClick={() => toggleActuator('hallVentilation')}
                className={`rounded-2xl border-4 ${actuators.hallVentilation ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`}
                disabled={isAuto}
              >
                <span className="text-white font-black text-center text-lg leading-tight">HALL<br/>VENTILATION</span>
              </button>
            </div>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="flex justify-between items-center gap-4 h-20">
          <div className="bg-[#4b5563] h-full rounded-2xl px-8 flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-2xl tracking-widest">H: 1-2-1</span>
          </div>
          
          <div className="bg-[#4b5563] h-full flex-grow rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-white font-black text-3xl tracking-widest uppercase">Dashboard</span>
          </div>

          <div className="bg-[#4b5563] h-full rounded-2xl px-6 flex items-center justify-center shadow-inner gap-4">
            <span className={`font-bold text-2xl ${!isAuto ? 'text-white' : 'text-gray-400'}`}>M</span>
            
            {/* Custom Toggle Switch for User Story 20 */}
            <div 
              className="w-24 h-12 bg-black rounded-full p-1 cursor-pointer relative shadow-inner"
              onClick={() => setIsAuto(!isAuto)}
            >
              <div className={`w-10 h-10 bg-red-600 rounded-full shadow-md transition-transform duration-300 ease-in-out absolute top-1 ${isAuto ? 'translate-x-12' : 'translate-x-0'}`}></div>
            </div>

            <span className={`font-bold text-2xl ${isAuto ? 'text-white' : 'text-gray-400'}`}>A</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MarsDashboard;