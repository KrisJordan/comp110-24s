"""Event Model for clients connected via WebSocket."""
__author__ = "Kris Jordan <kris@cs.unc.edu>"
__copyright__ = "Copyright 2023"
__license__ = "MIT"

from typing import Any
from pydantic import BaseModel


class WebSocketEvent(BaseModel):
    type: str
    data: dict[str, Any] = {}
