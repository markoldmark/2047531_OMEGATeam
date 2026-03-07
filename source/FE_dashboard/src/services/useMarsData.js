import { useState, useEffect, useRef } from 'react';

export const useMarsData = () => {
  const [sensorData, setSensorData] = useState({
    greenhouse_temp: 0,
    water_level: 0,
    ph: 7.0,
    co2: 0,
    radiation: 0,
    power: 0,
    // Nuovi controlli aggiunti
    humidity: 0,
    pressure: 0,
    pm25: 0,
    voc: 0,
    tloop: 0,
    voltage: 0,
    ampere: 0,
    production: 0,
    consumption: 0,
    airlock_cycles: 0,
    statusD: false,
    statusP: false,
    statusI: true,
  });
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);

  const socketRef = useRef(null);

  const loadRulesAndHistory = async () => {
    try {
      const [rulesResponse, historyResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/rules'),
        fetch('http://127.0.0.1:8000/api/history')
      ]);

      if (rulesResponse.ok) setRules(await rulesResponse.json());
      if (historyResponse.ok) setHistory(await historyResponse.json());
    } catch (error) {
      console.error('Errore caricamento rules/history:', error);
    }
  };

  const sendActuatorCommand = async (actuatorName, state) => {
    const response = await fetch(`http://127.0.0.1:8000/api/actuators/${actuatorName}`, {
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

  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) return;

    console.log("Tentativo di connessione a Marte...");
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    socketRef.current = ws;
    
    const initialLoadId = setTimeout(() => loadRulesAndHistory(), 0);
    const pollId = setInterval(() => loadRulesAndHistory(), 5000);

    ws.onopen = () => console.log('✅ Connesso a Marte con successo!');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'INIT_STATE') {
        const cache = message.data;

        const getInitVal = (source, extractor) => {
          if (cache[source] && cache[source].measurements) {
            return extractor(cache[source].measurements);
          }
          return undefined;
        };

        setSensorData(prev => ({
          ...prev,
          greenhouse_temp: getInitVal('greenhouse_temperature', d => d.value) ?? prev.greenhouse_temp,
          water_level: getInitVal('water_tank_level', d => d.level_pct) ?? prev.water_level,
          ph: getInitVal('hydroponic_ph', d => d.measurements?.find(m => m.metric === 'ph')?.value) ?? prev.ph,
          co2: getInitVal('co2_hall', d => d.value) ?? getInitVal('mars/telemetry/life_support', d => d.measurements?.find(m => m.metric.includes('co2'))?.value) ?? prev.co2,
          radiation: getInitVal('mars/telemetry/radiation', d => d.measurements?.find(m => m.metric.includes('radiation'))?.value) ?? prev.radiation,
          power: getInitVal('mars/telemetry/power_consumption', d => d.power_kw) ?? getInitVal('mars/telemetry/power_bus', d => d.power_kw) ?? prev.power,
          // Mappatura INIT_STATE per i nuovi controlli
          humidity: getInitVal('entrance_humidity', d => d.value) ?? prev.humidity,
          pressure: getInitVal('corridor_pressure', d => d.value) ?? prev.pressure,
          pm25: getInitVal('air_quality_pm25', d => d.pm25_ug_m3) ?? prev.pm25,
          tloop: getInitVal('mars/telemetry/thermal_loop', d => d.temperature_c) ?? prev.tloop,
          voltage: getInitVal('mars/telemetry/power_bus', d => d.voltage_v) ?? prev.voltage,
          ampere: getInitVal('mars/telemetry/power_bus', d => d.current_a) ?? prev.ampere,
          production: getInitVal('mars/telemetry/solar_array', d => d.power_kw) ?? prev.production,
          consumption: getInitVal('mars/telemetry/power_consumption', d => d.power_kw) ?? prev.consumption,
          airlock_cycles: getInitVal('mars/telemetry/airlock', d => d.cycles_per_hour) ?? prev.airlock_cycles,
          statusD: getInitVal('mars/telemetry/airlock', d => d.last_state) === 'DEPRESSURIZING',
          statusP: getInitVal('mars/telemetry/airlock', d => d.last_state) === 'PRESSURIZING',
          statusI: getInitVal('mars/telemetry/airlock', d => d.last_state) === 'IDLE' ? true : prev.statusI
        }));
      } 
      else if (message.source_name) {
        const source = message.source_name;
        const data = message.measurements; 

        setSensorData(prev => {
          const newData = { ...prev };
          let isUpdated = false;

          const getMetric = (arr, metricStr) => {
            if (!arr || !Array.isArray(arr)) return null;
            const item = arr.find(m => m.metric && m.metric.toLowerCase().includes(metricStr));
            return item ? item.value : null;
          };

          // --- MAPPATURA ESATTA BASATA SUI CONTRATTI ---

          // rest.scalar.v1
          if (source === 'greenhouse_temperature') {
            if (data.value !== undefined) { newData.greenhouse_temp = data.value; isUpdated = true; }
          } else if (source === 'co2_hall') {
            if (data.value !== undefined) { newData.co2 = data.value; isUpdated = true; }
          } else if (source === 'entrance_humidity') {
            if (data.value !== undefined) { newData.humidity = data.value; isUpdated = true; }
          } else if (source === 'corridor_pressure') {
            if (data.value !== undefined) { newData.pressure = data.value; isUpdated = true; }
          }
          
          // rest.level.v1
          else if (source === 'water_tank_level') {
            if (data.level_pct !== undefined) { newData.water_level = data.level_pct; isUpdated = true; }
          }
          
          // rest.chemistry.v1
          else if (source === 'hydroponic_ph') {
            const val = getMetric(data.measurements, 'ph');
            if (val !== null) { newData.ph = val; isUpdated = true; }
          }
          else if (source === 'air_quality_voc') {
            const val = getMetric(data.measurements, 'voc');
            if (val !== null) { newData.voc = val; isUpdated = true; }
          }

          // rest.particulate.v1
          else if (source === 'air_quality_pm25') {
            if (data.pm25_ug_m3 !== undefined) { newData.pm25 = data.pm25_ug_m3; isUpdated = true; }
          }
          
          // topic.environment.v1
          else if (source === 'mars/telemetry/life_support') {
            const val = getMetric(data.measurements, 'co2');
            if (val !== null) { newData.co2 = val; isUpdated = true; }
          }
          else if (source === 'mars/telemetry/radiation') {
            const val = getMetric(data.measurements, 'radiation');
            if (val !== null) { newData.radiation = val; isUpdated = true; }
          }
          
          // topic.power.v1
          else if (source === 'mars/telemetry/power_consumption') {
            if (data.power_kw !== undefined) { newData.power = data.power_kw; newData.consumption = data.power_kw; isUpdated = true; }
          } else if (source === 'mars/telemetry/solar_array') {
            if (data.power_kw !== undefined) { newData.production = data.power_kw; isUpdated = true; }
          } else if (source === 'mars/telemetry/power_bus') {
            if (data.power_kw !== undefined) { newData.power = data.power_kw; isUpdated = true; }
            if (data.voltage_v !== undefined) { newData.voltage = data.voltage_v; isUpdated = true; }
            if (data.current_a !== undefined) { newData.ampere = data.current_a; isUpdated = true; }
          }

          // topic.thermal_loop.v1
          else if (source === 'mars/telemetry/thermal_loop') {
            if (data.temperature_c !== undefined) { newData.tloop = data.temperature_c; isUpdated = true; }
          }

          // topic.airlock.v1
          else if (source === 'mars/telemetry/airlock') {
            if (data.cycles_per_hour !== undefined) { newData.airlock_cycles = data.cycles_per_hour; isUpdated = true; }
            if (data.last_state !== undefined) { 
              newData.statusI = data.last_state === 'IDLE';
              newData.statusP = data.last_state === 'PRESSURIZING';
              newData.statusD = data.last_state === 'DEPRESSURIZING';
              isUpdated = true; 
            }
          }

          if (isUpdated) {
            console.log(`[UI UPDATE] ${source}:`, newData);
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

  return { sensorData, rules, history, sendActuatorCommand };
};