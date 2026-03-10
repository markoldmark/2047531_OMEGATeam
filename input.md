# Mars IoT Simulator - System Definition

## 1. System Overview
The Mars IoT Simulator is a mission-critical monitoring and automation platform designed to manage the environmental, power, and life-support subsystems of a Martian habitat. The system ingests data from two primary streams:
1. **REST Sensors**: Polled or pushed data regarding scalars (temperature, humidity, pressure), chemistry (pH, VOCs), particulates, and tank levels.
2. **Telemetry Topics (Pub/Sub)**: Real-time streams via Server-Sent Events (SSE) or WebSockets covering power distribution, environmental radiation, thermal loops, and airlock status.

The core of the system is a Rule Engine that evaluates incoming normalized events against predefined thresholds to automatically trigger appropriate Actuators (fans, heaters, humidifiers, ventilation) or generate critical alerts, ensuring the survival and safety of the crew.

## 2. User Stories

### Botanist
* **US1:** As a Botanist, if the `greenhouse_temperature` rises above 32 degrees, it automatically activates the `cooling_fan`.
* **US2:** As a Botanist, if the `greenhouse_temperature` falls below 25 degrees, it automatically activates the `habitat_heater`.
* **US3:** As a Botanist, if the `water_tank_level` falls below 60%, it automatically deactivates the `entrance_humidifier`.
* **US4:** As a Botanist, if the `hydroponic_ph` rises above 9, a warning UI light is turned on to block nutrients.

### Safety Manager
* **US5:** As a Safety Manager, if the `entrance_humidity` drops below 40%, it automatically activates the `entrance_humidifier`.
* **US6:** As a Safety Manager, if the `thermal_loop` exceeds 55 degrees, it automatically activates the `cooling_fan`.
* **US7:** As a Safety Manager, if the `co2_hall` exceeds 950ppm, it automatically activates `hall_ventilation`.
* **US8:** As a Safety Manager, if the `air_quality_pm25` exceeds 35, it automatically activates `hall_ventilation`.
* **US9:** As a Safety Manager, if the `airlock` cycles exceed 10 in the same hour, a warning UI light is turned on.
* **US10:** As a Safety Manager, if the `airlock` is in DEPRESSURIZING status, it automatically disables `hall_ventilation`.

### Energy Engineer
* **US11:** As an Energy Engineer, I want to compare the power produced by the `solar_array` panels with the power consumed `power_consumption` to check that the one produced is never lower.
* **US12:** As an Energy Engineer, if the `power_consumption` exceeds 50 KW, it automatically deactivates `habitat_heater`.
* **US13:** As an Energy Engineer, if the current of the `power_bus` exceeds 220A, it automatically activates `cooling_fan`.
* **US14:** As an Energy Engineer, if the voltage of the `power_bus` exceeds 250V, it automatically activates `cooling_fan`.

### Administrator
* **US15:** As an Administrator, I want to graphically view the habitat oxygen to keep track of the trends.
* **US16:** As an Administrator, I want to monitor the `corridor_pressure` to possibly provide emergency suits.
* **US17:** As an Administrator, I want to view the status of the `airlock` to coordinate activities safely.
* **US18:** As an Administrator, I want to monitor `radiation` levels to allow the return of personnel who are outside.
* **US19:** As an Administrator, I want to be able to deactivate automation rules to take manual control.
* **US20:** As an Administrator, I want to be able to deactivate or activate any of the automation rules to take manual control over the paramaters.
* **US21:** As an Administrator, I want to track down the triggers and warnings activation in a separated tab.

## 3. Standard Event Schema
To process heterogeneous data (REST arrays, scalar objects, Telemetry streams) uniformly, all incoming data is mapped to a `Standard Event Schema` before entering the Rule Engine.

```json
{
  "type": "object",
  "required": ["event_id", "timestamp", "source_type",
                 "source_name", "measurements"],
  "properties": {
    "event_id": { 
      "type": "string", 
      "format": "uuid", 
      "description": "Unique identifier for the processed event" 
    },
    "timestamp": { 
      "type": "string", 
      "format": "date-time",
      "description": "Captured at or Event Time"
    },
    "source_type": { 
      "type": "string", 
      "enum": ["REST", "TELEMETRY"] 
    },
    "source_name": { 
      "type": "string",
      "description": "Sensor ID (e.g., 'greenhouse_temperature') 
                    or Topic Name (e.g., 'mars/telemetry/airlock')"
    },
    "measurements": {
      "type": "object",
      "description": "Key-value pairs of metrics extracted from the raw payload",
      "additionalProperties": { 
        "type": ["number", "string"] 
      }
    },
    "status": {
      "type": "string",
      "enum": ["ok", "warning"]
    }
  }
}
```

## 4. Rule Model

The Rule Model defines the configuration schema for the automation logic. The engine evaluates the condition against the Standard Event Schema. If it resolves to true, the action is executed.

```json
{
  "type": "object",
  "required": ["rule_id", "description", "is_active", "condition", "action"],
  "properties": {
    "rule_id": { "type": "string" },
    "description": { "type": "string" },
    "is_active": { "type": "boolean", "default": true },
    "condition": {
      "type": "object",
      "required": ["source_name", "metric_key", "operator", "threshold"],
      "properties": {
        "source_name": { 
          "type": "string", 
          "description": "Target sensor or topic" 
        },
        "metric_key": { 
          "type": "string", 
          "description": "The specific measurement key to check (e.g., 'temperature_c')" 
        },
        "operator": { 
          "type": "string", 
          "enum": [">", "<", "==", "!=", ">=", "<="] 
        },
        "threshold": { 
          "type": ["number", "string"], 
          "description": "Value to compare against (e.g., 35, 'DEPRESSURIZING')" 
        }
      }
    },
    "action": {
      "type": "object",
      "required": ["type", "target", "payload"],
      "properties": {
        "type": { 
          "type": "string", 
          "enum": ["ACTUATOR_COMMAND", "UI_ALERT"] 
        },
        "target": { 
          "type": "string", 
          "description": "Actuator name (e.g., 'cooling_fan') or Alert channel" 
        },
        "payload": { 
          "type": "string", 
          "description": "The command state ('ON', 'OFF') or the alert message" 
        }
      }
    }
  }
}
```