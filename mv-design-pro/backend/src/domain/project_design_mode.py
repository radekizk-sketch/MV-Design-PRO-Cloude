from __future__ import annotations

from enum import Enum


class ProjectDesignMode(str, Enum):
    SN_NETWORK = "SN_NETWORK"
    NN_NETWORK = "NN_NETWORK"
