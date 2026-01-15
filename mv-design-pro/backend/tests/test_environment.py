import importlib


def test_required_dependencies_importable() -> None:
    for module_name in ("numpy", "networkx"):
        importlib.import_module(module_name)
