DROP TABLE IF EXISTS automation_rules;

CREATE TABLE automation_rules (
    id SERIAL PRIMARY KEY,
    rule_id VARCHAR(50) UNIQUE NOT NULL, -- Identificativo UUID o stringa
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Condizione
    source_name VARCHAR(100) NOT NULL, -- Es: greenhouse_temperature
    metric_key VARCHAR(50) NOT NULL,   -- Es: value, pm25_ug_m3
    operator VARCHAR(2) NOT NULL CHECK (operator IN ('>', '<', '=', '==', '>=', '<=')),
    threshold VARCHAR(50) NOT NULL,    -- Salvato come stringa per supportare stati tipo 'DEPRESSURIZING'
    
    -- Azione
    action_type VARCHAR(20) NOT NULL CHECK (action_type = 'ACTUATOR_COMMAND'),
    target VARCHAR(100) NOT NULL,
    payload VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Regole automatiche persistenti allineate alle user stories
INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_001', 'US1 - Raffredda la serra oltre 32C', 'greenhouse_temperature', 'value', '>', '32', 'ACTUATOR_COMMAND', 'cooling_fan', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_002', 'US2 - Riscalda la serra sotto 25C', 'greenhouse_temperature', 'value', '<', '25', 'ACTUATOR_COMMAND', 'habitat_heater', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_003', 'US3 - Disattiva umidificatore con acqua sotto 60%', 'water_tank_level', 'level_pct', '<', '60', 'ACTUATOR_COMMAND', 'entrance_humidifier', 'OFF');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_004', 'US5 - Attiva umidificatore con umidita ingresso sotto 40%', 'entrance_humidity', 'value', '<', '40', 'ACTUATOR_COMMAND', 'entrance_humidifier', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_005', 'US6 - Raffredda oltre 55C nel thermal loop', 'mars/telemetry/thermal_loop', 'temperature_c', '>', '55', 'ACTUATOR_COMMAND', 'cooling_fan', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_006', 'US7 - Ventila il corridoio oltre 950 ppm di CO2', 'co2_hall', 'value', '>', '950', 'ACTUATOR_COMMAND', 'hall_ventilation', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_007', 'US8 - Ventila il corridoio oltre 35 ug/m3 di PM2.5', 'air_quality_pm25', 'pm25_ug_m3', '>', '35', 'ACTUATOR_COMMAND', 'hall_ventilation', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_008', 'US10 - Spegne ventilazione con airlock in depressurizzazione', 'mars/telemetry/airlock', 'last_state', '=', 'DEPRESSURIZING', 'ACTUATOR_COMMAND', 'hall_ventilation', 'OFF');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_009', 'US12 - Spegne habitat heater oltre 50 kW', 'mars/telemetry/power_consumption', 'power_kw', '>', '50', 'ACTUATOR_COMMAND', 'habitat_heater', 'OFF');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_010', 'US13 - Raffredda oltre 220A sul power bus', 'mars/telemetry/power_bus', 'current_a', '>', '220', 'ACTUATOR_COMMAND', 'cooling_fan', 'ON');

INSERT INTO automation_rules (rule_id, description, source_name, metric_key, operator, threshold, action_type, target, payload)
VALUES ('rule_011', 'US14 - Raffredda oltre 250V sul power bus', 'mars/telemetry/power_bus', 'voltage_v', '>', '250', 'ACTUATOR_COMMAND', 'cooling_fan', 'ON');