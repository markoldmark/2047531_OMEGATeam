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
    if (socketRef.current) return;

    console.log("Tentativo di connessione a Marte...");
    const ws = new WebSocket(`ws://${window.location.host}/ws/stream`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connesso a Marte con successo!');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Log per debug: se vedi questo, i dati sono arrivati a React!
      console.log("Dato ricevuto nel componente:", message);

      if (message.type === 'INIT_STATE') {
        const cache = message.data;
        setSensorData(prev => ({
          ...prev,
          greenhouse_temp: cache['greenhouse_temperature']?.measurements?.value ?? prev.greenhouse_temp,
          water_level: cache['water_tank_level']?.measurements?.value ?? prev.water_level,
          ph: cache['hydroponic_ph']?.measurements?.value ?? prev.ph,
          co2: cache['co2_hall']?.measurements?.value ?? prev.co2,
          radiation: cache['mars/telemetry/radiation']?.measurements?.radiation_level ?? prev.radiation,
          power: cache['mars/telemetry/power_consumption']?.measurements?.power_kw ?? prev.power
        }));
      } 
      else if (message.source_name) {
        const source = message.source_name;
        const data = message.measurements;

        setSensorData(prev => {
          const newData = { ...prev };
          if (source === 'greenhouse_temperature') newData.greenhouse_temp = data.value;
          if (source === 'water_tank_level') newData.water_level = data.value;
          if (source === 'hydroponic_ph') newData.ph = data.value;
          if (source === 'co2_hall') newData.co2 = data.value;
          if (source === 'mars/telemetry/radiation') newData.radiation = data.radiation_level;
          if (source === 'mars/telemetry/power_consumption') newData.power = data.power_kw;
          return newData;
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
    };
  }, []);

  return sensorData;
};