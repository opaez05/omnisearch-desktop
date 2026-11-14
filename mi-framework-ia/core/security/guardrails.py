"""Validación de entradas/salidas y filtros de seguridad (Python 3.12 stdlib)."""

from pathlib import Path

MAX_QUERY_CHARS: int = 2000
MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB


def sanitize_rag_snippet(snippet: str) -> str:
    """Neutraliza etiquetas delimitadoras de contexto dentro de fragmentos de documentos."""
    return (
        snippet
        .replace("</documento>", "&lt;/documento&gt;")
        .replace("<documento", "&lt;documento")
    )


def sanitize_user_query(query: str) -> str:
    """Valida longitud y neutraliza cierres de etiquetas en la consulta del usuario."""
    cleaned = query.strip()
    if not cleaned:
        raise ValueError("La consulta no puede estar vacía.")
    if len(cleaned) > MAX_QUERY_CHARS:
        cleaned = cleaned[:MAX_QUERY_CHARS]
    return cleaned.replace("</pregunta_usuario>", "").replace("<pregunta_usuario>", "")


def validate_safe_file_path(file_path: str | Path, allowed_roots: list[str | Path] | None = None) -> Path:
    """Resuelve la ruta de un archivo, valida su tamaño y verifica su contención si hay raíces permitidas."""
    resolved = Path(file_path).resolve()
    if not resolved.exists() or not resolved.is_file():
        raise ValueError(f"El archivo no existe o no es un archivo regular: {resolved}")

    if allowed_roots:
        roots = [Path(r).resolve() for r in allowed_roots]
        if not any(resolved.is_relative_to(root) for root in roots):
            raise PermissionError(f"Ruta fuera de los directorios autorizados: {resolved}")

    size = resolved.stat().st_size
    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"El archivo excede el tamaño máximo permitido ({size} > {MAX_FILE_SIZE_BYTES} bytes).")

    return resolved

