"""Smoke tests for optional runtime dependencies."""


def test_imports():
    import networkx  # noqa: F401
    import numpy  # noqa: F401
