export const CONDITION_OPTIONS = [
  { key: 'greenhouse_temperature::value', sourceName: 'greenhouse_temperature', metricKey: 'value', label: 'Greenhouse Temperature', valueType: 'number' },
  { key: 'entrance_humidity::value', sourceName: 'entrance_humidity', metricKey: 'value', label: 'Entrance Humidity', valueType: 'number' },
  { key: 'co2_hall::value', sourceName: 'co2_hall', metricKey: 'value', label: 'CO2 Hall', valueType: 'number' },
  { key: 'hydroponic_ph::ph', sourceName: 'hydroponic_ph', metricKey: 'ph', label: 'Hydroponic pH', valueType: 'number' },
  { key: 'water_tank_level::level_pct', sourceName: 'water_tank_level', metricKey: 'level_pct', label: 'Water Tank Level', valueType: 'number' },
  { key: 'corridor_pressure::value', sourceName: 'corridor_pressure', metricKey: 'value', label: 'Corridor Pressure', valueType: 'number' },
  { key: 'air_quality_pm25::pm25_ug_m3', sourceName: 'air_quality_pm25', metricKey: 'pm25_ug_m3', label: 'Air Quality PM2.5', valueType: 'number' },
  { key: 'air_quality_voc::voc_ppb', sourceName: 'air_quality_voc', metricKey: 'voc_ppb', label: 'Air Quality VOC', valueType: 'number' },
  { key: 'mars/telemetry/thermal_loop::temperature_c', sourceName: 'mars/telemetry/thermal_loop', metricKey: 'temperature_c', label: 'Thermal Loop Temperature', valueType: 'number' },
  { key: 'mars/telemetry/power_consumption::power_kw', sourceName: 'mars/telemetry/power_consumption', metricKey: 'power_kw', label: 'Power Consumption', valueType: 'number' },
  { key: 'mars/telemetry/power_bus::current_a', sourceName: 'mars/telemetry/power_bus', metricKey: 'current_a', label: 'Power Bus Current', valueType: 'number' },
  { key: 'mars/telemetry/power_bus::voltage_v', sourceName: 'mars/telemetry/power_bus', metricKey: 'voltage_v', label: 'Power Bus Voltage', valueType: 'number' },
  { key: 'mars/telemetry/airlock::cycles_per_hour', sourceName: 'mars/telemetry/airlock', metricKey: 'cycles_per_hour', label: 'Airlock Cycles Per Hour', valueType: 'number' },
  { key: 'mars/telemetry/airlock::last_state', sourceName: 'mars/telemetry/airlock', metricKey: 'last_state', label: 'Airlock Status', valueType: 'text' },
];

export const ACTUATOR_OPTIONS = [
  { id: 'cooling_fan', label: 'Cooling Fan' },
  { id: 'entrance_humidifier', label: 'Entrance Humidifier' },
  { id: 'hall_ventilation', label: 'Hall Ventilation' },
  { id: 'habitat_heater', label: 'Habitat Heater' },
];

export const OPERATOR_OPTIONS = ['<', '<=', '=', '>', '>='];

export const buildConditionKey = (sourceName, metricKey) => `${sourceName}::${metricKey}`;

export const getConditionConfig = (conditionKey) =>
  CONDITION_OPTIONS.find((option) => option.key === conditionKey);

export const getConditionConfigFromRule = (rule) =>
  getConditionConfig(buildConditionKey(rule.source_name, rule.metric_key));
