"""Define qué puede hacer cada agente/skill (principio de mínimo privilegio)."""

from collections.abc import Iterable


class AgentPermissionError(PermissionError):
    """Excepción lanzada cuando un agente o skill intenta una acción no autorizada."""


ALLOWED_PERMISSIONS: frozenset[str] = frozenset({
    "file_system_read",
    "lancedb_read",
    "lancedb_write",
    "ollama_api_access",
})


def validate_manifest_permissions(declared: Iterable[str]) -> set[str]:
    """Valida que los permisos declarados en un manifest pertenezcan al catálogo permitido."""
    perms = set(declared)
    unknown = perms - ALLOWED_PERMISSIONS
    if unknown:
        raise AgentPermissionError(
            f"Permisos desconocidos o no autorizados en manifest: {sorted(unknown)}"
        )
    return perms


def enforce_permission(declared_permissions: Iterable[str], required_permission: str) -> None:
    """Verifica que el agente/skill posea el permiso requerido antes de ejecutar la acción."""
    perms = validate_manifest_permissions(declared_permissions)
    if required_permission not in perms:
        raise AgentPermissionError(
            f"Acceso denegado: se requiere '{required_permission}', "
            f"pero solo se otorgaron {sorted(perms)}."
        )

