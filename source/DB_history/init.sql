

CREATE TABLE IF NOT EXISTS automation_rules (
    id SERIAL PRIMARY KEY,
    sensor_name VARCHAR(100) NOT NULL,
    
    -- Operatori consentiti dalle specifiche
    operator VARCHAR(2) NOT NULL CHECK (operator IN ('<', '<=', '=', '>', '>=')),
    
    -- Valore soglia (usiamo NUMERIC per supportare sia interi che decimali)
    threshold_value NUMERIC NOT NULL,
    
    -- L'unità di misura è opzionale secondo le specifiche
    unit VARCHAR(20),
    
    actuator_name VARCHAR(100) NOT NULL,
    
    -- Lo stato dell'attuatore può essere solo ON o OFF
    actuator_state VARCHAR(3) NOT NULL CHECK (actuator_state IN ('ON', 'OFF')),
    
    -- Data di creazione utile per log e debug
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO automation_rules (sensor_name, operator, threshold_value, unit, actuator_name, actuator_state)
VALUES ('greenhouse_temperature', '>', 28, '°C', 'cooling_fan', 'ON');