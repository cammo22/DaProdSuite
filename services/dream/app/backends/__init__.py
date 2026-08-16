"""Backend di inferenza intercambiabili."""

from .base import InferenceBackend, ModelLoadError
from .passthrough import PassthroughBackend

__all__ = ["InferenceBackend", "ModelLoadError", "PassthroughBackend", "create_backend"]


def create_backend(name: str) -> InferenceBackend:
    """Crea il backend richiesto. L'import di torch avviene solo se serve davvero."""
    name = (name or "diffusers").lower()
    if name in ("nessuno", "passthrough", "none"):
        return PassthroughBackend()
    if name == "diffusers":
        from .diffusers_backend import DiffusersBackend

        return DiffusersBackend()
    raise ModelLoadError(f"Backend sconosciuto: {name}")
