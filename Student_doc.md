# SYSTEM DESCRIPTION:

Mars IoT Simulator is a distributed automation platform designed for the survival and management of a Martian habitat. The system ingests heterogeneous data from various sources (REST sensors and Pub/Sub telemetry topics), normalizing them into a unified internal representation. 
The platform evaluates real-time automation rules to maintain life-critical parameters (temperature, oxygen, energy) and provides an interactive dashboard for the Administrator. The system balances full automation with a manual override capability for emergency management.

# USER STORIES:

1) As a Botanist, I want the cooling fan to be activated if the greenhouse temperature rises above 35°C, so that the crops do not wither
2) As a Botanist, I want the habitat heater to be activated if the greenhouse temperature falls below 5°C, so that the plants do not freeze
3) As a Botanist, I want to automatically deactivate the entrance humidifier if the water tank level falls below 10%, to preserve the remaining water reserves
4) As a Botanist, I want a critical warning light to turn on if the hydroponic pH rises above 9, so that I can prevent nutrient lockout
5) As a Safety Manager, I want the entrance humidifier to be activated if the entrance humidity falls below 40%, to maintain a breathable atmosphere
6) As a Safety Manager, I want the cooling fan to be activated if the thermal loop temperature exceeds 45°C, to prevent system overheating
7) As a Safety Manager, I want the hall ventilation to be activated automatically if the CO2 in the hall exceeds 950ppm
8) As a Safety Manager, I want the hall ventilation to be activated automatically if the PM 2.5 air particulate exceeds 35 µg/m³
9) As a Safety Manager, I want a warning light to turn on if the airlock cycles exceed 10 within the same hour, to monitor structural wear
10) As a Safety Manager, I want to automatically deactivate the hall ventilation when the airlock is in DEPRESSURIZING state, to prevent pressure fluctuations
11) As an Energy Engineer, I want to compare the power produced by solar panels with the power consumed, to ensure we are not in a deficit
12) As an Energy Engineer, I want to deactivate the habitat heater if the power consumption exceeds 50 KW, to avoid a grid collapse
13) As an Energy Engineer, I want to activate the cooling fan if the power bus current exceeds 220A, to dissipate electrical heat
14) As an Energy Engineer, I want to activate the cooling fan if the power bus voltage exceeds 250V, to protect the circuits
15) As an Administrator, I want to see a general status summary of the habitat with a visual alarm indicator for each critical zone
16) As an Administrator, I want to see the history of active warning lights during the session, to reconstruct emergency sequences
17) As an Administrator, I want to monitor the corridor pressure, so that I can provide emergency suits if necessary
18) As an Administrator, I want to see the real-time status of the airlock, to coordinate safe EVA activities
19) As an Administrator, I want to monitor radiation levels, to authorize or deny the return of personnel from the surface
20) As an Administrator, I want to be able to manually deactivate automation rules, so that I can take full manual control of the actuators during an emergency

# CONTAINERS:

## CONTAINER_NAME: Data-Ingestion

### DESCRIPTION: 
Handles the connection to external Mars mock sensors and normalizes incoming data.

### USER STORIES:
15) As an Administrator, I want to see a general status summary of the habitat with a visual alarm indicator for each critical zone
17) As an Administrator, I want to monitor the corridor pressure, so that I can provide emergency suits if necessary
18) As an Administrator, I want to see the real-time status of the airlock, to coordinate safe EVA activities
19) As an Administrator, I want to monitor radiation levels, to authorize or deny the return of personnel from the surface

### PORTS: 
9700:9700

### DESCRIPTION:
The Data-Ingestion container polls the REST sensors and subscribes to the WebSocket telemetry topics. It converts heterogeneous payloads into a unified internal event schema and pushes them to the internal Message Broker.

### PERSISTANCE EVALUATION
The Data-Ingestion container does not require data persistence.

### EXTERNAL SERVICES CONNECTIONS
Connects to the Mars IoT Simulator hardware/mock-server endpoints (`GET /api/discovery`, `GET /api/telemetry/stream/{topic}`, `WS /api/telemetry/ws?topic={topic}`).

### MICROSERVICES:

#### MICROSERVICE: data-ingestion-service
- TYPE: backend
- DESCRIPTION: Polls and streams data from the simulator, normalizes it, and publishes to the message broker.
- PORTS: 9700
- TECHNOLOGICAL SPECIFICATION:
The microservice is developed in Python. It uses `requests` for REST polling and `websockets` for telemetry streams. It formats events as standard JSON and publishes them to the broker.
- SERVICE ARCHITECTURE: 
Contains separate threads/coroutines for REST polling and WebSocket listening. Acts purely as a publisher.
- ENDPOINTS:
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
    | GET | /health | Verifies the ingestion service is running | 15 |


## CONTAINER_NAME: Message-Broker

### DESCRIPTION: 
Provides the internal event-driven architecture backbone.

### USER STORIES:

### PORTS: 
5672:5672
15672:15672

### DESCRIPTION:
The Message-Broker container handles the routing of normalized events from the Ingestion service to the specific Domain Backend services (Greenhouse, Habitat, Airlock, Power). 

### PERSISTANCE EVALUATION
Messages are kept in memory until delivered, with optional disk persistence for queue durability.

### EXTERNAL SERVICES CONNECTIONS
Does not connect to external services.

### MICROSERVICES:

#### MICROSERVICE: rabbitmq
- TYPE: middleware
- DESCRIPTION: Standard message broker handling pub/sub routing internally.
- PORTS: 5672


## CONTAINER_NAME: Greenhouse-BE

### DESCRIPTION: 
Evaluates automation rules for agricultural and water management.

### USER STORIES:
1) As a Botanist, I want the cooling fan to be activated if the greenhouse temperature rises above 35°C
2) As a Botanist, I want the habitat heater to be activated if the greenhouse temperature falls below 5°C
3) As a Botanist, I want to automatically deactivate the entrance humidifier if the water tank level falls below 10%
4) As a Botanist, I want a critical warning light to turn on if the hydroponic pH rises above 9

### PORTS: 
9701:9701

### DESCRIPTION:
The Greenhouse-BE container consumes messages related to the greenhouse (temperature, water level, pH) from the broker. It evaluates simple if-then rules and executes REST POST commands to actuators when thresholds are breached.

### PERSISTANCE EVALUATION
Requires connection to the database to fetch automation rules and log rule execution history.

### EXTERNAL SERVICES CONNECTIONS
Connects to the Mars IoT Simulator to fire Actuator APIs (`POST /api/actuators/{actuator_name}`).

### MICROSERVICES:

#### MICROSERVICE: greenhouse-be
- TYPE: backend
- DESCRIPTION: Domain logic for botanical survival.
- PORTS: 9701
- TECHNOLOGICAL SPECIFICATION:
Developed in Python using FastAPI. Connects to RabbitMQ to consume events and uses `requests` to call actuators.
- SERVICE ARCHITECTURE: 
Rule Evaluation engine specifically scoped to greenhouse sensors. 
- ENDPOINTS:
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
    | GET | /api/greenhouse/status | Returns latest cached state of greenhouse sensors | 15 |


## CONTAINER_NAME: Habitat-BE

### DESCRIPTION: 
Evaluates automation rules for human life support and indoor safety.

### USER STORIES:
5) As a Safety Manager, I want the entrance humidifier to be activated if the entrance humidity falls below 40%
6) As a Safety Manager, I want the cooling fan to be activated if the thermal loop temperature exceeds 45°C
7) As a Safety Manager, I want the hall ventilation to be activated automatically if the CO2 in the hall exceeds 950ppm
8) As a Safety Manager, I want the hall ventilation to be activated automatically if the PM 2.5 air particulate exceeds 35 µg/m³

### PORTS: 
9702:9702

### DESCRIPTION:
The Habitat-BE container handles internal environment variables (humidity, thermal loop, CO2, particulates) consuming data from the broker and controlling ventilation and humidifier actuators.

### PERSISTANCE EVALUATION
Requires connection to the database to fetch automation rules and log rule execution history.

### EXTERNAL SERVICES CONNECTIONS
Connects to the Mars IoT Simulator to fire Actuator APIs (`POST /api/actuators/{actuator_name}`).

### MICROSERVICES:

#### MICROSERVICE: habitat-be
- TYPE: backend
- DESCRIPTION: Domain logic for life support.
- PORTS: 9702
- TECHNOLOGICAL SPECIFICATION:
Developed in Python using FastAPI.
- ENDPOINTS:
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
    | GET | /api/habitat/status | Returns latest cached state of habitat sensors | 15 |


## CONTAINER_NAME: Airlock-BE

### DESCRIPTION: 
Evaluates automation rules for structural integrity and external access.

### USER STORIES:
9) As a Safety Manager, I want a warning light to turn on if the airlock cycles exceed 10 within the same hour
10) As a Safety Manager, I want to automatically deactivate the hall ventilation when the airlock is in DEPRESSURIZING state

### PORTS: 
9703:9703

### DESCRIPTION:
The Airlock-BE container specifically tracks airlock state changes, interacting with ventilation systems to prevent depressurization hazards inside the habitat.

### PERSISTANCE EVALUATION
Requires connection to the database to log warnings and rule execution history.

### EXTERNAL SERVICES CONNECTIONS
Connects to the Mars IoT Simulator to fire Actuator APIs.

### MICROSERVICES:

#### MICROSERVICE: airlock-be
- TYPE: backend
- DESCRIPTION: Domain logic for airlock management.
- PORTS: 9703
- TECHNOLOGICAL SPECIFICATION:
Developed in Python using FastAPI. Maintains an in-memory counter for airlock cycles.
- ENDPOINTS:
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
    | GET | /api/airlock/status | Returns latest cached state of the airlock | 18 |


## CONTAINER_NAME: Power-BE

### DESCRIPTION: 
Evaluates automation rules for energy balancing and electrical safety.

### USER STORIES:
11) As an Energy Engineer, I want to compare the power produced by solar panels with the power consumed
12) As an Energy Engineer, I want to deactivate the habitat heater if the power consumption exceeds 50 KW
13) As an Energy Engineer, I want to activate the cooling fan if the power bus current exceeds 220A
14) As an Energy Engineer, I want to activate the cooling fan if the power bus voltage exceeds 250V

### PORTS: 
9704:9704

### DESCRIPTION:
The Power-BE container handles power consumption, solar arrays, and electrical buses, executing load-shedding procedures (turning off heaters) when power is limited.

### PERSISTANCE EVALUATION
Requires connection to the database to log rule execution history.

### EXTERNAL SERVICES CONNECTIONS
Connects to the Mars IoT Simulator to fire Actuator APIs.

### MICROSERVICES:

#### MICROSERVICE: power-be
- TYPE: backend
- DESCRIPTION: Domain logic for electrical grid stability.
- PORTS: 9704
- TECHNOLOGICAL SPECIFICATION:
Developed in Python using FastAPI.
- ENDPOINTS:
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
    | GET | /api/power/status | Returns latest cached state of the power grid | 11 |


## CONTAINER_NAME: History-DB

### DESCRIPTION: 
Provides persistent storage for automation rules and alarm history.

### USER STORIES:
16) As an Administrator, I want to see the history of active warning lights during the session

### PORTS: 
3306:3306

### DESCRIPTION:
The History-DB container ensures that automation rules survive service restarts and that all triggered alarms and manual overrides are logged for later auditing.

### PERSISTANCE EVALUATION
Provides data persistence mapping a relational volume to the host.

### EXTERNAL SERVICES CONNECTIONS
Does not connect to external services.

### MICROSERVICES:

#### MICROSERVICE: mysql-db
- TYPE: database
- DESCRIPTION: Relational database to store rules and logs.
- PORTS: 3306
- DB STRUCTURE: 
	**_Rules_** : | **_id_** | sensor | operator | threshold | actuator | state |
	**_History_** : | **_id_** | timestamp | domain | event_reason | action_taken |


## CONTAINER_NAME: Dashboard-FE

### DESCRIPTION: 
Provides the unified real-time graphical interface for habitat monitoring and manual control.

### USER STORIES:
15) As an Administrator, I want to see a general status summary of the habitat...
16) As an Administrator, I want to see the history of active warning lights...
17) As an Administrator, I want to monitor the corridor pressure...
18) As an Administrator, I want to see the real-time status of the airlock...
19) As an Administrator, I want to monitor radiation levels...
20) As an Administrator, I want to be able to manually deactivate automation rules...

### PORTS: 
4200:4200

### DESCRIPTION:
The Dashboard-FE container aggregates data from the 4 backend services to display live charts, system status, and a control panel for manual overrides.

### PERSISTANCE EVALUATION
The Dashboard-FE container does not include a database.

### EXTERNAL SERVICES CONNECTIONS
The Dashboard-FE container does not connect to external services directly. It fetches data from the internal backend containers.

### MICROSERVICES:

#### MICROSERVICE: dashboard-fe
- TYPE: frontend
- DESCRIPTION: Single Page Application for habitat monitoring.
- PORTS: 4200
- TECHNOLOGICAL SPECIFICATION:
Built with React.js or Vue.js. Uses REST for fetching history and WebSockets (Socket.io) to receive real-time updates from the backends.
- PAGES:
	| Name | Description | Related Microservice | User Stories |
	| ---- | ----------- | -------------------- | ------------ |
	| Monitoring.js | Displays overall habitat status and visual alarms | greenhouse-be, habitat-be, airlock-be, power-be | 15, 17, 18, 19 |
	| History.js | Displays table of past warnings/alarms | mysql-db (via backend APIs) | 16 |
	| Control.js | Manual override switches | all backends | 20 |