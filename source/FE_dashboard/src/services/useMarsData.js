import { useState, useEffect, useRef } from 'react';

export const useMarsData = () => {
  const [sensorData, setSensorData] = useState({
    greenhouse_temp: 0,
    water_level: 0,
    ph: 7.0,
    co2: 0,
    radiation: 0,
    power: 0
  });
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);

  // Usiamo un Ref per capire se il WebSocket è già in fase di apertura
  const socketRef = useRef(null);

  const loadRulesAndHistory = async () => {
    try {
      const [rulesResponse, historyResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/rules'),
        fetch('http://127.0.0.1:8000/api/history')
      ]);

      if (rulesResponse.ok) {
        setRules(await rulesResponse.json());
      }

      if (historyResponse.ok) {
        setHistory(await historyResponse.json());
      }
    } catch (error) {
      console.error('Errore caricamento rules/history:', error);
    }
  };

  const sendActuatorCommand = async (actuatorName, state) => {
    const response = await fetch(`http://127.0.0.1:8000/api/actuators/${actuatorName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Errore comando attuatore');
    }

    return response.json();
  };

  useEffect(() => {
    // Se esiste già una connessione, non fare nulla (evita il doppio avvio di React 18)
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        return;
    }

    console.log("Tentativo di connessione a Marte...");
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    socketRef.current = ws;
    const initialLoadId = setTimeout(() => {
      loadRulesAndHistory();
    }, 0);

    const pollId = setInterval(() => {
      loadRulesAndHistory();
    }, 5000);

    ws.onopen = () => {
      console.log('✅ Connesso a Marte con successo!');
    };

   ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'INIT_STATE') {
        const cache = message.data;

        // Funzione di supporto per estrarre in modo sicuro dalla cache iniziale
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
          power: getInitVal('mars/telemetry/power_consumption', d => d.power_kw) ?? getInitVal('mars/telemetry/power_bus', d => d.power_kw) ?? prev.power
        }));
      } 
      else if (message.source_name) {
        const source = message.source_name;
        // Nel tuo backend, 'measurements' contiene l'intero payload inviato dal simulatore
        const data = message.measurements; 

        setSensorData(prev => {
          const newData = { ...prev };
          let isUpdated = false;

          // Helper per cercare una specifica metrica negli array (chimica e ambiente)
          const getMetric = (arr, metricStr) => {
            if (!arr || !Array.isArray(arr)) return null;
            const item = arr.find(m => m.metric && m.metric.toLowerCase().includes(metricStr));
            return item ? item.value : null;
          };

          // --- MAPPATURA ESATTA BASATA SUI CONTRATTI ---

          // rest.scalar.v1 (ha la proprietà 'value')
          if (source === 'greenhouse_temperature') {
            if (data.value !== undefined) { newData.greenhouse_temp = data.value; isUpdated = true; }
          }
          else if (source === 'co2_hall') {
            if (data.value !== undefined) { newData.co2 = data.value; isUpdated = true; }
          }
          
          // rest.level.v1 (ha la proprietà 'level_pct')
          else if (source === 'water_tank_level') {
            if (data.level_pct !== undefined) { newData.water_level = data.level_pct; isUpdated = true; }
          }
          
          // rest.chemistry.v1 (array 'measurements')
          else if (source === 'hydroponic_ph') {
            const val = getMetric(data.measurements, 'ph');
            if (val !== null) { newData.ph = val; isUpdated = true; }
          }
          
          // topic.environment.v1 (array 'measurements')
          else if (source === 'mars/telemetry/life_support') {
            const val = getMetric(data.measurements, 'co2'); // Cerchiamo 'co2' nella metrica
            if (val !== null) { newData.co2 = val; isUpdated = true; }
          }
          else if (source === 'mars/telemetry/radiation') {
            const val = getMetric(data.measurements, 'radiation'); // Cerchiamo 'radiation' nella metrica
            if (val !== null) { newData.radiation = val; isUpdated = true; }
          }
          
          // topic.power.v1 (ha la proprietà 'power_kw')
          else if (source === 'mars/telemetry/power_consumption' || source === 'mars/telemetry/power_bus') {
            if (data.power_kw !== undefined) { newData.power = data.power_kw; isUpdated = true; }
          }

          if (isUpdated) {
            console.log(`[UI UPDATE] ${source}:`, newData);
            return newData; // Riavvia il render di React
          }

          return prev; // Nessun re-render se non è cambiato nulla
        });
      }
    };

    ws.onerror = (err) => console.error("Errore WS React:", err);
    
    ws.onclose = () => {
      console.log('❌ Connessione chiusa');
      socketRef.current = null;
    };

    // Pulizia: chiudiamo solo se il componente viene davvero rimosso
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