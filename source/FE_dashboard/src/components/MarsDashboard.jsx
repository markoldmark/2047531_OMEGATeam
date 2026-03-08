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

const OperationsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h10" />
    <path d="M4 12h16" />
    <path d="M4 18h12" />
    <circle cx="17" cy="6" r="2" />
    <circle cx="9" cy="18" r="2" />
  </svg>
);

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

const formatHistoryAction = (item) => {
  if (item.action_type === 'UI_ALERT') {
    return `ALERT ${item.target} -> ${item.payload}`;
  }

  return `SET ${item.target} -> ${item.payload}`;
};

const formatHistoryTimestamp = (timestamp) => {
  if (!timestamp) return 'Time unavailable';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const MarsDashboard = () => {
  const [isAuto, setIsAuto] = useState(true);
  const [manualError, setManualError] = useState('');
  const [isRuleManagerOpen, setIsRuleManagerOpen] = useState(false);

  const { sensorData, rules: backendRules, history, actuators, sendActuatorCommand } = useMarsData();
  const { rules: managedRules, handleSaveRule, handleDeleteRule, handleToggleRule } = useRules(backendRules);

  const activeAlerts = backendRules
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
    <div className="min-h-screen w-full relative overflow-hidden bg-[#070b12] text-slate-100 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.14),_transparent_28%),linear-gradient(180deg,_#08111b_0%,_#070b12_52%,_#160d0a_100%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-[42vh] bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.08),_transparent_58%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-[-8vh] h-[34vh] rounded-[100%] bg-[#6f2a16]/60 blur-3xl" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-[26vh] bg-gradient-to-t from-[#2a140c] via-[#6b2b19]/55 to-transparent" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1480px] flex-col justify-center px-8 py-8">
        <div className="mb-5 flex items-center justify-between px-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.34em] text-orange-300/90">Mars Habitat Command</div>
            <div className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-300/70">Operations Deck</div>
          </div>
        </div>

      <div className="w-full max-w-[1450px] grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-slate-950/78 backdrop-blur-md rounded-[40px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.58)] border border-slate-600/70 ring-1 ring-white/5 flex flex-col gap-6">
          
          <div className="relative grid grid-cols-2 grid-rows-2 gap-6 h-[600px]">
          
          {/* 1. GREENHOUSE */}
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-[30px] border-2 border-emerald-500/45 p-4 flex flex-col shadow-lg relative">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-slate-900/95 px-2 py-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-300">PH Alert</span>
              <div className="scale-[0.88] translate-y-[1px]">
                <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.greenhousePh])} isBlinking={true} text="!" activeColor="bg-amber-400" inactiveColor="bg-slate-700" />
              </div>
            </div>
            <div className="text-center text-emerald-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Greenhouse</div>
            <div className="flex justify-between items-stretch flex-grow gap-6 h-full">
              <div className="flex gap-6 h-full">
                <VerticalBarGauge value={sensorData.greenhouse_temp} min={10} max={35} label="temp" unit="°C" fillColor="from-orange-400 to-rose-500" tickCount={8} />
                <VerticalBarGauge value={sensorData.water_level} min={0} max={100} label="wlev" unit="%" fillColor="from-blue-400 to-blue-700" tickCount={5} />
              </div>
              <div className="flex flex-col justify-start items-end align-center w-full">
                <div className="flex items-baseline justify-start gap-2 w-full">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest mt-auto ml-2">PH</span>
                </div>
                <div className="flex flex-row justify-end content-center gap-4 w-full mt-2">
                  <HorizontalBarGauge value={sensorData.ph} min={0} max={14} tickCount={7} label="" fillColor="from-emerald-400 to-teal-500" emptyColor="bg-slate-700" />
                </div>
              </div>
            </div>
          </div>
          
         {/* 2. HABITAT */}
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-[30px] border-2 border-amber-500/45 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-amber-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Habitat</div>
            
            <div className="flex justify-between items-stretch flex-grow h-full gap-1">
              
              <div className="flex-1 flex flex-col items-center justify-start h-full">
                <OdometerGauge value={sensorData.co2} min={0} max={2000} scale={1.15} label="co2" needleColor="bg-rose-500" />
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-between h-full pb-2 w-[28%] -ml-2">
                  <O2Graph data={sensorData.oxygen_history || []} label="o2%" />
                  <PressureDisplay value={sensorData.pressure} label="pressure" />
              </div>
              
              <div className="flex-1 flex justify-center items-center gap-3 h-full">
                <VerticalBarGauge value={sensorData.pm25} min={0} max={100} label="pm25" unit="" fillColor="from-rose-500 to-pink-500" tickCount={5} />
                <VerticalBarGauge value={sensorData.humidity} min={0} max={100} label="hum" unit="%" fillColor="from-cyan-100 to-cyan-400" tickCount={5} />
              </div>
              
            </div>
          </div>

          {/* 3. AIRLOCK */}
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-[30px] border-2 border-cyan-500/45 p-4 flex flex-col shadow-lg relative">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-slate-900/95 px-2 py-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-300">Cycle Alert</span>
              <div className="scale-[0.88] translate-y-[1px]">
                <WarningLight isOn={Boolean(activeAlerts[ALERT_TARGETS.airlockCycles])} isBlinking={true} text="!" activeColor="bg-amber-400" inactiveColor="bg-slate-700" />
              </div>
            </div>
            
            <div className="text-center text-cyan-400 font-bold text-lg tracking-[0.2em] uppercase mb-2">Airlock</div>
            
            <div className="grid grid-cols-1 gap-6 flex-grow items-start pt-2">
              
              <div className="flex flex-col items-center justify-start">
                <OdometerGauge 
                  value={sensorData.radiation} 
                  min={0} 
                  max={1} 
                  label="radiation" 
                  needleColor="bg-cyan-400" 
                  ticks={[0.25, 0.5, 0.75]} 
                  scale={1.15} 
                />
              </div>
              
              <div className="flex flex-row gap-3 items-center justify-center mt-16">
                <Spy label="D" isOn={sensorData.statusD} />
                <Spy label="P" isOn={sensorData.statusP} />
                <Spy label="I" isOn={sensorData.statusI} />
              </div>
              
              <div className="col-span-2 mt-auto pb-2">
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-4 w-full justify-center">
                    <div className="flex-grow max-w-[88%]">
                      <HorizontalBarGauge value={sensorData.airlock_cycles} min={0} max={20} label="cycles" fillColor="from-cyan-400 to-blue-500" emptyColor="bg-slate-700" />
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* 4. POWER */}
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-[30px] border-2 border-red-500/45 p-4 flex flex-col shadow-lg relative">
            <div className="text-center text-red-400 font-bold text-lg tracking-[0.2em] uppercase mb-4">Power</div>
            
            <div className="flex justify-between items-center flex-grow gap-2 h-full px-2">
              
              <div className="flex flex-col items-center justify-center flex-1 -ml-2">
                <OdometerGauge 
                  value={sensorData.tloop} 
                  min={30} 
                  max={60} 
                  label="tloop" 
                  needleColor="bg-red-500" 
                  scale={1.15} 
                />
              </div>
              
              <div className="flex gap-3 h-full justify-end flex-1"> 
                <div className="flex gap-3 h-full">
                  <VerticalBarGauge value={sensorData.voltage} min={0} max={800} label="voltage" fillColor="from-slate-400 to-slate-200" tickCount={5} />
                  <VerticalBarGauge value={sensorData.ampere} min={0} max={400} label="ampere" fillColor="from-slate-400 to-slate-200" tickCount={5} />
                </div>
                <div className="flex gap-3 h-full pl-3"> 
                  <VerticalBarGauge value={sensorData.production} min={0} max={300} label="pro" fillColor="from-emerald-400 to-green-400" tickCount={5} />
                  <VerticalBarGauge value={sensorData.consumption} min={0} max={300} label="cons" fillColor="from-rose-500 to-red-500" tickCount={5} />
                </div>
              </div>
              
            </div>
          </div>

          {/* CENTER ACTUATORS */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-950 p-6 rounded-[30px] border-4 border-slate-700 shadow-2xl z-20">
            <div className="grid grid-cols-2 gap-5 w-[250px] h-[150px]">
              {['coolingFan', 'habitatHeater', 'entranceHumidifier', 'hallVentilation'].map((act) => (
                <button 
                  key={act}
                  onClick={() => toggleActuator(act)} 
                  disabled={isAuto}
                  className={`
                    relative overflow-hidden rounded-2xl border h-full whitespace-pre-line transition-all duration-150 outline-none
                    ${actuators[act] 
                      ? 'translate-y-[3px] border-cyan-100 bg-gradient-to-b from-cyan-100 via-cyan-300 to-cyan-500 text-slate-950 shadow-[inset_0_3px_8px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(8,47,73,0.35),0_2px_0_#155e75,0_6px_14px_rgba(8,145,178,0.35)] ring-2 ring-cyan-300/30'
                      : 'border-slate-400 bg-gradient-to-b from-slate-500 via-slate-700 to-slate-900 text-slate-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),inset_0_-6px_8px_rgba(15,23,42,0.45),0_4px_0_#0f172a,0_10px_18px_rgba(2,6,23,0.42)] hover:-translate-y-0.5 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),inset_0_-6px_8px_rgba(15,23,42,0.45),0_5px_0_#0f172a,0_14px_22px_rgba(2,6,23,0.48)] active:translate-y-[3px] active:shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),inset_0_-6px_8px_rgba(15,23,42,0.45),0_2px_0_#0f172a,0_6px_12px_rgba(2,6,23,0.38)]'
                    }
                  `} 
                  aria-pressed={actuators[act]}
                  aria-disabled={isAuto}
                >
                  <div className={`absolute inset-[3px] rounded-[14px] border pointer-events-none ${
                    actuators[act] ? 'border-white/35' : 'border-white/10'
                  }`} aria-hidden="true" />
                  {actuators[act] && (
                    <div className="absolute inset-x-4 top-2 h-2 rounded-full bg-white/45 blur-sm" aria-hidden="true" />
                  )}
                  <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 px-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      actuators[act]
                        ? 'bg-cyan-50 shadow-[0_0_10px_rgba(255,255,255,0.95)]'
                        : 'bg-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]'
                    }`} />
                    <span className="font-black text-[10px] tracking-[0.16em] leading-tight">
                      {act.replace(/([A-Z])/g, '\n$1').toUpperCase()}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.18em] ${
                      actuators[act]
                        ? 'bg-slate-950/15 text-slate-950 border border-slate-950/10'
                        : 'bg-black/15 text-slate-200 border border-white/10'
                    }`}>
                      {actuators[act] ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

          {/* BOTTOM BAR */}
          <div className="flex justify-between items-center gap-4 h-16">

            <div className="bg-slate-900/80 backdrop-blur-sm h-full flex-grow rounded-2xl flex items-center justify-center border-2 border-slate-600/85 shadow-lg relative">
              <span className="text-white font-black text-2xl tracking-[0.3em] uppercase">
                Dashboard
              </span>
              <button 
                onClick={() => setIsRuleManagerOpen(true)}
                className="absolute right-4 text-white bg-cyan-700 hover:bg-cyan-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shadow-md transition-colors"
              >
                <OperationsIcon />
              </button>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-sm h-full rounded-2xl w-[30%] px-6 flex items-center justify-center border-2 border-slate-600/85 shadow-lg gap-4">
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
        </div>

        <aside className="bg-slate-950/88 rounded-[40px] p-5 shadow-2xl border border-slate-700/80 ring-1 ring-white/5 flex flex-col self-start h-[760px] max-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-white font-black text-lg tracking-[0.2em] uppercase">Action History</div>
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-500 mt-1">Control Feed</div>
            </div>
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-cyan-400">
              Live
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto pr-2 flex-1 min-h-0 overscroll-contain [contain:content]">
            {history.length === 0 && (
              <div className="text-sm text-slate-400 font-semibold italic">No trigger history yet</div>
            )}
            {history.map((item) => (
              <div key={item.id} className="rounded-xl p-3 border border-slate-700 bg-slate-900">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full tracking-widest uppercase ${
                      item.action_type === 'UI_ALERT'
                        ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
                        : 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30'
                    }`}>
                      {item.action_type === 'UI_ALERT' ? 'Alert' : 'Actuator'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono font-bold shrink-0">
                    {formatHistoryTimestamp(item.event_timestamp)}
                  </div>
                </div>

                <div className="grid gap-2 text-sm [contain:content]">
                  <div className="rounded-lg bg-slate-800 px-3 py-2">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">Trigger</div>
                    <div className="text-slate-100 font-semibold break-words">
                      {item.source_name}
                      <span className="text-slate-400"> ({item.metric_key})</span>
                      <span className="text-amber-300"> = {item.observed_value}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-800 px-3 py-2">
                    <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">Action</div>
                    <div className={`font-black break-words ${
                      item.action_type === 'UI_ALERT' ? 'text-amber-300' : 'text-emerald-300'
                    }`}>
                      {formatHistoryAction(item)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      </div>

      {isRuleManagerOpen && (
        <RuleManagement 
          rules={managedRules} 
          onClose={() => setIsRuleManagerOpen(false)}
          onSaveRule={handleSaveRule}
          onDeleteRule={handleDeleteRule}
          onToggleRule={handleToggleRule}
        />
      )}
    </div>
  );
};

export default MarsDashboard;