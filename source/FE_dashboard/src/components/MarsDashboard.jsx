import React, { useState, useEffect } from 'react';
import OdometerGauge from './OdometerGauge';
import VerticalBarGauge from './VerticalBarGauge';
import HorizontalBarGauge from './HorizontalBarGauge';
import WarningLight from './WarningLight';
import PressureDisplay from './PressureDisplay';
import TempGraph from './TempGraph';

import { useMarsData } from '../services/useMarsData';

const MarsDashboard = () => {
  const [isAuto, setIsAuto] = useState(true);

  const [actuators, setActuators] = useState({
    coolingFan: false,
    habitatHeater: false,
    entranceHumidifier: false,
    hallVentilation: false,
  });

  // MAGIA: Tutta la logica complessa si riduce a questa singola riga!
  const sensorData = useMarsData();

  const toggleActuator = (name) => {
    if (!isAuto) {
      setActuators((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-8 font-sans">
      <div className="bg-[#d1d5db] w-full max-w-6xl rounded-[40px] p-6 shadow-2xl border-4 border-gray-400 flex flex-col gap-6">
        
        <div className="relative grid grid-cols-2 grid-rows-2 gap-6 h-[600px]">
          
          {/* 1. GREENHOUSE (Titolo in alto) */}
          {/* 1. GREENHOUSE */}
          <div className="bg-green-200 rounded-[30px] border-[3px] border-gray-500 p-4 flex flex-col shadow-inner relative">
            <div className="text-center text-black font-bold text-xl tracking-widest uppercase opacity-70 mb-4">greenhouse</div>
            
            <div className="flex justify-between items-stretch flex-grow gap-6">
              
              <div className="flex gap-6 h-full">
                <VerticalBarGauge 
                  value={28} 
                  min={20} 
                  max={40} 
                  label="temp" 
                  unit="°C" 
                  fillColor="bg-red-500" 
                  tickCount={8} 
                />
                <VerticalBarGauge 
                  value={75} 
                  min={0} 
                  max={100} 
                  label="wlev" 
                  unit="%" 
                  fillColor="bg-blue-500" 
                  tickCount={5}
                />
              </div>

              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-between gap-2 w-full">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-widest mt-auto ml-2">PH</span>
                  <WarningLight isOn={true} text="!" activeColor="bg-yellow-400"/>
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full">
                  <HorizontalBarGauge 
                    value={6.5} // Valore di esempio
                    min={0} 
                    max={14}
                    tickCount={7}
                    label=""
                    fillColor="bg-green-500" 
                    emptyColor="bg-green-200" // Ho tenuto lo sfondo verde chiaro del tuo design originale
                  />
                </div>
              </div>

            </div>
          </div>
         {/* 2. HABITAT */}
          <div className="bg-[#fef3c7] rounded-[40px] border-[3px] border-[#333] p-6 flex flex-col shadow-2xl relative min-w-[500px]">
            {/* Titolo Habitat */}
            <div className="text-left text-[#4b5563] font-bold text-2xl tracking-widest uppercase mb-2 ml-4">habitat</div>
            
            <div className="flex flex-row justify-between items-start gap-4">
              
              {/* Colonna Sinistra: CO2 Gauge */}
              <div className="flex flex-col items-center mt-4">
                <div className="text-black font-bold text-lg mb-[-10px]">CO2</div>
                <OdometerGauge 
                  value={sensorData.co2 || 900} 
                  min={550} 
                  max={1000} 
                  label="" 
                  needleColor="bg-red-600" 
                />
              </div>

              {/* Colonna Centrale: Temp Graph e Pressure Display */}
              <div className="flex flex-col gap-4 scale-75 mt-[-40px] items-center">
                <div className="flex flex-col items-center">
                  <TempGraph  data={sensorData.tempHistory || [45, 30, 40, 25, 50, 35, 45]}  label="temp" />
                  </div>

                <div className="flex flex-col items-center">
                  <PressureDisplay value={sensorData.pressure || 95} label="" />
                  <div className="text-black font-bold text-sm mt-1 uppercase tracking-tighter">press</div>
                </div>
              </div>

              {/* Colonna Destra: PM25 e HUM usando VerticalBarGauge */}
              <div className="flex gap-6 h-[70%] mt-2">
                <VerticalBarGauge 
                  value={sensorData.pm25 || 25} 
                  min={0} 
                  max={50} 
                  label="pm25" 
                  unit="" 
                  fillColor="bg-red-600" 
                  tickCount={5} 
                />
                <VerticalBarGauge 
                  value={sensorData.humidity || 45} 
                  min={0} 
                  max={100} 
                  label="hum" 
                  unit="%" 
                  fillColor="bg-white" 
                  tickCount={5}
                />
              </div>

            </div>
          </div>
          {/* 3. AIRLOCK (Titolo in basso) */}
          <div className="bg-cyan-200 rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col shadow-inner">
             <div className="flex justify-between w-[40%]">
                <div className="text-center w-full">
                  <OdometerGauge value={sensorData.radiation} min={0} max={10} label="radiation" needleColor="bg-blue-600" />
                </div>
             </div>
              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-between gap-2 w-full">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-widest mt-auto ml-2">PH</span>
                  <WarningLight isOn={true} text="!" activeColor="bg-yellow-400"/>
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full">
                    <HorizontalBarGauge 
                      value={12} // Valore di esempio
                      min={0} 
                      max={50} 
                      label="cycles" 
                      fillColor="bg-blue-600" 
                      emptyColor="bg-blue-200"
                    />
                  </div>
                </div>
             {/* Titolo ancorato in basso */}
             <div className="text-center text-black font-bold text-xl tracking-widest uppercase opacity-70">airlock</div>
          </div>

          {/* 4. POWER (Titolo in basso) */}
          <div className="bg-red-200 rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col shadow-inner">
             {/* Spazio flessibile per raggruppare i contenuti in alto */}
             <div className="flex flex-col flex-grow">
               <div className="flex justify-between items-start w-full">
                  <div className="text-center ml-8">
                    <OdometerGauge value={sensorData.power} min={0} max={100} label="power %" needleColor="bg-orange-500" />
                  </div>
                  <div className="flex justify-end gap-4">
                    <div className="flex gap-4">
                      <div className="w-1 h-32 border-l-4 border-dotted border-gray-600"></div>
                      <div className="w-1 h-32 border-l-4 border-dotted border-gray-600"></div>
                    </div>
                    <div className="flex items-end gap-2 ml-8">
                      <div className="w-10 h-20 bg-gray-200 border-2 border-gray-500"></div>
                      <div className="w-10 h-20 bg-gray-200 border-2 border-gray-500"></div>
                    </div>
                  </div>
               </div>
             </div>
             {/* Titolo ancorato in basso (stesso margine di airlock) */}
             <div className="text-center text-black font-bold text-xl tracking-widest uppercase opacity-70 mt-auto">power</div>
          </div>

          {/* CENTER ACTUATORS */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#d1d5db] p-3 rounded-[30px] border-[3px] border-gray-500">
            <div className="grid grid-cols-2 gap-2 w-[300px] h-[200px]">
              <button onClick={() => toggleActuator('coolingFan')} className={`rounded-2xl border-4 ${actuators.coolingFan ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`} disabled={isAuto}>
                <span className="text-white font-black text-center text-lg leading-tight">COOLING<br/>FAN</span>
              </button>
              <button onClick={() => toggleActuator('habitatHeater')} className={`rounded-2xl border-4 ${actuators.habitatHeater ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`} disabled={isAuto}>
                <span className="text-white font-black text-center text-lg leading-tight">HABITAT<br/>HEATER</span>
              </button>
              <button onClick={() => toggleActuator('entranceHumidifier')} className={`rounded-2xl border-4 ${actuators.entranceHumidifier ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`} disabled={isAuto}>
                <span className="text-white font-black text-center text-lg leading-tight">ENTRANCE<br/>HUMIDIFIER</span>
              </button>
              <button onClick={() => toggleActuator('hallVentilation')} className={`rounded-2xl border-4 ${actuators.hallVentilation ? 'bg-red-500 border-red-300' : 'bg-[#c82020] border-[#8a1313]'} flex items-center justify-center p-2 shadow-lg transition-colors`} disabled={isAuto}>
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
            
            <div className="w-24 h-12 bg-black rounded-full p-1 cursor-pointer relative shadow-inner" onClick={() => setIsAuto(!isAuto)}>
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