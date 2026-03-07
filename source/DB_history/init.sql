DROP TABLE IF EXISTS automation_rules;

CREATE TABLE automation_rules (
    id SERIAL PRIMARY KEY,
    rule_id VARCHAR(50) UNIQUE NOT NULL, -- Identificativo UUID o stringa
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Condizione
    source_name VARCHAR(100) NOT NULL, -- Es: greenhouse_temperature
    metric_key VARCHAR(50) NOT NULL,   -- Es: value, pm25_ug_m3
    operator VARCHAR(2) NOT NULL CHECK (operator IN ('>', '<', '==', '>=', '<=')),
    threshold VARCHAR(50) NOT NULL,    -- Salvato come stringa per supportare stati tipo 'DEPRESSURIZING'
    
    -- Azione
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('ACTUATOR_COMMAND', 'UI_ALERT')),
    target VARCHAR(100) NOT NULL,
    payload VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Esempio di regola iniziale coerente con le US
INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_001', 'Raffreddamento Serra', 'greenhouse_temperature', 'value', '>', '28', 'ACTUATOR_COMMAND', 'cooling_fan', 'ON');
INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_002', 'Raffreddamento Serra', 'greenhouse_temperature', 'value', '>', '5', 'UI_ALERT', 'habitat_heater', 'ON');