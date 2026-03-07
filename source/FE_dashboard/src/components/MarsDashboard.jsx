import React, { useState } from 'react';
import OdometerGauge from './OdometerGauge';
import VerticalBarGauge from './VerticalBarGauge';
import HorizontalBarGauge from './HorizontalBarGauge';
import WarningLight from './WarningLight';
import PressureDisplay from './PressureDisplay';
import TempGraph from './TempGraph';
import Spy from './Spy';

import { useMarsData } from '../services/useMarsData';

const ALERT_TARGETS = {
  greenhousePh: 'greenhouse_ph_warning',
  airlockCycles: 'airlock_cycles_warning',
};

const getRuleObservedValue = (rule, sensorData) => {
  if (rule.source_name === 'hydroponic_ph' && rule.metric_key === 'ph') {
    return sensorData.ph;
  }

  if (rule.source_name === 'mars/telemetry/airlock' && rule.metric_key === 'cycles_per_hour') {
    return sensorData.airlock_cycles;
  }

  return null;
};

const evaluateRule = (value, operator, threshold) => {
  const numericValue = Number(value);
  const numericThreshold = Number(threshold);

  if (!Number.isNaN(numericValue) && !Number.isNaN(numericThreshold)) {
    if (operator === '>') return numericValue > numericThreshold;
    if (operator === '>=') return numericValue >= numericThreshold;
    if (operator === '<') return numericValue < numericThreshold;
    if (operator === '<=') return numericValue <= numericThreshold;
    if (operator === '=') return numericValue === numericThreshold;
  }

  if (operator === '=') {
    return String(value) === String(threshold);
  }

  return false;
};

const MarsDashboard = () => {
  const [isAuto, setIsAuto] = useState(true);
  const [manualError, setManualError] = useState('');

  const { sensorData, rules, history, actuators, sendActuatorCommand } = useMarsData();

  const activeAlerts = rules
    .filter((rule) => rule.action_type === 'UI_ALERT' && rule.is_active)
    .reduce((acc, rule) => {
      const observedValue = getRuleObservedValue(rule, sensorData);
      if (observedValue === null || observedValue === undefined) {
        return acc;
      }

      acc[rule.target] = evaluateRule(observedValue, rule.operator, rule.threshold);
      return acc;
    }, {});

  const actuatorMap = {
    coolingFan: 'cooling_fan',
    habitatHeater: 'habitat_heater',
    entranceHumidifier: 'entrance_humidifier',
    hallVentilation: 'hall_ventilation',
  };

  const toggleActuator = async (name) => {
    if (!isAuto) {
      const nextValue = !actuators[name];
      const actuatorName = actuatorMap[name];

      try {
        setManualError('');
        await sendActuatorCommand(actuatorName, nextValue ? 'ON' : 'OFF');
      } catch (error) {
        console.error('Errore manual override:', error);
        setManualError('Manual override non riuscito');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-8 font-sans">
      <div className="bg-[#d1d5db] w-full max-w-6xl rounded-[40px] p-6 shadow-2xl border-4 border-gray-400 flex flex-col gap-6">
        
        <div className="relative grid grid-cols-2 grid-rows-2 gap-6 h-[600px]">
          
          {/* 1. GREENHOUSE */}
          <div className="bg-green-200 rounded-[30px] border-[3px] border-gray-500 p-4 flex flex-col shadow-inner relative">
            <div className="text-center text-black font-bold text-xl tracking-widest uppercase opacity-70 mb-4">greenhouse</div>
            
            <div className="flex justify-between items-stretch flex-grow gap-6">
              <div className="flex gap-6 h-full">
                <VerticalBarGauge value={sensorData.greenhouse_temp} min={10} max={35} label="temp" unit="°C" fillColor="bg-red-500" tickCount={8} />
                <VerticalBarGauge value={sensorData.water_level} min={0} max={100} label="wlev" unit="%" fillColor="bg-blue-500" tickCount={5} />
              </div>

              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-between gap-2 w-full">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-widest mt-auto ml-2">PH</span>
                  <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.greenhousePh])} isBlinking={true} text="!" activeColor="bg-yellow-400" />
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full">
                  <HorizontalBarGauge value={sensorData.ph} min={0} max={14} tickCount={7} label="" fillColor="bg-green-500" emptyColor="bg-green-200" />
                </div>
              </div>
            </div>
          </div>
          
         {/* 2. HABITAT */}
          <div className="bg-[#fef3c7] rounded-[40px] border-[3px] border-[#333] p-6 flex flex-col shadow-2xl relative min-w-[500px]">
            <div className="text-left text-[#4b5563] font-bold text-2xl tracking-widest uppercase mb-2 ml-4">habitat</div>
            
            <div className="flex flex-row justify-between items-start gap-4">
              <div className="flex flex-col items-center mt-4">
                <OdometerGauge value={sensorData.co2} min={500} max={1500} label="co2" needleColor="bg-red-600" />
              </div>

              <div className="flex flex-col gap-4 scale-75 mt-[-40px] items-center">
                <div className="flex flex-col items-center">
                  <TempGraph data={sensorData.tempHistory || [45, 30, 40, 25, 50, 35, 45]} label="temp" />
                </div>
                <div className="flex flex-col items-center">
                  <PressureDisplay value={sensorData.pressure} label="" />
                  <div className="text-black font-bold text-sm mt-1 uppercase tracking-tighter">press</div>
                </div>
              </div>

              <div className="flex gap-6 h-[70%] mt-2">
                <VerticalBarGauge value={sensorData.pm25} min={0} max={100} label="pm25" unit="" fillColor="bg-red-600" tickCount={5} />
                <VerticalBarGauge value={sensorData.humidity} min={0} max={100} label="hum" unit="%" fillColor="bg-white" tickCount={5} />
              </div>
            </div>
          </div>

          {/* 3. AIRLOCK */}
          <div className="bg-cyan-200 rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col shadow-inner">
             <div className="flex justify-between w-[40%]">
                <div className="text-center w-full">
                  <OdometerGauge value={sensorData.radiation} min={0} max={10} label="radiation" needleColor="bg-blue-600" />
                </div>
             </div>
              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-between gap-2 w-full">
                  <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.airlockCycles])} text="!" activeColor="bg-yellow-400" />
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full">
                    <HorizontalBarGauge value={sensorData.airlock_cycles} min={0} max={20} label="cycles" fillColor="bg-blue-600" emptyColor="bg-blue-200" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-end justify-start mr-40 mt-[-220px]">
                <Spy label="D" isOn={sensorData.statusD} />
                <Spy label="P" isOn={sensorData.statusP} />
                <Spy label="I" isOn={sensorData.statusI} />
              </div>
             <div className="mt-auto pt-4 flex justify-center"> 
                <div className="text-black font-bold text-xl tracking-widest uppercase opacity-80">
                  airlock
                </div>
             </div>
          </div>

          {/* 4. POWER */}
          <div className="bg-[#fed7aa] rounded-[30px] border-[3px] border-gray-500 p-6 flex flex-col shadow-inner">
            <div className="flex flex-row justify-between items-center flex-grow px-2 scale-90 origin-center">
              
              <div className="flex flex-col items-center relative pt-8">
                <div className="scale-75"> 
                  <OdometerGauge value={sensorData.tloop} min={10} max={55} label="tloop" needleColor="bg-orange-500" />
                </div>
              </div>

              <div className="flex flex-row items-end gap-6 h-48 mb-4"> 
                <div className="flex gap-3 h-full">
                  <div className="flex flex-col items-center h-full justify-end">
                    <VerticalBarGauge value={sensorData.voltage} min={0} max={800} label="v" fillColor="bg-gray-100" />
                  </div>
                  <div className="flex flex-col items-center h-full justify-end">
                    <VerticalBarGauge value={sensorData.ampere} min={0} max={400} label="a" fillColor="bg-gray-100" />
                  </div>
                </div>

                <div className="flex gap-3 h-full border-l border-black/10 pl-4"> 
                  <div className="flex flex-col items-center h-full justify-end">
                    <VerticalBarGauge value={sensorData.production} min={0} max={300} label="pro" fillColor="bg-green-600" />
                  </div>
                  <div className="flex flex-col items-center h-full justify-end">
                    <VerticalBarGauge value={sensorData.consumption} min={0} max={300} label="cons" fillColor="bg-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-black font-bold text-xl tracking-widest uppercase opacity-80 mt-auto text-center">
              power
            </div>
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

        {manualError && (
          <div className="bg-red-100 text-red-700 border border-red-300 rounded-2xl px-4 py-3 text-sm font-semibold">
            {manualError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-[30px] p-5 border-4 border-gray-400 shadow-inner min-h-[220px]">
            <div className="text-black font-bold text-xl tracking-widest uppercase mb-4">rules</div>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              {rules.length === 0 && (
                <div className="text-sm text-gray-500">No rules available</div>
              )}
              {rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className={`rounded-2xl p-3 border ${
                    rule.action_type === 'UI_ALERT'
                      ? 'bg-yellow-100 border-yellow-400'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-gray-800">{rule.rule_id}</div>
                    {rule.action_type === 'UI_ALERT' && (
                      <div className="text-[10px] font-black tracking-widest text-yellow-900 bg-yellow-300 px-2 py-1 rounded-full">
                        ALERT
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">{rule.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rule.source_name} {rule.operator} {rule.threshold} {"->"} {rule.target} {rule.payload}
                  </div>
                  <div className="text-xs mt-2 font-semibold">
                    {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[30px] p-5 border-4 border-gray-400 shadow-inner min-h-[220px]">
            <div className="text-black font-bold text-xl tracking-widest uppercase mb-4">history</div>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              {history.length === 0 && (
                <div className="text-sm text-gray-500">No trigger history yet</div>
              )}
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-3 border ${
                    item.action_type === 'UI_ALERT'
                      ? 'bg-yellow-100 border-yellow-400'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-gray-800">{item.rule_id}</div>
                    {item.action_type === 'UI_ALERT' && (
                      <div className="text-[10px] font-black tracking-widest text-yellow-900 bg-yellow-300 px-2 py-1 rounded-full">
                        ALERT
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.source_name} / {item.metric_key} = {item.observed_value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.target} {item.payload}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{item.event_timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MarsDashboard;