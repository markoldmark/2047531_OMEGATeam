import { useState, useEffect } from 'react';
import { buildConditionKey, getConditionConfigFromRule } from './ruleConfig';

// Sostituisci con l'URL base del tuo backend Presentation (es. se gira su localhost:8000)
const API_BASE_URL = 'http://localhost:8000'; 

export const useRules = (backendRules = []) => {
  const [rules, setRules] = useState([]);

  // Quando arrivano o cambiano le regole dal DB, le mappiamo per la UI
  useEffect(() => {
    const mappedRules = backendRules
      .filter(r => r.action_type !== 'UI_ALERT') 
      .map(r => ({
        id: r.rule_id,               // Il DB usa rule_id
        conditionKey: buildConditionKey(r.source_name, r.metric_key),
        operator: r.operator,
        value: r.threshold,
        actuator: r.target,
        action: r.payload,
        isActive: r.is_active,
        conditionLabel: getConditionConfigFromRule(r)?.label ?? `${r.source_name} (${r.metric_key})`
      }));

    setRules(mappedRules);
  }, [backendRules]);

  // Gestione Salvataggio (Creazione / Modifica)
  const handleSaveRule = async (newRuleForm) => {
    // 1. Assicuriamoci che l'ID sia una stringa come richiesto dal DB (es. "rule_171000000")
    const ruleId = typeof newRuleForm.id === 'number' ? `rule_${newRuleForm.id}` : newRuleForm.id;
    const [sourceName, metricKey] = newRuleForm.conditionKey.split('::');

    // 2. Prepariamo il payload per il backend (RuleSchema)
    const payload = {
      rule_id: ruleId,
      description: `Auto Rule: ${sourceName} (${metricKey}) -> ${newRuleForm.actuator}`,
      source_name: sourceName,
      metric_key: metricKey,
      operator: newRuleForm.operator,
      threshold: newRuleForm.value.toString(), // Il DB lo vuole come stringa
      action_type: "ACTUATOR_COMMAND",
      target: newRuleForm.actuator,
      payload: newRuleForm.action,
      is_active: newRuleForm.isActive ?? true
    };

    try {
      // Se è una modifica e il backend non supporta l'aggiornamento (PUT) dell'intera regola, 
      // in un hackathon l'approccio più rapido è eliminare la vecchia e creare la nuova!
      const isEditing = typeof newRuleForm.id !== 'number'; 
      if (isEditing) {
        await fetch(`${API_BASE_URL}/api/rules/${newRuleForm.id}`, { method: 'DELETE' });
      }

      // 3. Facciamo la chiamata POST per creare la regola
      const response = await fetch(`${API_BASE_URL}/api/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // 4. Aggiornamento ottimistico dell'UI
        setRules(prevRules => {
          const exists = prevRules.find(r => r.id === ruleId);
          const uiRule = { ...newRuleForm, id: ruleId, isActive: newRuleForm.isActive ?? true };
          
          if (exists) {
            return prevRules.map(r => r.id === ruleId ? uiRule : r);
          }
          return [...prevRules, uiRule];
        });
        console.log("Regola salvata con successo sul DB!");
      } else {
        console.error("Errore dal backend:", await response.text());
      }
    } catch (error) {
      console.error("Errore di rete durante il salvataggio:", error);
    }
  };

  // Funzione per eliminare
  const handleDeleteRule = async (idToDelete) => {
    try {
      // Chiamata al backend per eliminare
      const response = await fetch(`${API_BASE_URL}/api/rules/${idToDelete}`, { 
        method: 'DELETE' 
      });

      if (response.ok) {
        // Aggiornamento dell'UI
        setRules(prevRules => prevRules.filter(r => r.id !== idToDelete));
        console.log(`Regola ${idToDelete} eliminata con successo.`);
      } else {
        console.error("Errore durante l'eliminazione:", await response.text());
      }
    } catch (error) {
      console.error("Errore di rete durante l'eliminazione:", error);
    }
  };

  const handleToggleRule = async (idToToggle, isActive) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rules/${idToToggle}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        setRules(prevRules =>
          prevRules.map(rule =>
            rule.id === idToToggle ? { ...rule, isActive } : rule
          )
        );
      } else {
        console.error("Errore durante il toggle della regola:", await response.text());
      }
    } catch (error) {
      console.error("Errore di rete durante il toggle della regola:", error);
    }
  };

  return { rules, handleSaveRule, handleDeleteRule, handleToggleRule };
};