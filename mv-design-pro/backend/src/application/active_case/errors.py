class ActiveCaseError(RuntimeError):
    """Base error for Active Case operations."""


class ActiveCaseNotSetError(ActiveCaseError):
    """Raised when a project has no Active Case configured."""


class ActiveCaseNotFoundError(ActiveCaseError):
    """Raised when a requested Active Case does not exist in the project."""


class ActiveCaseMismatchError(ActiveCaseError):
    """Raised when an operation references a case that is not the Active Case."""
