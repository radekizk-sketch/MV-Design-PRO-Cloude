class NetworkModelInvariantError(RuntimeError):
    """Base error for NetworkModel invariant violations."""


class MultipleNetworkModelsError(NetworkModelInvariantError):
    """Raised when multiple NetworkModels are detected for a single project."""
