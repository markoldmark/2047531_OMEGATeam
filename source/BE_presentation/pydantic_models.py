from pydantic import BaseModel

class RuleSchema(BaseModel):
    rule_id: str
    description: str
    source_name: str
    metric_key: str
    operator: str
    threshold: str
    action_type: str
    target: str
    payload: str
    is_active: bool = True


class RuleStatusUpdate(BaseModel):
    is_active: bool


class ActuatorCommand(BaseModel):
    state: str

class SystemMode(BaseModel):
    mode: str