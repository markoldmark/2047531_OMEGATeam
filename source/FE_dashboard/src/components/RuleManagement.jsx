import React, { useState } from 'react';

const RuleManagement = ({ onClose, rules = [], onSaveRule, onDeleteRule }) => {
  const [activeTab, setActiveTab] = useState('list'); 
  const [editingId, setEditingId] = useState(null);

  const defaultRule = { sensor: 'greenhouse_temperature', operator: '>', value: '', actuator: 'cooling_fan', action: 'ON' };
  const [ruleForm, setRuleForm] = useState(defaultRule);

  // ... (sensors e actuators arrays rimangono uguali a prima) ...
  const sensors = [
    { id: 'greenhouse_temperature', label: 'Greenhouse Temp (REST)' },
    { id: 'entrance_humidity', label: 'Entrance Humidity (REST)' },
    { id: 'co2_hall', label: 'CO2 Hall (REST)' },
    { id: 'hydroponic_ph', label: 'Hydroponic pH (REST)' },
    { id: 'water_tank_level', label: 'Water Tank Level (REST)' },
    { id: 'corridor_pressure', label: 'Corridor Pressure (REST)' },
    { id: 'air_quality_pm25', label: 'Air Quality PM2.5 (REST)' },
    { id: 'air_quality_voc', label: 'Air Quality VOC (REST)' },
    { id: 'mars/telemetry/solar_array', label: 'Solar Array (Stream)' },
    { id: 'mars/telemetry/radiation', label: 'Radiation (Stream)' },
    { id: 'mars/telemetry/life_support', label: 'Life Support (Stream)' },
    { id: 'mars/telemetry/thermal_loop', label: 'Thermal Loop (Stream)' },
    { id: 'mars/telemetry/power_bus', label: 'Power Bus (Stream)' },
    { id: 'mars/telemetry/power_consumption', label: 'Power Consump. (Stream)' },
    { id: 'mars/telemetry/airlock', label: 'Airlock (Stream)' },
  ];

  const actuators = [
    { id: 'cooling_fan', label: 'Cooling Fan' },
    { id: 'entrance_humidifier', label: 'Entrance Humidifier' },
    { id: 'hall_ventilation', label: 'Hall Ventilation' },
    { id: 'habitat_heater', label: 'Habitat Heater' },
  ];
  const operators = ['<', '<=', '=', '>', '>='];

  const getSensorLabel = (id) => sensors.find(s => s.id === id)?.label || id;
  const getActuatorLabel = (id) => actuators.find(a => a.id === id)?.label || id;

  const handleChange = (e) => setRuleForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveRule({ ...ruleForm, id: editingId || Date.now() });
    setRuleForm(defaultRule);
    setEditingId(null);
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900/90 border border-white/10 rounded-[30px] p-8 max-w-3xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col h-[600px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 tracking-[0.2em] uppercase">Rule Manager</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors border border-white/5">✕</button>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
          <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Active Rules</button>
          <button onClick={() => {setRuleForm(defaultRule); setEditingId(null); setActiveTab('form');}} className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>
            {editingId ? 'Edit Rule' : 'New Rule'}
          </button>
        </div>

        {/* CONTENUTO */}
        <div className="flex-grow overflow-y-auto pr-2">
          
          {activeTab === 'list' && (
            <div className="flex flex-col gap-4">
              {rules.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm tracking-wider border border-dashed border-white/10 rounded-2xl">No active rules.</div>
              ) : (
                rules.map(r => (
                  <div key={r.id} className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-cyan-500/30 transition-colors">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">IF</span>
                        <span className="text-sm text-cyan-300 font-mono bg-slate-900 px-2 py-1 rounded">{getSensorLabel(r.sensor)}</span>
                        <span className="text-emerald-400 font-bold">{r.operator}</span>
                        <span className="text-sm text-white font-mono bg-slate-900 px-2 py-1 rounded">{r.value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">THEN SET</span>
                        <span className="text-sm text-amber-300 font-mono bg-slate-900 px-2 py-1 rounded">{getActuatorLabel(r.actuator)}</span>
                        <span className="text-slate-500">➔</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${r.action === 'ON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{r.action}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => {setRuleForm(r); setEditingId(r.id); setActiveTab('form');}} className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 rounded-lg border border-white/5 hover:border-cyan-500/50 transition-all">✏️</button>
                      <button onClick={() => onDeleteRule(r.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 rounded-lg border border-white/5 hover:border-rose-500/50 transition-all">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-full">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                <span className="font-semibold text-xs tracking-widest uppercase mb-4 block text-slate-400">Condition</span>
                <div className="grid grid-cols-12 gap-4">
                  <select name="sensor" value={ruleForm.sensor} onChange={handleChange} className="col-span-6 p-3 rounded-lg border border-slate-700 bg-slate-900 text-cyan-300 text-sm focus:border-cyan-500 outline-none">
                    {sensors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <select name="operator" value={ruleForm.operator} onChange={handleChange} className="col-span-3 p-3 rounded-lg border border-slate-700 bg-slate-900 text-emerald-400 font-bold text-center focus:border-cyan-500 outline-none">
                    {operators.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input type="number" name="value" value={ruleForm.value} onChange={handleChange} placeholder="Value" className="col-span-3 p-3 rounded-lg border border-slate-700 bg-slate-900 text-white font-mono focus:border-cyan-500 outline-none" required />
                </div>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                <span className="font-semibold text-xs tracking-widest uppercase mb-4 block text-slate-400">Action</span>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <select name="actuator" value={ruleForm.actuator} onChange={handleChange} className="col-span-8 p-3 rounded-lg border border-slate-700 bg-slate-900 text-amber-300 text-sm focus:border-cyan-500 outline-none">
                    {actuators.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <select name="action" value={ruleForm.action} onChange={handleChange} className="col-span-4 p-3 rounded-lg border border-slate-700 bg-slate-900 text-white font-bold text-center focus:border-cyan-500 outline-none">
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="mt-auto w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-sm p-4 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)] uppercase tracking-widest transition-all">
                {editingId ? 'Update Protocol' : 'Deploy Rule'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default RuleManagement;