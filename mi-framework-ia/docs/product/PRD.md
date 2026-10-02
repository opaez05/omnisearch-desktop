# Arquitectura de Proyecto: Explorador Semántico Local Inteligente 

## 1. Visión y Resumen Ejecutivo
El proyecto consiste en el diseño y desarrollo de una aplicación de escritorio multiplataforma que sustituye la navegación manual por carpetas mediante un sistema de **organización invisible y recuperación semántica multimodal**.

Mediante modelos de lenguaje pequeños (SLMs), visión computacional local y transcripción automática de audio que operan de manera 100% privada (en el hardware del usuario o en un servidor local centralizado), el sistema indexa y comprende el contenido de archivos nuevos en tiempo real.

---

## 2. Alcance del Proyecto

### 2.1 Enfoque "Reto Pro"
1. **Monitorización Continua y No Invasiva:** Detección automática en segundo plano de eventos de creación o descarga de archivos en carpetas clave (ej. `Downloads`, `Documents`).
2. **Pipeline de Ingesta Multimodal:**
   - **Documentos (PDF, DOCX, TXT):** Extracción de texto crudo y generación de embeddings vectoriales densos.
   - **Imágenes (JPG, PNG, WebP):** Inferencia con modelos de visión por computador locales (VLM) para generar descripciones densas de contenido visual, texto impreso y firmas.
   - **Audio (WAV, MP3, M4A, OGG):** Transcripción automática de voz a texto para indexar notas de voz y grabaciones.
3. **Búsqueda en Lenguaje Natural Multiconceptual:** Capacidad de responder a consultas complejas que cruzan conceptos independientes (ej. *"Muéstrame el contrato donde hablábamos de la penalización del 10% y la foto de la firma"*), recuperando simultáneamente ambos archivos mediante similitud coseno y re-clasificación con un SLM local.

### 2.2 Límites y Exclusiones (Fuera de Alcance Inicial)
- Modificación o reubicación destructiva de archivos en el disco (el explorador genera un índice y grafo semántico, pero no renombra ni borra archivos del usuario sin confirmación explícita).
- Procesamiento en la nube pública: se prioriza estrictamente la soberanía y privacidad de los datos locales.

---

## 3. Arquitectura Técnica y Stack Tecnológico

| Capa | Componente Tecnológico | Justificación |
| :--- | :--- | :--- |
| **Capa de Escritorio y UI** | **Tauri v2 (Rust + React/TypeScript)** | Ejecutable ultraligero (~15 MB), consumo de memoria mínimo (~40-60 MB en reposo frente a >300 MB en Electron) e integración nativa con APIs del SO. |
| **Vigilante de Archivos** | **`notify` (Rust Crate)** | Uso de llamadas nativas del kernel (`inotify` en Linux, `FSEvents` en macOS, `ReadDirectoryChangesW` en Windows) sin sondeo continuo de disco. |
| **Base de Datos Vectorial** | **LanceDB (Modo Embebido)** | Base de datos columnar basada en formato Apache Arrow, corre embebida dentro del proceso sin requerir contenedores Docker ni servidores pesados. |
| **Embeddings de Texto** | `bge-small-en-v1.5` / `nomic-embed-text` | Modelos de menos de 300 MB, optimizados para CPU/GPU y con latencias de inferencia de milisegundos. |
| **Visión Computacional (VLM)** | `Moondream2` / `Florence-2-base` | Modelos compactos (<2B parámetros) ideales para generar subtítulos y descripciones densas sin agotar la memoria VRAM. |
| **Reconocimiento de Voz (STT)**| `whisper.cpp` (`base` o `small`) | Transcripción local veloz y optimizada para arquitecturas x86 y ARM (Apple Silicon). |
| **Razonamiento y Query SLM** | `Llama 3.2 (3B)` o `Gemma 2 (2B)` | Comprensión semántica de la consulta, desambiguación de intenciones cruzadas y ranking de resultados. |

---

## 4. Topologías de Despliegue

### 4.1 Despliegue 100% Local (Stand-alone)
- Tanto la UI, el demonio en segundo plano como el motor Ollama/llama.cpp se ejecutan en la misma máquina física.
- **Ventaja:** Autosuficiencia absoluta sin dependencia de conectividad de red.
- **Desventaja:** Mayor exigencia sobre la batería, memoria y temperatura del equipo cliente.

### 4.2 Despliegue Híbrido / Servidor Ollama Centralizado
- La app de Tauri corre en dispositivos ligeros (laptops livianas, mini PCs).
- Las llamadas de inferencia pesada (embeddings, visión y LLM) se despachan por red local (`OLLAMA_HOST="0.0.0.0:11434"`) o red privada (Tailscale) a una máquina con GPU dedicada (servidor doméstico o workstation de laboratorio).
- **Ventaja:** Permite que clientes de hardware modesto disfruten de respuesta instantánea sin ralentizar su entorno.

---

## 5. Análisis de Factores Críticos: Fortalezas vs. Limitaciones

### 5.1 Fortalezas y Ventajas
- **Privacidad Total (Zero Telemetry):** Los contratos legales, comprobantes y fotos íntimas nunca abandonan la máquina o la red privada.
- **Cero Costos de Suscripción/Tokens:** Eliminación completa de facturación recurrente de APIs de terceros.
- **Experiencia de Usuario Fluida:** Interfaz tipo lanzador global (*Spotlight* o *Raycast*) accesible mediante atajo global (`Cmd/Alt + Espacio`).

### 5.2 Limitaciones Físicas y Retos Técnicos
- **Model Thrashing en VRAM limitada:** En equipos con menos de 8 GB de VRAM, alternar entre el modelo de visión, el de embeddings y el SLM puede generar demoras de recarga (3 a 8 segundos).
- **Consumo Energético e Indexación Inicial:** Procesar una biblioteca preexistente con miles de archivos requiere un sistema de colas con estrangulamiento (*throttling*) y pausa automática cuando el equipo opera con batería.
- **Confiabilidad del OCR y Extracción:** Documentos escaneados con baja resolución requieren pasos previos de preprocesamiento de imagen.

---

## 6. Requisitos de Hardware Sugeridos

- **Configuración Mínima (Solo CPU):**
  - Procesador: Intel Core i5 / AMD Ryzen 5 (generaciones recientes).
  - Memoria RAM: 16 GB DDR4/DDR5.
  - Almacenamiento: Unidad NVMe SSD.
  - Modelos recomendados: `Llama 3.2 (1B/3B Q4)`, `Moondream2`, `whisper-tiny`.
- **Configuración Óptima (Inferencia Acelerada):**
  - Apple Silicon: Mac M1/M2/M3/M4 con 16 GB o más de memoria unificada.
  - PC / Servidor Linux: GPU NVIDIA RTX (3060/4060 o superior con 8 GB a 12 GB VRAM).

---

## 7. Plan de Implementación por Fases (Vibe Coding Roadmap)

1. **Fase 1 - Scaffolding y Base Vectorial:** Estructura inicial en Tauri v2 + React, configuración de la tabla de registros en LanceDB y esquema de metadatos.
2. **Fase 2 - Demonio Watcher y Colas:** Implementación del vigilante de carpetas con `notify` en Rust y sistema de control de concurrencia para evitar saturación de CPU.
3. **Fase 3 - Pipeline de Ingesta Multimodal:** Integración de extractores para texto, invocación de Ollama Vision y bindings de Whisper para audio.
4. **Fase 4 - Motor de Búsqueda y Síntesis:** Creación del lanzador flotante, cálculo de similitud coseno multivectorial y desambiguación con el SLM local.