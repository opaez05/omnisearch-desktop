# Guía de Arquitectura de Software y Buenas Prácticas: Explorador Semántico Local

## 1. Contexto y Objetivos de Calidad
Este documento define la arquitectura técnica formal para el desarrollo del **Explorador Semántico Local** (Tauri v2 + Rust + React/TypeScript + Modelos Locales). Su propósito es servir como especificación directa para el framework de desarrollo y agentes de asistencia (*vibe coding*).

### Objetivos Clave:
1. **Evitar Código Espagueti:** Prohibir la mezcla de llamadas IPC, orquestación de IA y accesos a bases de datos en un mismo archivo o función.
2. **Prevenir Congelamiento del Sistema:** Desacoplar completamente el vigilante del sistema de archivos (`notify`) de las tareas pesadas de inferencia local.
3. **Mantenibilidad y Sustituibilidad:** Facilitar el cambio o actualización de modelos de IA (Ollama, Whisper, ONNX) o motores de base de datos sin tocar la lógica de negocio ni la interfaz de usuario.
4. **Resiliencia ante Errores:** Evitar pánicos en tiempo de ejecución en Rust (`unwrap`, `expect`) cuando un archivo descargado esté bloqueado, dañado o en formato no admitido.

---

## 2. Stack Tecnológico

### 2.1 Lenguajes de Programación Principales
* **Rust (Capa de Sistema, Rendimiento y Concurrencia):** Núcleo de la aplicación de escritorio. Controla llamadas directas al SO, el demonio vigilante (`notify`), la ejecución asíncrona de tareas de indexación y la persistencia vectorial.
* **TypeScript (Capa de Interfaz de Usuario y Lógica Cliente):** Lógica de la barra de búsqueda interactiva, componentes visuales, tipado de datos transferidos por IPC y renderizado de resultados.
* **Python (Scripting de Utilidad y Framework de Agentes):** Pruebas preliminares de prompts, orquestación del backend de soporte y evaluación de pipelines.

### 2.2 Framework e Infraestructura
* **Tauri v2 (Rust + Webview):** Binarios ultraligeros (~15 MB) y consumo de memoria base de ~40-60 MB de RAM.
* **React 18 / Vite + Tailwind CSS + Zustand:** Capa visual reactiva estilo Spotlight/Raycast.
* **LanceDB (Embebido):** Base de datos vectorial columnar basada en Apache Arrow para búsqueda semántica.
* **SQLite (`rusqlite` / `sqlx`):** Base de datos relacional embebida (`index.db`) para hashes SHA-256 y control de la cola de trabajo (`PENDING`, `DONE`, `FAILED`).
* **Ollama + Whisper.cpp:** Servicio local de inferencia (`bge-small`, `moondream2`, `llama3.2`, `whisper`).

---

## 3. Patrón de Arquitectura Hexagonal (Puertos y Adaptadores)

El backend en Rust se estructura bajo los principios de la **Arquitectura Hexagonal (Clean Architecture)**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA DE COMANDOS TAURI (API / IPC)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    CASOS DE USO (Application Layer)                    │
│    - IndexFileUseCase                 - SearchSemanticUseCase          │
│    - WatcherOrchestrator              - DeduplicationService           │
└─────────────────────┬────────────────────────────────────┬─────────────┘
                      │                                    │
┌─────────────────────▼──────┐              ┌──────────────▼─────────────┐
│       PUERTOS (Traits)     │              │       PUERTOS (Traits)     │
│   - VectorStorePort        │              │   - ContentExtractorPort   │
│   - MetadataStorePort      │              │   - AiInferencePort        │
│   - FsWatcherPort          │              │   - SpeechToTextPort       │
└─────────────────────▲──────┘              └──────────────▲─────────────┘
                      │ (Implementación)                   │ (Implementación)
┌─────────────────────┴──────┐              ┌──────────────┴─────────────┐
│    ADAPTADORES (Infra)     │              │    ADAPTADORES (Infra)     │
│   - LanceDbAdapter         │              │   - PdfExtractAdapter      │
│   - SqliteAdapter          │              │   - OllamaVisionAdapter    │
│   - NotifyFsAdapter        │              │   - WhisperCppAdapter      │
└────────────────────────────┘              └────────────────────────────┘
```

---

## 4. Estructura Canónica de Directorios

### 4.1 Backend en Rust (`src-tauri/src/`)
```text
src-tauri/src/
├── domain/                      # Entidades puras y reglas invariantes (sin dependencias externas)
│   ├── mod.rs
│   ├── file_item.rs             # Entidad FileItem (id, path, hash, size, mime_type)
│   ├── search_query.rs          # Tipos de búsqueda, filtros y scoring semántico
│   ├── vector.rs                # Definición del vector de embedding (Vec<f32>)
│   └── errors.rs                # Enum tipado de errores de dominio (thiserror)
│
├── ports/                       # Interfaces abstractas (Rust Traits)
│   ├── mod.rs
│   ├── vector_store.rs          # Trait: VectorStore (upsert, search_cosine)
│   ├── metadata_store.rs        # Trait: MetadataStore (get_by_hash, mark_indexed)
│   ├── content_extractor.rs     # Trait: ContentExtractor (can_handle, extract)
│   └── ai_client.rs             # Trait: AiClient (embed_text, describe_image)
│
├── adapters/                    # Implementaciones concretas de infraestructura
│   ├── mod.rs
│   ├── persistence/
│   │   ├── mod.rs
│   │   ├── lance_db.rs          # Implementación de VectorStore con LanceDB
│   │   └── sqlite_meta.rs       # Implementación de MetadataStore con rusqlite/sqlx
│   ├── extractors/
│   │   ├── mod.rs
│   │   ├── pdf.rs               # Extractor para PDFs (pdf-extract)
│   │   ├── plaintext.rs         # Extractor para TXT, MD, CSV
│   │   ├── vision.rs            # Adaptador hacia Ollama para imágenes
│   │   └── audio.rs             # Adaptador hacia Whisper para audios
│   ├── ai/
│   │   ├── mod.rs
│   │   └── ollama_http.rs       # Cliente HTTP asíncrono hacia Ollama
│   └── watcher/
│       ├── mod.rs
│       └── notify_service.rs    # Vigilante nativo con el crate notify
│
├── application/                 # Lógica de aplicación y orquestación (Casos de Uso)
│   ├── mod.rs
│   ├── indexer_service.rs       # Pipeline: Hash -> Filtro -> Extracción -> Embed -> Guardado
│   ├── search_service.rs        # Pipeline: Query -> Vector Search -> Re-rank con SLM
│   └── queue_worker.rs          # Worker asíncrono con control de concurrencia (Semaphore)
│
├── commands/                    # Controladores delgados de Tauri IPC (Handlers)
│   ├── mod.rs
│   ├── search_commands.rs       # Comandos expuestos a la UI para búsqueda
│   └── status_commands.rs       # Consulta de estado del indexador y colas
│
├── state.rs                     # Inyección de dependencias (AppState de Tauri)
└── main.rs                      # Inicialización y arranque de servicios
```

### 4.2 Frontend en React / TypeScript (`src/`)
```text
src/
├── components/                  # Componentes de presentación (Dumb Components)
│   ├── search/
│   │   ├── SearchInput.tsx      # Barra estilo Spotlight/Raycast
│   │   ├── ResultCard.tsx       # Ficha de archivo encontrado con badge y preview
│   │   └── ResultList.tsx       # Lista virtualizada para alto rendimiento
│   └── ui/                      # Elementos base reutilizables
│       ├── Badge.tsx
│       ├── Modal.tsx
│       └── Skeleton.tsx
│
├── hooks/                       # Custom hooks que encapsulan comunicación IPC y eventos
│   ├── useSemanticSearch.ts     # Invoca comandos de búsqueda con debounce
│   └── useIndexerEvents.ts      # Escucha tauri::emit('indexer-status')
│
├── stores/                      # Estado global con Zustand (Mínimo y sin lógica pesada)
│   ├── useSearchStore.ts        # Almacena consulta activa y selección actual
│   └── useSystemStatusStore.ts  # Estado de la cola y disponibilidad de Ollama
│
├── types/                       # Definiciones TypeScript sincronizadas con Rust
│   ├── api.ts                   # Interfaces devueltas por los comandos IPC
│   └── file.ts                  # Metadata y tipos de archivos
│
├── App.tsx                      # Orquestador visual
└── main.tsx                     # Entry point de React
```

---

## 5. Patrones de Diseño Obligatorios

### 5.1 Patrón Productor-Consumidor Desacoplado (Ingesta Segura)
* **Regla:** El hilo del vigilante del sistema de archivos (`notify`) **NUNCA** debe procesar o inferir archivos directamente.
* **Mecanismo:** `notify` captura el evento en microsegundos y lo envía a un canal asíncrono `tokio::sync::mpsc::channel`. Un worker independiente consume los eventos de uno en uno o con concurrencia restringida mediante `tokio::sync::Semaphore`.

```rust
pub struct IndexingWorker {
    queue_rx: tokio::sync::mpsc::Receiver<std::path::PathBuf>,
    semaphore: std::sync::Arc<tokio::sync::Semaphore>, // Límite (ej. máx 2 archivos a la vez)
}
```

### 5.2 Patrón Estrategia (Pipeline Extractor Multimodal)
* **Regla:** Prohibido utilizar un bloque `match` gigante o cadenas de `if-else` para evaluar extensiones de archivo en una sola función.
* **Mecanismo:** Cada tipo de formato implementa el trait `ContentExtractor`. El orquestador itera sobre los extractores registrados y despacha al primero que responda positivamente a `can_handle`.

```rust
#[async_trait::async_trait]
pub trait ContentExtractor: Send + Sync {
    fn can_handle(&self, mime_or_ext: &str) -> bool;
    async fn extract(&self, path: &std::path::Path) -> Result<String, DomainError>;
}
```

### 5.3 Control de Duplicados e Idempotencia por Hash SHA-256
Antes de invocar cualquier modelo de IA (visión, transcripción o embeddings), se calcula el hash SHA-256 de los primeros bloques del archivo. Se consulta a SQLite: si el hash ya existe y la ruta no ha cambiado, se descarta el procesamiento de inmediato.

---

## 6. Tabla de Buenas Prácticas vs. Antipatrones

| Área | Mala Práctica (Antipatrón) | Buena Práctica (Arquitectura Limpia) |
| :--- | :--- | :--- |
| **Tauri IPC** | Escribir lógica de negocio, parsing de PDFs y llamadas HTTP dentro de los comandos `#[tauri::command]`. | Comandos delgados: solo reciben parámetros, llaman a un caso de uso (`application/`) y devuelven el resultado tipado. |
| **Manejo de Errores** | Abusar de `.unwrap()` y `.expect()` en Rust (un archivo corrupto o inaccesible cierra la app completa). | Usar `Result<T, AppError>` con el crate `thiserror` para modelar fallos esperables sin provocar pánico. |
| **Frontend / React** | Intentar orquestar qué modelo llamar primero, parsear rutas del sistema operativo o calcular distancias vectoriales. | El frontend es un visor: emite la búsqueda con `invoke`, muestra los datos devueltos y escucha eventos globales de estado. |
| **Llamadas de Red / IA**| Hardcodear llamadas a `http://localhost:11434` en múltiples partes del código. | Encapsular las llamadas en un adaptador `OllamaClientAdapter` detrás de la interfaz `AiInferencePort` con timeouts configurables. |
| **Manejo de Estado** | Guardar miles de registros de archivos en el store de Zustand de React. | La UI solo almacena en memoria los 10–20 resultados más relevantes devueltos por la búsqueda. |

---

## 7. Reglas de Instrucción para el Framework y Asistente (AntiGravity Rules)

1. **REGLA DE CAPAS:**
   - Todo nuevo comando de Tauri en `commands/` no puede exceder 25 líneas. Debe delegar inmediatamente en un servicio en `application/`.
   - Queda prohibido importar dependencias de infraestructura (`rusqlite`, `lancedb`, `reqwest`) dentro del módulo `domain/`.

2. **RESILIENCIA EN RUST:**
   - Prohibido el uso de `.unwrap()` o `.expect()` fuera de tests unitarios. Todo error de I/O o red debe capturarse en un enum `AppError`.
   - Las llamadas a Ollama o sockets externos deben tener siempre un timeout explícito (máximo 15 segundos para embeddings, 60 segundos para modelos multimodales).

3. **FRONTEND:**
   - Los componentes de React nunca deben contener rutas de archivos hardcodeadas ni llamadas directas al sistema operativo.
   - Toda llamada al backend debe estar aislada en un custom hook dentro de `src/hooks/`.
