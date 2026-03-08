import { useState, useEffect } from 'react';

export const useRules = (backendRules = []) => {
  const [rules, setRules] = useState([]);

  // Quando arrivano o cambiano le regole dal DB, le mappiamo per la UI
  useEffect(() => {
    const mappedRules = backendRules
      // Opzionale: filtra gli alert di sistema se non vuoi che appaiano tra le regole degli attuatori
      .filter(r => r.action_type !== 'UI_ALERT') 
      .map(r => ({
        id: r.rule_id,               // Il DB usa rule_id come identificativo testuale
        sensor: r.source_name,       // Il sensore sorgente
        operator: r.operator,        // L'operatore (<, >, =)
        value: r.threshold,          // Il valore soglia
        actuator: r.target,          // main.py chiama l'attuatore "target"
        action: r.payload            // main.py chiama lo stato dell'attuatore "payload"
      }));

    setRules(mappedRules);
  }, [backendRules]);

  // Funzione per salvare (creare o aggiornare)
  const handleSaveRule = (newRule) => {
    // Aggiornamento ottimistico dell'UI
    setRules(prevRules => {
      const exists = prevRules.find(r => r.id === newRule.id);
      if (exists) {
        return prevRules.map(r => r.id === newRule.id ? newRule : r);
      }
      return [...prevRules, newRule];
    });
    
    // TODO: Qui farai fetch('/api/rules', { method: 'POST', body: JSON.stringify({...}) })
    console.log("Regola pronta per il backend:", newRule);
  };

  // Funzione per eliminare
  const handleDeleteRule = (idToDelete) => {
    // Aggiornamento ottimistico dell'UI
    setRules(prevRules => prevRules.filter(r => r.id !== idToDelete));
    
    // TODO: Qui farai fetch(`/api/rules/${idToDelete}`, { method: 'DELETE' })
    console.log("Regola eliminata lato UI, ID:", idToDelete);
  };

  return { rules, handleSaveRule, handleDeleteRule };
};