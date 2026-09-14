# Especificación de Servidores MCP, Skills y Reglas del Asistente

Este documento consolida la infraestructura de herramientas, servidores **MCP (Model Context Protocol)**, herramientas de desarrollo y reglas de comportamiento del asistente para el proyecto **Explorador Semántico Local Inteligente**.

---

## 1. Servidores MCP (Model Context Protocol) Esenciales

Para que el agente pueda inspeccionar, verificar y construir el proyecto en tiempo real sin requerir intervención manual constante, requiere acceso a los siguientes servidores MCP:

### 1.1 MCP Filesystem
* **Propósito:** Permite al agente inspeccionar directamente directorios de prueba (`Downloads`, muestras de PDFs, audios, imágenes) y validar la estructura generada sin obligar al usuario a copiar y pegar rutas a mano.
* **Configuración de Permisos:** Acceso de lectura/escritura a la carpeta raíz del proyecto y a una carpeta especificada de pruebas (`test-data/`).

### 1.2 MCP Fetch / Context7 / Documentación Web en Vivo
* **Propósito:** Tauri v2 y LanceDB tienen cambios de sintaxis muy recientes entre versiones. Este servidor permite al asistente consultar la documentación oficial en tiempo real para evitar código *legacy* o deprecado.

### 1.3 MCP SQLite
* **Propósito:** Permite consultar directamente la base de datos local `index.db` para depurar si la cola de archivos, los estados (`PENDING`, `PROCESSING`, `DONE`, `FAILED`) o las huellas digitales SHA-256 se están guardando de forma correcta.

### 1.4 MCP Memory / Knowledge Graph
* **Propósito:** Mantiene un registro permanente de las decisiones de arquitectura (esquema de la tabla vectorial, endpoints locales de Ollama y rutas del sistema) para evitar que el asistente olvide el diseño inicial entre sesiones de chat.

---

## 2. Skills y Herramientas de Ejecución (Tooling)

El entorno del agente debe disponer de capacidades de ejecución directa para automatizar compilación y pruebas:

### 2.1 Control y Ejecución de Terminal / Shell
El asistente requiere ejecutar comandos directamente para:
* **Verificar compilación en tiempo real:** Diagnosticar errores de Rust con `cargo check` y `cargo build`.
* **Probar el cliente frontend:** Iniciar y probar el servidor dev de Vite / Tauri (`pnpm tauri dev`).
* **Verificar Inferencia Local:** Comprobar disponibilidad de Ollama vía HTTP (`curl http://localhost:11434/api/tags`).

### 2.2 Integración con LSP (Rust Analyzer / Cargo Diagnostics)
* **Propósito:** Prevenir que la IA adivine tipos o *lifetimes* erróneos en Rust mediante validación estática del compilador.

---

## 3. Instrucciones de Sistema y Reglas del Agente (System Prompts)

Directivas fijas y no negociables que el agente debe seguir estrictamente durante todo el ciclo de desarrollo:

1. **Restricción Estricta de Stack (Zero Cloud & Zero Server-DB):**
   * Queda prohibido explícitamente incluir dependencias cliente-servidor externas (cero Docker, cero MySQL/PostgreSQL).
   * Todo almacenamiento debe ser 100% local y embebido (`LanceDB` en proceso y `SQLite` via `rusqlite`/`sqlx`).

2. **Manejo de Errores Idiomático en Rust:**
   * Utilizar siempre `Result<T, E>` y crates de gestión de errores (`anyhow` o `thiserror`).
   * **Prohibido usar `.unwrap()`** en código de producción/ingesta para evitar que la aplicación se congele o colapse si encuentra un archivo corrupto o no legible.

3. **Inferencia Segura con Timeouts:**
   * Todas las llamadas HTTP hacia la API REST de Ollama (`/api/embeddings`, `/api/generate`) deben incluir límites de tiempo de espera (*timeouts*) explícitos para no bloquear el demonio vigilante (*file watcher*) en segundo plano.

---

## 4. Catálogo de Skills Propias del Framework (Ingesta Multimodal)

| Skill | Entrada | Salida | Descripción |
| :--- | :--- | :--- | :--- |
| `text_extractor` | `file_path: str` | `text: str` | Extrae contenido legible de archivos `.pdf`, `.docx` y `.txt`. |
| `vlm_captioner` | `image_path: str` | `caption: str` | Genera descripciones y OCR usando `moondream2` / `florence-2` vía Ollama. |
| `whisper_transcriber` | `audio_path: str` | `transcript: str` | Transcribe notas de voz y audios a texto indexable vía `whisper.cpp`. |
| `embedding_generator` | `text_chunk: str` | `vector: float[]` | Genera vectores semánticos usando `bge-small-en-v1.5` o `nomic-embed-text`. |
| `lancedb_indexer` | `metadata: dict, vector: float[]` | `status: bool` | Almacena y consulta registros vectoriales en la base LanceDB embebida. |
| `git_flow` | — | `status: str` | Automatiza el flujo de `git add .`, `git commit` y `git push` al finalizar la jornada. |
