import { useState } from 'react';

export const useRules = () => {
  // STATO PER LE REGOLE (Inizializzato con una regola di esempio)
  const [rules, setRules] = useState([
    {
      id: 1,
      sensor: 'greenhouse_temperature',
      operator: '>',
      value: '28',
      actuator: 'cooling_fan',
      action: 'ON'
    }
  ]);

  // Funzione per salvare (creare o aggiornare) una regola
  const handleSaveRule = (newRule) => {
    setRules(prevRules => {
      // Se la regola esiste già (stesso id), aggiornala
      const exists = prevRules.find(r => r.id === newRule.id);
      if (exists) {
        return prevRules.map(r => r.id === newRule.id ? newRule : r);
      }
      // Altrimenti aggiungila alla lista
      return [...prevRules, newRule];
    });
    
    // TODO: In futuro qui farai la chiamata API (es. fetch) per salvare nel DB
    console.log("Regola salvata nel DB fittizio:", newRule);
  };

  // Funzione per eliminare una regola
  const handleDeleteRule = (idToDelete) => {
    setRules(prevRules => prevRules.filter(r => r.id !== idToDelete));
    
    // TODO: In futuro qui farai la chiamata API DELETE verso il backend
    console.log("Regola eliminata dal DB fittizio, ID:", idToDelete);
  };

  // Restituiamo lo stato e le funzioni per poterle usare nel componente
  return { rules, handleSaveRule, handleDeleteRule };
};