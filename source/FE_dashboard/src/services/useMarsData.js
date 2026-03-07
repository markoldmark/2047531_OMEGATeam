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

  // Usiamo un Ref per capire se il WebSocket è già in fase di apertura
  const socketRef = useRef(null);

  useEffect(() => {
    // Se esiste già una connessione, non fare nulla (evita il doppio avvio di React 18)
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        return;
    }

    console.log("Tentativo di connessione a Marte...");
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/stream');
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connesso a Marte con successo!');
    };

   ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'INIT_STATE') {
        const cache = message.data;
        setSensorData(prev => ({
          ...prev,
          greenhouse_temp: cache['greenhouse_temperature']?.measurements?.value ?? prev.greenhouse_temp,
          water_level: cache['water_tank_level']?.measurements[0]?.value ?? prev.water_level,
          ph: cache['hydroponic_ph']?.measurements?.value ?? prev.ph,
          // Aggiunto supporto per life_support
          co2: cache['co2_hall']?.measurements?.value ?? cache['mars/telemetry/life_support']?.measurements?.co2_level ?? prev.co2,
          radiation: cache['mars/telemetry/radiation']?.measurements?.radiation_level ?? prev.radiation,
          // Aggiunto supporto per power_bus
          power: cache['mars/telemetry/power_consumption']?.measurements?.power_kw ?? cache['mars/telemetry/power_bus']?.measurements?.power_kw ?? prev.power
        }));
      } 
      else if (message.source_name) {
        const source = message.source_name;
        const data = message.measurements;

        setSensorData(prev => {
          const newData = { ...prev };
          let isUpdated = false;

          // HELPER INTELLIGENTE: Cerca il valore sia negli array annidati che negli oggetti piatti
          const extractValue = (obj, metricName) => {
            // Se c'è un array "measurements" (come per il pH o la CO2)
            if (obj.measurements && Array.isArray(obj.measurements)) {
               // Cerca l'oggetto con la metrica giusta, o prendi il primo di default
               const item = obj.measurements.find(m => m.metric === metricName) || obj.measurements[0];
               return item ? item.value : null;
            }
            // Altrimenti cerca la proprietà diretta (come per la temperatura)
            return obj.value ?? obj[metricName] ?? null;
          };

          // Applichiamo l'helper per estrarre i dati in modo sicuro
          if (source === 'greenhouse_temperature') {
            const val = extractValue(data, 'temperature');
            if (val !== null) { newData.greenhouse_temp = val; isUpdated = true; }
          }
          if (source === 'water_tank_level') {
            const val = extractValue(data, 'level');
            if (val !== null) { newData.water_level = val; isUpdated = true; }
          }
          if (source === 'hydroponic_ph') {
            const val = extractValue(data, 'ph');
            if (val !== null) { newData.ph = val; isUpdated = true; }
          }
          if (source === 'co2_hall' || source === 'mars/telemetry/life_support') {
            const val = extractValue(data, 'co2_level') ?? extractValue(data, 'co2');
            if (val !== null) { newData.co2 = val; isUpdated = true; }
          }
          if (source === 'mars/telemetry/radiation') {
            const val = extractValue(data, 'radiation_level') ?? extractValue(data, 'radiation');
            if (val !== null) { newData.radiation = val; isUpdated = true; }
          }
          if (source === 'mars/telemetry/power_consumption' || source === 'mars/telemetry/power_bus') {
            const val = extractValue(data, 'power_kw') ?? extractValue(data, 'power');
            if (val !== null) { newData.power = val; isUpdated = true; }
          }

          if (isUpdated) {
            console.log(`[UI UPDATE] ${source}: ${JSON.stringify(newData)}`);
            return newData; // Aggiorna lo stato di React
          }

          return prev; // Se non ha trovato nulla da aggiornare, non re-renderizza
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
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
      }
      socketRef.current = null;
    };
  }, []);

  return sensorData;
};