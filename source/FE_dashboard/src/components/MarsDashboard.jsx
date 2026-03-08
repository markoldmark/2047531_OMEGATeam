import React, { useState } from 'react';
import OdometerGauge from './OdometerGauge';
import VerticalBarGauge from './VerticalBarGauge';
import HorizontalBarGauge from './HorizontalBarGauge';
import WarningLight from './WarningLight';
import PressureDisplay from './PressureDisplay';
import O2Graph from './O2Graph';
import Spy from './Spy';
import RuleManagement from './RuleManagement';

import { useMarsData } from '../services/useMarsData';
import { useRules } from '../services/handleRules';

const ALERT_TARGETS = { greenhousePh: 'greenhouse_ph_warning', airlockCycles: 'airlock_cycles_warning' };

const getRuleObservedValue = (rule, sensorData) => {
  if (rule.source_name === 'hydroponic_ph' && rule.metric_key === 'ph') return sensorData.ph;
  if (rule.source_name === 'mars/telemetry/airlock' && rule.metric_key === 'cycles_per_hour') return sensorData.airlock_cycles;
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
  if (operator === '=') return String(value) === String(threshold);
  return false;
};

const MarsDashboard = () => {
  const [isAuto, setIsAuto] = useState(true);
  const [manualError, setManualError] = useState('');
  const [isRuleManagerOpen, setIsRuleManagerOpen] = useState(false);

  const { sensorData, rules: backendRules, history, actuators, sendActuatorCommand } = useMarsData();
  const { rules: managedRules, handleSaveRule, handleDeleteRule } = useRules(backendRules);

  const activeAlerts = managedRules
    .filter((rule) => rule.action_type === 'UI_ALERT' && rule.is_active)
    .reduce((acc, rule) => {
      const observedValue = getRuleObservedValue(rule, sensorData);
      if (observedValue === null || observedValue === undefined) return acc;
      acc[rule.target] = evaluateRule(observedValue, rule.operator, rule.threshold);
      return acc;
    }, {});

  const actuatorMap = { coolingFan: 'cooling_fan', habitatHeater: 'habitat_heater', entranceHumidifier: 'entrance_humidifier', hallVentilation: 'hall_ventilation' };

  const toggleActuator = async (name) => {
    if (!isAuto) {
      const nextValue = !actuators[name];
      const actuatorName = actuatorMap[name];
      try {
        setManualError('');
        await sendActuatorCommand(actuatorName, nextValue ? 'ON' : 'OFF');
      } catch (error) {
        setManualError('Manual override non riuscito');
      }
    }
  };

  return (
    // Sfondo principale grigio molto scuro ma solido
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8 font-sans">
      
      <div className="bg-slate-950 w-full max-w-6xl rounded-[40px] p-6 shadow-2xl border-2 border-slate-700 flex flex-col gap-6">
        
        <div className="relative grid grid-cols-2 grid-rows-2 gap-6 h-[600px]">
          
          {/* 1. GREENHOUSE */}
          <div className="bg-slate-800 rounded-[30px] border-2 border-emerald-500/50 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-emerald-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Greenhouse</div>
            <div className="flex justify-between items-stretch flex-grow gap-6 h-full">
              <div className="flex gap-6 h-full">
                <VerticalBarGauge value={sensorData.greenhouse_temp} min={10} max={35} label="temp" unit="°C" fillColor="from-rose-500 to-orange-400" tickCount={8} />
                <VerticalBarGauge value={sensorData.water_level} min={0} max={100} label="wlev" unit="%" fillColor="from-cyan-500 to-blue-500" tickCount={5} />
              </div>
              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-between gap-2 w-full">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest mt-auto ml-2">PH</span>
                  <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.greenhousePh])} isBlinking={true} text="!" activeColor="bg-amber-400" inactiveColor="bg-slate-700" />
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full mt-2">
                  <HorizontalBarGauge value={sensorData.ph} min={0} max={14} tickCount={7} label="" fillColor="from-emerald-400 to-teal-500" emptyColor="bg-slate-700" />
                </div>
              </div>
            </div>
          </div>
          
         {/* 2. HABITAT */}
          <div className="bg-slate-800 rounded-[30px] border-2 border-amber-500/50 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-amber-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Habitat</div>
            <div className="flex justify-between items-stretch flex-grow gap-6">
              <div className="flex flex-col items-center justify-start">
                <OdometerGauge value={sensorData.co2} min={500} max={2000} label="co2" needleColor="bg-rose-500" />
              </div>
              <div className="flex flex-col gap-4 items-center justify-start">
                <div className="flex flex-col items-center scale-50 justify-start -mt-8">
                  <O2Graph data={sensorData.oxygen_history || []} label="o2 %" />
                </div>
                <div className="flex flex-col items-center -mt-4">
                  <PressureDisplay value={sensorData.pressure} label="press" />
                </div>
              </div>
              <div className="flex gap-6 h-64">
                <VerticalBarGauge value={sensorData.pm25} min={0} max={100} label="pm25" unit="" fillColor="from-rose-500 to-pink-500" tickCount={5} />
                <VerticalBarGauge value={sensorData.humidity} min={0} max={100} label="hum" unit="%" fillColor="from-slate-300 to-white" tickCount={5} />
              </div>
            </div>
          </div>

          {/* 3. AIRLOCK */}
          <div className="bg-slate-800 rounded-[30px] border-2 border-cyan-500/50 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-cyan-400 font-bold text-lg tracking-[0.2em] uppercase mb-6">Airlock</div>
            <div className="grid grid-cols-2 gap-4 flex-grow items-center">
              <div className="flex flex-col items-center justify-center">
                <OdometerGauge value={sensorData.radiation} min={0} max={10} label="radiation" needleColor="bg-cyan-400" />
              </div>
              <div className="flex flex-col gap-3 items-start pl-6 justify-center border-l-2 border-slate-600">
                <Spy label="D" isOn={sensorData.statusD} />
                <Spy label="P" isOn={sensorData.statusP} />
                <Spy label="I" isOn={sensorData.statusI} />
              </div>
              <div className="col-span-2 mt-2 pt-4 border-t-2 border-slate-600">
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-4 w-full justify-center">
                    <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.airlockCycles])} text="!" activeColor="bg-amber-400" inactiveColor="bg-slate-700" />
                    <div className="flex-grow max-w-[80%]">
                      <HorizontalBarGauge value={sensorData.airlock_cycles} min={0} max={20} label="cycles" fillColor="from-cyan-400 to-blue-500" emptyColor="bg-slate-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. POWER */}
          <div className="bg-slate-800 rounded-[30px] border-2 border-red-500/50 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-red-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Power</div>
            <div className="flex justify-between items-stretch flex-grow gap-6 h-full">
              <div className="flex flex-col items-center justify-center">
                <div className="scale-90"> 
                  <OdometerGauge value={sensorData.tloop} min={10} max={55} label="tloop" needleColor="bg-red-500" />
                </div>
              </div>
              <div className="flex gap-4 h-full"> 
                <div className="flex gap-4 h-full">
                  <VerticalBarGauge value={sensorData.voltage} min={0} max={800} label="v" fillColor="from-slate-400 to-slate-200" tickCount={5} />
                  <VerticalBarGauge value={sensorData.ampere} min={0} max={400} label="a" fillColor="from-slate-400 to-slate-200" tickCount={5} />
                </div>
                <div className="flex gap-4 h-full border-l-2 border-slate-600 pl-4"> 
                  <VerticalBarGauge value={sensorData.production} min={0} max={300} label="pro" fillColor="from-emerald-400 to-green-400" tickCount={5} />
                  <VerticalBarGauge value={sensorData.consumption} min={0} max={300} label="cons" fillColor="from-rose-500 to-red-500" tickCount={5} />
                </div>
              </div>
            </div>
          </div>

          {/* CENTER ACTUATORS */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-4 rounded-[30px] border-4 border-slate-700 shadow-2xl z-20">
            <div className="grid grid-cols-2 gap-3 w-[300px] h-[200px]">
              {['coolingFan', 'habitatHeater', 'entranceHumidifier', 'hallVentilation'].map((act) => (
                <button 
                  key={act}
                  onClick={() => toggleActuator(act)} 
                  className={`rounded-2xl border-2 font-bold text-center text-xs tracking-wider transition-colors duration-200 ${
                    actuators[act] 
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(8,145,178,0.8)]' 
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`} 
                  disabled={isAuto}
                >
                  {act.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="flex justify-between items-center gap-4 h-16">
          <div className="bg-slate-800 h-full rounded-2xl px-8 flex items-center justify-center border-2 border-slate-600 shadow-lg">
            <span className="text-white font-mono text-xl tracking-widest">H:1-2-1</span>
          </div>

          <div className="bg-slate-800 h-full flex-grow rounded-2xl flex items-center justify-center border-2 border-slate-600 shadow-lg gap-4">
            <span className="text-white font-black text-2xl tracking-[0.3em] uppercase">Operations</span>
            <button 
              onClick={() => setIsRuleManagerOpen(true)}
              className="text-white bg-cyan-700 hover:bg-cyan-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md transition-colors"
            >
              ⚙️
            </button>
          </div>

          <div className="bg-slate-800 h-full rounded-2xl px-6 flex items-center justify-center border-2 border-slate-600 shadow-lg gap-4">
            <span className={`font-bold text-xl ${!isAuto ? 'text-cyan-400' : 'text-slate-500'}`}>MANUAL</span>
            <div className="w-20 h-10 bg-slate-950 rounded-full p-1 cursor-pointer relative border-2 border-slate-600 shadow-inner" onClick={() => setIsAuto(!isAuto)}>
              <div className={`w-7 h-7 rounded-full shadow-md transition-transform duration-300 ease-in-out absolute top-1 ${isAuto ? 'translate-x-10 bg-emerald-500' : 'translate-x-0 bg-cyan-500'}`}></div>
            </div>
            <span className={`font-bold text-xl ${isAuto ? 'text-emerald-400' : 'text-slate-500'}`}>AUTO</span>
          </div>
        </div>

        {manualError && (
          <div className="bg-rose-900 border-2 border-rose-500 text-white rounded-2xl px-4 py-3 text-sm font-bold">
            {manualError}
          </div>
        )}

        {/* HISTORY SECTION */}
        <div className="grid grid-cols-2 gap-6 mt-2">
          <div className="bg-slate-800 rounded-[30px] p-5 border-2 border-slate-600 shadow-lg min-h-[220px]">
            <div className="text-white font-black text-lg tracking-[0.2em] uppercase mb-4">Action History</div>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
              {history.length === 0 && (
                <div className="text-sm text-slate-400 font-semibold italic">No trigger history yet</div>
              )}
              {history.map((item) => (
                <div key={item.id} className="rounded-xl p-3 border-2 border-slate-600 bg-slate-900">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-xs font-black text-cyan-400">Rule ID: {item.rule_id}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold">{item.event_timestamp}</div>
                  </div>
                  <div className="text-xs text-white font-semibold mb-1">
                    <span className="text-slate-500">Trigger:</span> {item.source_name} ({item.metric_key}) <span className="text-amber-400">= {item.observed_value}</span>
                  </div>
                  <div className="text-xs font-black text-emerald-400">
                    <span className="text-slate-500">Action:</span> SET {item.actuator_name} ➔ {item.actuator_state}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {isRuleManagerOpen && (
        <RuleManagement 
          rules={managedRules} 
          onClose={() => setIsRuleManagerOpen(false)}
          onSaveRule={handleSaveRule}
          onDeleteRule={handleDeleteRule}
        />
      )}
    </div>
  );
};

export default MarsDashboard;