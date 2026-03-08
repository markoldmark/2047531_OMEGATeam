import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://127.0.0.1:8000';
const INITIAL_ACTUATOR_STATE = {
  coolingFan: false,
  habitatHeater: false,
  entranceHumidifier: false,
  hallVentilation: false,
};

export const fetchRulesAndHistory = async () => {
  try {
    const [rulesRes, historyRes, actuatorsRes] = await Promise.all([
      fetch(`${API_URL}/api/rules`),
      fetch(`${API_URL}/api/history`),
      fetch(`${API_URL}/api/actuators`)
    ]);
    
    const rules = rulesRes.ok ? await rulesRes.json() : [];
    const history = historyRes.ok ? await historyRes.json() : [];
    const actuators = actuatorsRes.ok ? await actuatorsRes.json() : { actuators: {} };
    
    return { rules, history, actuators };
  } catch (error) {
    console.error('Errore caricamento rules/history:', error);
    return { rules: [], history: [], actuators: { actuators: {} } };
  }
};

export const sendActuatorCommand = async (actuatorName, state) => {
  const response = await fetch(`${API_URL}/api/actuators/${actuatorName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Errore comando attuatore');
  }
  return response.json();
};

const getInitVal = (cache, source, extractor) => {
  if (cache[source] && cache[source].measurements) {
    return extractor(cache[source].measurements);
  }
  return undefined;
};

const getMetric = (arr, metricStr) => {
  if (!arr || !Array.isArray(arr)) return null;
  const item = arr.find(m => m.metric && m.metric.toLowerCase().includes(metricStr));
  return item ? item.value : null;
};

const mapActuatorStates = (payload) => {
  const actuators = payload?.actuators ?? {};
  return {
    coolingFan: actuators.cooling_fan === 'ON',
    habitatHeater: actuators.habitat_heater === 'ON',
    entranceHumidifier: actuators.entrance_humidifier === 'ON',
    hallVentilation: actuators.hall_ventilation === 'ON',
  };
};

const processInitState = (cache, prev) => {
  const initTemp = getInitVal(cache, 'mars/telemetry/life_support', d => getMetric(d, 'temp')) ?? 25;
  
  return {
    ...prev,
    habitat_temp: initTemp,
    habitat_temp_history: [initTemp],
    greenhouse_temp: getInitVal(cache, 'greenhouse_temperature', d => d.value) ?? prev.greenhouse_temp,
    water_level: getInitVal(cache, 'water_tank_level', d => d.level_pct) ?? prev.water_level,
    ph: getInitVal(cache, 'hydroponic_ph', d => d.measurements?.find(m => m.metric === 'ph')?.value) ?? prev.ph,
    co2: getInitVal(cache, 'co2_hall', d => d.value) ?? getInitVal(cache, 'mars/telemetry/life_support', d => d.measurements?.find(m => m.metric.includes('co2'))?.value) ?? prev.co2,
    radiation: getInitVal(cache, 'mars/telemetry/radiation', d => d.measurements?.find(m => m.metric.includes('radiation'))?.value) ?? prev.radiation,
    power: getInitVal(cache, 'mars/telemetry/power_consumption', d => d.power_kw) ?? getInitVal(cache, 'mars/telemetry/power_bus', d => d.power_kw) ?? prev.power,
    humidity: getInitVal(cache, 'entrance_humidity', d => d.value) ?? prev.humidity,
    pressure: getInitVal(cache, 'corridor_pressure', d => d.value) ?? prev.pressure,
    pm25: getInitVal(cache, 'air_quality_pm25', d => d.pm25_ug_m3) ?? prev.pm25,
    tloop: getInitVal(cache, 'mars/telemetry/thermal_loop', d => d.temperature_c) ?? prev.tloop,
    voltage: getInitVal(cache, 'mars/telemetry/power_bus', d => d.voltage_v) ?? prev.voltage,
    ampere: getInitVal(cache, 'mars/telemetry/power_bus', d => d.current_a) ?? prev.ampere,
    production: getInitVal(cache, 'mars/telemetry/solar_array', d => d.power_kw) ?? prev.production,
    consumption: getInitVal(cache, 'mars/telemetry/power_consumption', d => d.power_kw) ?? prev.consumption,
    airlock_cycles: getInitVal(cache, 'mars/telemetry/airlock', d => d.cycles_per_hour) ?? prev.airlock_cycles,
    statusD: getInitVal(cache, 'mars/telemetry/airlock', d => d.last_state) === 'DEPRESSURIZING',
    statusP: getInitVal(cache, 'mars/telemetry/airlock', d => d.last_state) === 'PRESSURIZING',
    statusI: getInitVal(cache, 'mars/telemetry/airlock', d => d.last_state) === 'IDLE' ? true : prev.statusI
  };
};

const processTelemetryUpdate = (source, data, prev) => {
  const newData = { ...prev };
  let isUpdated = false;

  if (source === 'greenhouse_temperature') {
    if (data.value !== undefined) { newData.greenhouse_temp = data.value; isUpdated = true; }
  } else if (source === 'co2_hall') {
    if (data.value !== undefined) { newData.co2 = data.value; isUpdated = true; }
  } else if (source === 'entrance_humidity') {
    if (data.value !== undefined) { newData.humidity = data.value; isUpdated = true; }
  } else if (source === 'corridor_pressure') {
    if (data.value !== undefined) { newData.pressure = data.value; isUpdated = true; }
  } else if (source === 'water_tank_level') {
    if (data.level_pct !== undefined) { newData.water_level = data.level_pct; isUpdated = true; }
  } else if (source === 'hydroponic_ph') {
    const val = getMetric(data.measurements, 'ph');
    if (val !== null) { newData.ph = val; isUpdated = true; }
  } else if (source === 'air_quality_voc') {
    const val = getMetric(data.measurements, 'voc');
    if (val !== null) { newData.voc = val; isUpdated = true; }
  } else if (source === 'air_quality_pm25') {
    if (data.pm25_ug_m3 !== undefined) { newData.pm25 = data.pm25_ug_m3; isUpdated = true; }
  } else if (source === 'mars/telemetry/life_support') {
    const valCo2 = getMetric(data.measurements, 'co2');
    if (valCo2 !== null && valCo2 !== undefined) { newData.co2 = valCo2; isUpdated = true; }
    
    const valO2 = getMetric(data.measurements, 'oxygen_percent');
    if (valO2 !== null && valO2 !== undefined) { 
      newData.oxygen_history = [...(prev.oxygen_history || []), valO2].slice(-30);
      isUpdated = true; 
    }
  } else if (source === 'mars/telemetry/radiation') {
    const val = getMetric(data.measurements, 'radiation');
    if (val !== null) { newData.radiation = val; isUpdated = true; }
  } else if (source === 'mars/telemetry/power_consumption') {
    if (data.power_kw !== undefined) { newData.power = data.power_kw; newData.consumption = data.power_kw; isUpdated = true; }
  } else if (source === 'mars/telemetry/solar_array') {
    if (data.power_kw !== undefined) { newData.production = data.power_kw; isUpdated = true; }
  } else if (source === 'mars/telemetry/power_bus') {
    if (data.power_kw !== undefined) { newData.power = data.power_kw; isUpdated = true; }
    if (data.voltage_v !== undefined) { newData.voltage = data.voltage_v; isUpdated = true; }
    if (data.current_a !== undefined) { newData.ampere = data.current_a; isUpdated = true; }
  } else if (source === 'mars/telemetry/thermal_loop') {
    if (data.temperature_c !== undefined) { newData.tloop = data.temperature_c; isUpdated = true; }
  } else if (source === 'mars/telemetry/airlock') {
    if (data.cycles_per_hour !== undefined) { newData.airlock_cycles = data.cycles_per_hour; isUpdated = true; }
    if (data.last_state !== undefined) { 
      newData.statusI = data.last_state === 'IDLE';
      newData.statusP = data.last_state === 'PRESSURIZING';
      newData.statusD = data.last_state === 'DEPRESSURIZING';
      isUpdated = true; 
    }
  }

  return { newData, isUpdated };
};

const INITIAL_SENSOR_STATE = {
  oxygen_history: [],
  greenhouse_temp: 0, water_level: 0, ph: 7.0, co2: 0, radiation: 0, power: 0,
  humidity: 0, pressure: 0, pm25: 0, voc: 0, tloop: 0, voltage: 0, ampere: 0,
  production: 0, consumption: 0, airlock_cycles: 0, statusD: false, statusP: false, statusI: true,
};

export const useMarsData = () => {
  const [sensorData, setSensorData] = useState(INITIAL_SENSOR_STATE);
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [actuators, setActuators] = useState(INITIAL_ACTUATOR_STATE);

  const socketRef = useRef(null);

  const loadData = async () => {
    const data = await fetchRulesAndHistory();
    setRules(data.rules);
    setHistory(data.history);
    setActuators(mapActuatorStates(data.actuators));
  };

  const handleSendActuatorCommand = async (actuatorName, state) => {
    const response = await sendActuatorCommand(actuatorName, state);

    setActuators((prev) => ({
      ...prev,
      coolingFan: actuatorName === 'cooling_fan' ? state === 'ON' : prev.coolingFan,
      habitatHeater: actuatorName === 'habitat_heater' ? state === 'ON' : prev.habitatHeater,
      entranceHumidifier: actuatorName === 'entrance_humidifier' ? state === 'ON' : prev.entranceHumidifier,
      hallVentilation: actuatorName === 'hall_ventilation' ? state === 'ON' : prev.hallVentilation,
    }));

    return response;
  };

  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) return;

    console.log("Tentativo di connessione a Marte...");
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws/stream`);
    socketRef.current = ws;
    
    const initialLoadId = setTimeout(() => loadData(), 0);
    const pollId = setInterval(() => loadData(), 500);

    ws.onopen = () => console.log('✅ Connesso a Marte con successo!');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.event_type === 'RULE_UPDATED') {
        console.log("⚡ Ricevuto RULE_UPDATED dal broker! Ricarico le regole...");
        loadData(); 
        return;
      }
      
      if (message.type === 'INIT_STATE') {
        setSensorData(prev => processInitState(message.data, prev));
      } 
      else if (message.source_name) {
        setSensorData(prev => {
          const { newData, isUpdated } = processTelemetryUpdate(message.source_name, message.measurements, prev);
          
          if (isUpdated) {
            return newData;
          }
          return prev;
        });
      }
    };

    ws.onerror = (err) => console.error("Errore WS React:", err);
    
    ws.onclose = () => {
      console.log('❌ Connessione chiusa');
      socketRef.current = null;
    };

    return () => {
      clearTimeout(initialLoadId);
      clearInterval(pollId);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
      }
      socketRef.current = null;
    };
  }, []);

  return { sensorData, rules, history, actuators, sendActuatorCommand: handleSendActuatorCommand };
};