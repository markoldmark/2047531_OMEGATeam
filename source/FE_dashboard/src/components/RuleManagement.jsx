import React, { useState } from 'react';

const RuleManagement = ({ onClose, rules = [], onSaveRule, onDeleteRule }) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' o 'form'
  const [editingId, setEditingId] = useState(null);

  const defaultRule = {
    sensor: 'greenhouse_temperature',
    operator: '>',
    value: '',
    actuator: 'cooling_fan',
    action: 'ON'
  };

  const [ruleForm, setRuleForm] = useState(defaultRule);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRuleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveRule({ ...ruleForm, id: editingId || Date.now() }); // Usa un ID fittizio se nuovo
    setRuleForm(defaultRule);
    setEditingId(null);
    setActiveTab('list'); // Torna alla lista dopo il salvataggio
  };

  const handleEditClick = (ruleToEdit) => {
    setRuleForm(ruleToEdit);
    setEditingId(ruleToEdit.id);
    setActiveTab('form');
  };

  const handleNewClick = () => {
    setRuleForm(defaultRule);
    setEditingId(null);
    setActiveTab('form');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#d1d5db] border-4 border-gray-500 rounded-[30px] p-6 max-w-3xl w-full shadow-2xl flex flex-col h-[600px]">
        
        {/* HEADER & CHIUSURA */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-gray-800 tracking-widest uppercase">Rule Manager</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-black font-bold text-2xl px-3 py-1 bg-gray-300 rounded-xl border-2 border-gray-400">X</button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 border-b-4 border-gray-400 pb-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-6 py-2 rounded-t-xl font-bold text-lg uppercase tracking-wider transition-colors border-2 border-b-0 ${activeTab === 'list' ? 'bg-gray-400 text-black border-gray-500' : 'bg-gray-300 text-gray-500 border-gray-400 hover:bg-gray-350'}`}
          >
            Active Rules
          </button>
          <button 
            onClick={handleNewClick}
            className={`px-6 py-2 rounded-t-xl font-bold text-lg uppercase tracking-wider transition-colors border-2 border-b-0 ${activeTab === 'form' ? 'bg-gray-400 text-black border-gray-500' : 'bg-gray-300 text-gray-500 border-gray-400 hover:bg-gray-350'}`}
          >
            {editingId ? 'Edit Rule' : 'New Rule'}
          </button>
        </div>

        {/* CONTENUTO SCHEDE */}
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          
          {/* TAB 1: LISTA REGOLE */}
          {activeTab === 'list' && (
            <div className="flex flex-col gap-4">
              {rules.length === 0 ? (
                <div className="text-center p-8 text-gray-500 font-bold text-lg border-4 border-dashed border-gray-400 rounded-2xl">
                  Nessuna regola attiva. Clicca su "New Rule" per crearne una.
                </div>
              ) : (
                rules.map(r => (
                  <div key={r.id} className="bg-gray-200 p-4 rounded-2xl border-2 border-gray-400 flex justify-between items-center shadow-sm">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-gray-500 mb-1">IF</div>
                      <div className="font-black text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-300 inline-block">
                        {getSensorLabel(r.sensor)} <span className="text-blue-600 mx-1">{r.operator}</span> {r.value}
                      </div>
                      <div className="text-sm font-bold text-gray-500 mt-2 mb-1">THEN SET</div>
                      <div className="font-black text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-300 inline-block">
                        {getActuatorLabel(r.actuator)} <span className="text-red-600 mx-1">➔</span> {r.action}
                      </div>
                    </div>
                    
                    {/* BOTTONI AZIONE */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button 
                        onClick={() => handleEditClick(r)}
                        className="p-3 bg-blue-200 hover:bg-blue-300 border-2 border-blue-400 rounded-xl transition-colors shadow-sm"
                        title="Modifica regola"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => onDeleteRule(r.id)}
                        className="p-3 bg-red-200 hover:bg-red-300 border-2 border-red-400 rounded-xl transition-colors shadow-sm"
                        title="Elimina regola"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: FORM CREAZIONE / MODIFICA */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="bg-gray-200 p-6 rounded-2xl border-2 border-gray-400">
                <span className="font-bold text-lg mb-2 block text-gray-700">IF Condition:</span>
                <div className="grid grid-cols-12 gap-4">
                  <select name="sensor" value={ruleForm.sensor} onChange={handleChange} className="col-span-6 p-3 rounded-xl border-2 border-gray-400 bg-white font-bold text-sm">
                    {sensors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  
                  <select name="operator" value={ruleForm.operator} onChange={handleChange} className="col-span-3 p-3 rounded-xl border-2 border-gray-400 bg-white font-black text-center text-lg">
                    {operators.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>

                  <input type="number" name="value" value={ruleForm.value} onChange={handleChange} placeholder="Value" className="col-span-3 p-3 rounded-xl border-2 border-gray-400 bg-white font-bold" required />
                </div>
              </div>

              <div className="bg-gray-200 p-6 rounded-2xl border-2 border-gray-400">
                <span className="font-bold text-lg mb-2 block text-gray-700">THEN Action:</span>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <span className="col-span-2 font-bold text-gray-600 text-center">SET</span>
                  <select name="actuator" value={ruleForm.actuator} onChange={handleChange} className="col-span-6 p-3 rounded-xl border-2 border-gray-400 bg-white font-bold text-sm">
                    {actuators.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <span className="col-span-1 font-bold text-gray-600 text-center">TO</span>
                  <select name="action" value={ruleForm.action} onChange={handleChange} className="col-span-3 p-3 rounded-xl border-2 border-gray-400 bg-white font-black text-center">
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xl p-4 rounded-xl shadow-lg uppercase tracking-widest transition-colors">
                {editingId ? 'Save Changes' : 'Create Rule'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default RuleManagement;