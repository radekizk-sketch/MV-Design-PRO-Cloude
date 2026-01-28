from application.proof_engine import EquationRegistry


def test_equation_registry_import_smoke() -> None:
    assert EquationRegistry is not None
