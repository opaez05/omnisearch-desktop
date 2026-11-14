# 🛡️ Auditoría de Seguridad y Endurecimiento (Hardening)

> **Fecha:** 2026-11-14  
> **Alcance:** Backend Rust/Tauri v2 (`src-tauri/`), Módulos Python (`core/security/`, `.agents/skills/`), Configuración MCP y Entorno.  
> **Estándares de referencia:** OWASP Top 10:2021, OWASP Top 10 for LLM Applications 2025, CWE.

---

## 1. Resumen Ejecutivo

Se realizó una auditoría de seguridad sobre el código fuente completo de **OmniSearch Desktop (`mi-framework-ia`)** y se aplicaron correcciones de endurecimiento (*hardening*) diseñadas para **mitigar vulnerabilidades reales sin alterar la funcionalidad operativa actual** (incluyendo el soporte de desarrollo en Vite y el fallback configurado hacia Ollama).

| ID | Severidad | Componente | CWE / OWASP | Estado |
| :--- | :---: | :--- | :--- | :---: |
| **H-01** | Crítica | `.agents/mcp_config.json`, `.env.example` | CWE-798, CWE-312 / A07:2021 | ✅ Mitigado |
| **H-02** | Alta | `src-tauri/src/adapters/ollama.rs` | CWE-319, CWE-200 / LLM02:2025 | ✅ Mitigado |
| **H-03** | Alta | `.agents/skills/skill-creator/eval-viewer/generate_review.py` | CWE-79, CWE-352, CWE-770 / A03:2021 | ✅ Mitigado |
| **H-04** | Alta | `.agents/skills/skill-creator/scripts/run_eval.py` | CWE-22 / A01:2021 | ✅ Mitigado |
| **H-05** | Media | `src-tauri/src/adapters/in_memory_store.rs`, `src-tauri/src/application/mod.rs` | CWE-248, CWE-400 / A04:2021 | ✅ Mitigado |
| **H-06** | Media | `src-tauri/src/application/mod.rs`, `core/security/` | CWE-74, CWE-284 / LLM01:2025 | ✅ Mitigado |
| **H-07** | Media | `src-tauri/tauri.conf.json` | CWE-693 / A05:2021 | ✅ Mitigado |

---

## 2. Detalle de Cambios Implementados

### 2.1. Gestión de Secretos y Configuración (H-01)
- **Problema:** Token de API de `mem0` y cadena de conexión de MongoDB presentes en texto plano dentro de `.agents/mcp_config.json`.
- **Solución aplicada:**
  - Se reemplazaron los valores literales por referencias a variables de entorno (`${MEM0_API_TOKEN}` y `${MDB_MCP_CONNECTION_STRING}`) en [`.agents/mcp_config.json`](../../.agents/mcp_config.json).
  - Se documentaron las variables requeridas en [`.env.example`](../../.env.example).

### 2.2. Conexión Configurable a Ollama (H-02)
- **Problema:** Las URLs de inferencia hacia `127.0.0.1:11434` y `26.120.235.111:11434` estaban fijas en el código, ignorando `self.base_url`.
- **Solución aplicada:**
  - En [`src-tauri/src/adapters/ollama.rs`](../../src-tauri/src/adapters/ollama.rs), se parametrizaron los endpoints mediante las variables de entorno `OLLAMA_HOST` (por defecto `http://127.0.0.1:11434`) y `OLLAMA_FALLBACK_HOST` (conservando `http://26.120.235.111:11434` como respaldo por defecto para mantener compatibilidad con pruebas actuales).

### 2.3. Seguridad en Scripts Python (H-03 y H-04)
- **H-03 (Stored DOM XSS y CSRF en visor de evaluaciones):**
  - En [`generate_review.py`](../../.agents/skills/skill-creator/eval-viewer/generate_review.py), se escaparon los caracteres `<`, `>` y `&` como secuencias Unicode JSON (`\u003c`, `\u003e`, `\u0026`) al incrustar `EMBEDDED_DATA` en HTML.
  - En `ReviewHandler.do_POST`, se añadió validación de cabecera `Origin` contra `localhost`/`127.0.0.1` y un límite de tamaño de cuerpo de **5 MB**.
- **H-04 (Path Traversal en ejecución de evaluaciones):**
  - En [`run_eval.py`](../../.agents/skills/skill-creator/scripts/run_eval.py), se sanitizó `skill_name` (`[^a-zA-Z0-9_-]`) y se verificó la contención de ruta con `Path.is_relative_to()` antes de crear o eliminar archivos `.md` temporales en `.claude/commands/`.

### 2.4. Estabilidad y Límites de Memoria en Rust (H-05)
- **Panic por UTF-8 multibyte:** En [`src-tauri/src/adapters/in_memory_store.rs`](../../src-tauri/src/adapters/in_memory_store.rs), `search_keyword` ahora ajusta los índices de recorte usando `is_char_boundary()` para evitar cierres inesperados al procesar textos en español con tildes o `ñ`.
- **Límite de tamaño de archivo:** En [`src-tauri/src/application/mod.rs`](../../src-tauri/src/application/mod.rs), `index_single_file` verifica que el archivo no sea vacío y no supere **50 MB** (`MAX_FILE_SIZE_BYTES`) antes de leerlo en memoria.

### 2.5. Mitigación de Prompt Injection y Controles de Seguridad (H-06)
- **Aislamiento de contexto RAG:** En [`src-tauri/src/application/mod.rs`](../../src-tauri/src/application/mod.rs), `ask_question` envuelve cada fragmento recuperado dentro de etiquetas `<documento>` (escapando cierres previos) e instruye al modelo a tratar su contenido estrictamente como datos pasivos.
- **Módulos `core/security/` (Python 3.12 stdlib):**
  - [`core/security/guardrails.py`](../../core/security/guardrails.py): Implementa `sanitize_rag_snippet()`, `sanitize_user_query()` y `validate_safe_file_path()`.
  - [`core/security/permissions.py`](../../core/security/permissions.py): Implementa `validate_manifest_permissions()` y `enforce_permission()` bajo el principio de mínimo privilegio.

### 2.6. Content Security Policy en Tauri v2 (H-07)
- En [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json), se reemplazó `"csp": null` por una política CSP activa compatible con el puente IPC de Tauri (`ipc:`, `http://ipc.localhost`), Tailwind CSS y el servidor de desarrollo de Vite (`http://localhost:5173`, `ws://localhost:5173`).

---

## 3. Verificación Realizada

- **Compilación Rust (`cargo check --manifest-path src-tauri/Cargo.toml`):** Ejecutado tras todos los cambios con resultado exitoso (`exit code 0`).
