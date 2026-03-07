// services/actuatorService.js

const actuatorIdMap = {
  coolingFan: 'cooling_fan',
  entranceHumidifier: 'entrance_humidifier',
  hallVentilation: 'hall_ventilation',
  habitatHeater: 'habitat_heater',
};

// Modifica l'URL in base alla porta su cui gira il tuo main.py (Presentation)
const PRESENTATION_URL = "http://localhost:8000"; 

export const sendActuatorCommand = async (actuatorName, isCurrentlyOn) => {
  const actuatorId = actuatorIdMap[actuatorName];
  const newState = !isCurrentlyOn;
  const commandState = newState ? "ON" : "OFF";

  try {
    const response = await fetch(`${PRESENTATION_URL}/api/commands/actuators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actuator_id: actuatorId,
        state: commandState
      }),
    });

    if (!response.ok) {
      throw new Error(`Errore HTTP: ${response.status}`);
    }

    console.log(`Comando inviato a Presentation: ${actuatorId} -> ${commandState}`);
    return newState; // Ritorna il nuovo stato se ha successo

  } catch (error) {
    console.error("Errore nell'invio del comando:", error);
    throw error; // Rilancia l'errore per gestirlo nel componente
  }
};