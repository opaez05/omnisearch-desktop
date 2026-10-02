# OmniSearch Desktop — Contexto del Agente de IA

> **Este archivo es la fuente de verdad para cualquier agente de IA que trabaje en este proyecto.**
> Se actualiza al final de cada sesión de trabajo para mantener contexto acumulado.

---

## 🧠 ¿Qué es este proyecto?

**OmniSearch Desktop** (también conocido como *Explorador Semántico Local Inteligente*) es una aplicación de escritorio multiplataforma construida con **Tauri v2 (Rust) + React/TypeScript** que reemplaza la navegación manual por carpetas mediante un sistema de **recuperación semántica multimodal 100% local y privada**.

El usuario puede buscar sus archivos usando lenguaje natural:
> *"Muéstrame el contrato donde hablábamos de la penalización del 10% y la foto de la firma"*

Y el sistema encuentra los archivos relevantes **sin que ningún dato salga de la máquina del usuario**.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Desktop / Backend | Tauri v2, Rust (`tokio`, `notify`, `rusqlite`) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Base de datos vectorial | LanceDB (embebido, Apache Arrow) |
| Base de datos relacional | SQLite (`index.db`) — hashes SHA-256, cola de trabajo |
| Embeddings de texto | `bge-small-en-v1.5` / `nomic-embed-text` |
| Visión (VLM) | `Moondream2` / `Florence-2-base` |
| Audio (STT) | `Whisper.cpp` (base/small) |
| Razonamiento / Query | `Llama 3.2 (3B)` o `Gemma 2 (2B)` via Ollama |
| Scripting / Agentes | Python (evaluaciones y utilidades) |

---

## 📐 Arquitectura: Hexagonal (Puertos y Adaptadores)

El backend en Rust sigue **Arquitectura Hexagonal (Clean Architecture)**:

```
CAPA IPC/TAURI (Comandos)
        │
CASOS DE USO (IndexFileUseCase, SearchSemanticUseCase, WatcherOrchestrator)
        │
PUERTOS (Traits): VectorStorePort, MetadataStorePort, AiInferencePort, SpeechToTextPort
        │
ADAPTADORES (Infra): LanceDbAdapter, SqliteAdapter, NotifyFsAdapter, OllamaVisionAdapter, WhisperCppAdapter
```

**Regla de oro:** No mezclar llamadas IPC, orquestación de IA y accesos a DB en el mismo archivo/función.

---

## 📋 Requerimientos Funcionales Clave

- **RF-01** Monitorización continua de directorios en segundo plano (`notify`)
- **RF-02** Deduplicación por hash SHA-256 antes de procesar
- **RF-03** Enrutamiento por tipo MIME (PDF/DOCX → texto, IMG → VLM, Audio → STT)
- **RF-04 a RF-07** Pipeline de ingesta: extracción → embeddings → LanceDB
- **RF-08 a RF-10** Búsqueda semántica en lenguaje natural con re-ranking via SLM
- **RF-11** Atajo global `Cmd/Alt + Espacio` para invocar el lanzador
- **RF-12** Tarjetas de resultados con score de similitud y extracto resaltado

---

## 📁 Estructura del Proyecto

```
mi-framework-ia/
├── src/              # React/TypeScript (UI)
├── src-tauri/        # Rust (backend, IPC, watcher)
├── agents/           # Agentes Python del framework
├── core/             # Lógica central del framework de agentes
├── tools/            # Herramientas disponibles para agentes
├── skills/           # Skills del framework
├── config/           # Configuración (agents.yaml, etc.)
├── interfaces/       # Contratos / interfaces compartidas
├── evaluations/      # Scripts de evaluación de pipelines
├── docs/             # Documentación organizada por subcarpetas
│   ├── product/      # PRD, casos de uso, requerimientos
│   ├── architecture/ # Arquitectura, diagramas, schemas
│   └── sessions/     # Bitácora de sesiones de trabajo
├── .agents/          # Skills y configuración del agente de IA
│   └── skills/
│       └── committer/ # Estándar Conventional Commits
└── AGENTS.md         # Este archivo (contexto del agente)
```

---

## 🔄 Workflow: "Termine de trabajar"

Cuando el usuario diga **"Termine de trabajar"**, el agente debe ejecutar el siguiente workflow **en orden**:

### Paso 1 — Documentar cambios
1. Identificar qué archivos cambiaron en la sesión.
2. Si los cambios ameritan documentación: actualizar o crear archivos en `docs/`.
3. Reorganizar `docs/` en subcarpetas si es necesario (`product/`, `architecture/`, `sessions/`).
4. Actualizar `README.md` si la estructura o funcionalidad cambió significativamente.
5. Registrar un nuevo bloque en la sección `Bitácora de Sesiones` de este mismo archivo (`AGENTS.md`).

### Paso 2 — Subir código a GitHub
Usar el **MCP de GitHub** (`github-mcp-server`) para hacer push de todos los cambios:
1. Usar la skill **committer** (`.agents/skills/committer/skill.md`) para redactar el mensaje de commit siguiendo **Conventional Commits**.
2. El commit debe tener:
   - **Título** (`tipo(alcance): descripción ≤50 chars`)
   - **Cuerpo** extenso explicando qué cambió, por qué y qué impacto tiene
3. Hacer push a la rama principal (`main`).

### Reglas del commit
- Leer la skill `committer` antes de redactar el mensaje.
- Si hay múltiples cambios de distinta naturaleza, usar el tipo dominante o hacer commits separados.
- Nunca usar `chore` para cambios de código real; reservar para tareas de mantenimiento puro.

---

## 🛠️ Convenciones y Reglas de Código

### Rust (src-tauri)
- Prohibido usar `.unwrap()` o `.expect()` sin justificación en producción.
- Todo acceso a disco o red debe ser `async` con `tokio`.
- Separar handlers IPC de lógica de negocio (Arquitectura Hexagonal).

### TypeScript / React (src)
- Estado global con **Zustand** únicamente.
- Componentes tipados con TypeScript estricto.
- Estilos con **Tailwind CSS**.

### Python (agents/, evaluations/)
- Seguir PEP 8.
- Usar `pyproject.toml` para dependencias.

---

## 📅 Bitácora de Sesiones

> Cada sesión se registra aquí para dar contexto acumulado a futuros agentes.
> Formato: `## Sesión N — YYYY-MM-DD`

---

## Sesión 1 — 2026-10-01

**Objetivo de la sesión:** Configuración inicial del agente de IA y sistema de flujo de trabajo automatizado.

**Cambios realizados:**
- Se creó y configuró el archivo `AGENTS.md` (este archivo) como fuente de verdad del contexto del proyecto para el agente de IA.
- Se estableció el workflow "Termine de trabajar": documentar → commit con Conventional Commits → push a GitHub via MCP.
- Se reorganizó la carpeta `docs/` en subcarpetas: `product/`, `architecture/`, `sessions/`.
- Se actualizó el `README.md` para reflejar la nueva estructura de documentación.
- Se definieron las convenciones y reglas del agente en este mismo archivo.

**Contexto del proyecto en este punto:**
- El proyecto está en **Fase 1 (Scaffolding)**: estructura base de Tauri v2 + React lista.
- La arquitectura Hexagonal está definida en docs pero aún en implementación.
- Los agentes Python (`ingest_agent`, `search_agent`) están configurados en `config/agents.yaml`.
- La documentación existente cubre: PRD, arquitectura, requerimientos funcionales y no funcionales, casos de uso, manifest schema y skills spec.

**Decisiones tomadas:**
- `AGENTS.md` sirve a la vez como instrucciones del agente Y como bitácora de sesiones.
- La carpeta `docs/sessions/` guardará bitácoras detalladas por sesión si el volumen lo justifica.
- El agente debe leer SIEMPRE este archivo al inicio de cada sesión.
