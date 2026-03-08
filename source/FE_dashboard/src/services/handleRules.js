import { useState, useEffect } from 'react';
import { buildConditionKey, getConditionConfigFromRule } from './ruleConfig';

const API_BASE_URL = 'http://localhost:8000';

export const useRules = (backendRules = []) => {
  const [rules, setRules] = useState([]);

  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/system/mode`)
      .then(res => res.json())
      .then(data => setIsAuto(data.mode === 'AUTO'))
      .catch(err => console.error("Errore nel recupero della modalità:", err));
  }, []);

  useEffect(() => {
    const mappedRules = backendRules
      .filter(r => r.action_type !== 'UI_ALERT') 
      .map(r => ({
        id: r.rule_id,
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

  const handleModeToggle = async () => {
    const currentMode = isAuto ? 'AUTO' : 'MANUAL';
    const nextMode = isAuto ? 'MANUAL' : 'AUTO';
    
    console.log(`🔄 Cambio richiesto: da ${currentMode} a ${nextMode}`);

    setIsAuto(!isAuto);

    try {
      const response = await fetch(`${API_BASE_URL}/api/system/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode })
      });

      if (!response.ok) {
        throw new Error(`Errore Server: ${response.status}`);
      }
      
      const data = await response.json();
     
      setIsAuto(data.mode === 'AUTO');
      
    } catch (error) {
      console.error("🚨 Chiamata fallita:", error);
      setIsAuto(currentMode === 'AUTO'); 
    }
  };

  const handleSaveRule = async (newRuleForm) => {
    const ruleId = typeof newRuleForm.id === 'number' ? `rule_${newRuleForm.id}` : newRuleForm.id;
    const [sourceName, metricKey] = newRuleForm.conditionKey.split('::');

    const payload = {
      rule_id: ruleId,
      description: `Auto Rule: ${sourceName} (${metricKey}) -> ${newRuleForm.actuator}`,
      source_name: sourceName,
      metric_key: metricKey,
      operator: newRuleForm.operator,
      threshold: newRuleForm.value.toString(),
      action_type: "ACTUATOR_COMMAND",
      target: newRuleForm.actuator,
      payload: newRuleForm.action,
      is_active: newRuleForm.isActive ?? true
    };

    try {
      const isEditing = typeof newRuleForm.id !== 'number'; 
      if (isEditing) {
        await fetch(`${API_BASE_URL}/api/rules/${newRuleForm.id}`, { method: 'DELETE' });
      }

      const response = await fetch(`${API_BASE_URL}/api/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
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

  const handleDeleteRule = async (idToDelete) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rules/${idToDelete}`, { 
        method: 'DELETE' 
      });

      if (response.ok) {
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

  return { rules, handleSaveRule, handleDeleteRule, handleToggleRule, isAuto, handleModeToggle };
};