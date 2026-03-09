# SYSTEM DESCRIPTION

Mars IoT Simulator is a distributed monitoring and automation platform for the management of a Martian habitat. The system acquires heterogeneous data from REST sensors and telemetry streams, normalizes them into a common internal format, distributes them through an event-driven backbone, evaluates automation rules, and exposes a real-time dashboard for operators.

The current implementation is structured around a small set of clearly separated services:
- `be_ingestion` collects and normalizes telemetry from `simulator`.
- `be_processing` evaluates automation rules and triggers actuators.
- `be_presentation` exposes the system state to `frontend` and manages frontend-oriented runtime state.
- `rabbitmq` provides asynchronous communication between backend services.
- `db` stores automation rules.
- `frontend` provides monitoring, rule management, trigger history, and manual override.

The system supports both automatic control and manual intervention. In `AUTO` mode, active rules are evaluated continuously; in `MANUAL` mode, the operator can suspend automation and directly control actuators from the dashboard.

---

# USER STORIES

## Botanist
1. As a Botanist, if the `greenhouse_temperature` rises above 32 degrees, it automatically activates the `cooling_fan`.
2. As a Botanist, if the `greenhouse_temperature` falls below 25 degrees, it automatically activates the `habitat_heater`.
3. As a Botanist, if the `water_tank_level` falls below 60%, it automatically deactivates the `entrance_humidifier`.
4. As a Botanist, if the `hydroponic_ph` rises above 9, a warning UI light is turned on to block nutrients.

## Safety Manager
5. As a Safety Manager, if the `entrance_humidity` drops below 40%, it automatically activates the `entrance_humidifier`.
6. As a Safety Manager, if the `thermal_loop` exceeds 55 degrees, it automatically activates the `cooling_fan`.
7. As a Safety Manager, if the `co2_hall` exceeds 950 ppm, it automatically activates `hall_ventilation`.
8. As a Safety Manager, if the `air_quality_pm25` exceeds 35, it automatically activates `hall_ventilation`.
9. As a Safety Manager, if the `airlock` cycles exceed 10 in the same hour, a warning UI light is turned on.
10. As a Safety Manager, if the `airlock` is in `DEPRESSURIZING` status, it automatically disables `hall_ventilation`.

## Energy Engineer
11. As an Energy Engineer, I want to compare the power produced by the `solar_array` panels with the power consumed in `power_consumption`.
12. As an Energy Engineer, if the `power_consumption` exceeds 50 KW, it automatically deactivates `habitat_heater`.
13. As an Energy Engineer, if the current of the `power_bus` exceeds 220A, it automatically activates `cooling_fan`.
14. As an Energy Engineer, if the voltage of the `power_bus` exceeds 250V, it automatically activates `cooling_fan`.

## Administrator
15. As an Administrator, I want to graphically view habitat parameters and visual alarm indicators.
16. As an Administrator, I want to see the history of recent triggers during the current session.
17. As an Administrator, I want to monitor the `corridor_pressure`.
18. As an Administrator, I want to view the status of the `airlock`.
19. As an Administrator, I want to monitor `radiation` levels.
20. As an Administrator, I want to deactivate or reactivate automation rules and switch between automatic and manual control.

---

# CONTAINERS

## CONTAINER_NAME: simulator

### DESCRIPTION
External Mars habitat simulator used as the source of telemetry and the target of actuator commands for the whole platform.

### USER STORIES
Supports all user stories indirectly, because it provides the raw operational environment for the whole system.

### PORTS
`8080:8080`

### PERSISTENCE EVALUATION
Persistence is external to the project and not managed by our application.

### EXTERNAL SERVICES CONNECTIONS
None from the project point of view; it is itself the external dependency.

### MICROSERVICES

#### MICROSERVICE: simulator
- TYPE: external service
- DESCRIPTION: Provides REST sensors, telemetry WebSocket streams, and actuator REST endpoints.
- PORTS: `8080`

---

## CONTAINER_NAME: be_ingestion

### DESCRIPTION
Collects telemetry from `simulator`, normalizes heterogeneous payloads, and publishes internal events to `rabbitmq`.

### USER STORIES
15, 17, 18, 19 and, indirectly, all rule-based user stories because every automation decision depends on incoming telemetry.

### PORTS
No host port is exposed in the current `docker-compose` configuration.

### PERSISTENCE EVALUATION
The container does not require persistence. Its role is transient data acquisition and normalization.

### EXTERNAL SERVICES CONNECTIONS
Connects to `simulator` through:
- REST sensor endpoints
- WebSocket telemetry stream at `ws://simulator:8080/api/telemetry/ws`

### MICROSERVICES

#### MICROSERVICE: be_ingestion
- TYPE: backend
- DESCRIPTION: Subscribes to telemetry topics, normalizes events, and publishes them to `rabbitmq`.
- TECHNOLOGICAL SPECIFICATION:
  - Python
  - `websockets`
  - `aio-pika`
- SERVICE ARCHITECTURE:
  - one ingestion flow per telemetry topic
  - normalization into a standard internal event
  - fanout publish to `mars_events`

---

## CONTAINER_NAME: rabbitmq

### DESCRIPTION
Provides the internal event-driven communication backbone.

### USER STORIES
Supports all rule-based and monitoring stories by decoupling ingestion, processing, and presentation.

### PORTS
- `5672:5672`
- `15672:15672`

### PERSISTENCE EVALUATION
Messages are transient runtime data. Delivery durability depends on the broker configuration, but the project does not use the broker as business-data persistence.

### EXTERNAL SERVICES CONNECTIONS
None.

### MICROSERVICES

#### MICROSERVICE: rabbitmq
- TYPE: middleware
- DESCRIPTION: Fanout broker distributing telemetry events, trigger events, and rule-update notifications.
- PORTS: `5672`, `15672`

---

## CONTAINER_NAME: be_processing

### DESCRIPTION
Consumes normalized events, evaluates active rules, triggers actuators, and emits rule-trigger events.

### USER STORIES
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 20

### PORTS
No host port is exposed in the current `docker-compose` configuration.

### PERSISTENCE EVALUATION
This container does not persist its runtime state. It reads automation rules from `db` and keeps them cached in memory during execution.

### EXTERNAL SERVICES CONNECTIONS
Connects to:
- `rabbitmq` for event consumption and trigger publication
- `db` for rule loading
- `simulator` actuator endpoints via REST

### MICROSERVICES

#### MICROSERVICE: be_processing
- TYPE: backend
- DESCRIPTION: Core rule engine of the platform.
- TECHNOLOGICAL SPECIFICATION:
  - Python
  - `aio-pika`
  - `httpx`
  - `psycopg2`
- SERVICE ARCHITECTURE:
  - keeps an in-memory cache of active rules
  - evaluates conditions against incoming normalized measurements
  - triggers only on `false -> true` transitions using in-memory deduplication state
  - publishes `RULE_TRIGGER` events to `rabbitmq`
- BUSINESS ROLE:
  - executes `ACTUATOR_COMMAND` rules
  - currently also emits trigger events for active `UI_ALERT` rules when their conditions are met

---

## CONTAINER_NAME: be_presentation

### DESCRIPTION
Acts as the frontend-facing service. It exposes live state, rules, actuator APIs, action history, AUTO/MANUAL mode, and WebSocket updates to `frontend`.

### USER STORIES
4, 9, 15, 16, 17, 18, 19, 20

### PORTS
`8000:8000`

### PERSISTENCE EVALUATION
This service mixes persistent and volatile data:
- persistent rules are stored in `db` and exposed through the API
- live sensor state is cached in memory
- trigger history is volatile and limited to the latest 20 events
- system mode is runtime-only

### EXTERNAL SERVICES CONNECTIONS
Connects to:
- `rabbitmq` for telemetry and trigger events
- `db` for rule CRUD
- `simulator` for actuator state and manual override

### MICROSERVICES

#### MICROSERVICE: be_presentation
- TYPE: backend
- DESCRIPTION: Presentation/API layer between `frontend` and the internal services.
- TECHNOLOGICAL SPECIFICATION:
  - Python
  - FastAPI
  - `aio-pika`
  - `psycopg2`
- SERVICE ARCHITECTURE:
  - stores `latest_state_cache` in memory
  - stores `rule_history_cache` in memory with max length 20
  - exposes REST APIs and a WebSocket stream
  - handles AUTO/MANUAL mode and temporary rule suspension during manual control
- MAIN ENDPOINTS:
  - `GET /api/state`
  - `GET /api/rules`
  - `POST /api/rules`
  - `PATCH /api/rules/{rule_id}`
  - `DELETE /api/rules/{rule_id}`
  - `GET /api/history`
  - `GET /api/actuators`
  - `POST /api/actuators/{actuator_name}`
  - `GET /api/system/mode`
  - `POST /api/system/mode`
  - `WS /ws/stream`

---

## CONTAINER_NAME: db

### DESCRIPTION
Persistent relational database used by the platform to store automation rules.

### USER STORIES
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 20

### PORTS
`5432:5432`

### PERSISTENCE EVALUATION
This is the only persistent data store managed directly by the project.

### EXTERNAL SERVICES CONNECTIONS
None.

### MICROSERVICES

#### MICROSERVICE: db
- TYPE: database
- DESCRIPTION: `db` is the PostgreSQL database containing the `automation_rules` table.
- PORTS: `5432`
- DB STRUCTURE:
  - `id`
  - `rule_id`
  - `description`
  - `is_active`
  - `source_name`
  - `metric_key`
  - `operator`
  - `threshold`
  - `action_type`
  - `target`
  - `payload`
  - `created_at`
  - `updated_at`

### NOTE
In the current implementation, trigger history is **not** persisted in `db`.

---

## CONTAINER_NAME: frontend

### DESCRIPTION
Provides the real-time user interface for monitoring, rule management, action history inspection, and manual control.

### USER STORIES
15, 16, 17, 18, 19, 20

### PORTS
`5173:5173`

### PERSISTENCE EVALUATION
No database is used by `frontend`. Client-side state is transient and only supports UI behavior.

### EXTERNAL SERVICES CONNECTIONS
Does not connect directly to `simulator` or `db`. It communicates with `be_presentation`.

### MICROSERVICES

#### MICROSERVICE: frontend
- TYPE: frontend
- DESCRIPTION: React/Vite single-page application for monitoring and control.
- PORTS: `5173`
- TECHNOLOGICAL SPECIFICATION:
  - React
  - Vite
  - REST + WebSocket integration with `be_presentation`
- MAIN FEATURES:
  - dashboard zones for Greenhouse, Habitat, Airlock, and Power
  - live actuator visualization
  - action history panel
  - rule manager
  - focused zone inspection
  - AUTO/MANUAL switch
  - manual override buttons

---

# PERSISTENCE MODEL SUMMARY

- **Persistent**
  - automation rules in `db`

- **Volatile / In-memory**
  - latest telemetry state cache
  - trigger history cache
  - runtime rule activation state
  - system mode state
  - temporary manual suspension state

This separation was adopted to satisfy the project requirement that trigger history should not be persisted, while automation rules must survive restarts.
