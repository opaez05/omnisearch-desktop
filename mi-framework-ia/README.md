# Explorador Semántico Local Inteligente (OmniSearch Desktop)

> **Tu cerebro digital, 100% privado y ejecutado localmente.**

El **Explorador Semántico Local** es una aplicación de escritorio revolucionaria construida con **Tauri, Rust y React** que sustituye la navegación manual por carpetas. Utilizando **Inteligencia Artificial Local** (Modelos de Lenguaje Pequeños, Visión Computacional y Transcripción de Audio), el sistema comprende el contenido de tus documentos, imágenes y notas de voz, permitiéndote encontrarlos usando lenguaje natural humano.

*"Muéstrame el contrato donde hablábamos de la penalización del 10% y la foto de la firma"* — **Todo sin que tus datos salgan de tu computadora.**

---

## ✨ Características Principales

* 🔒 **100% Privado (Zero Telemetry):** Tus archivos nunca abandonan tu máquina. Todo el procesamiento se hace localmente o en tu red privada de confianza.
* 🧠 **Búsqueda Semántica Multimodal:** Encuentra PDFs por su contenido, imágenes por lo que aparece en ellas (VLM) y audios por lo que se dijo (Whisper).
* ⚡ **Ultraligero y Rápido:** Construido con Tauri v2 y Rust, con un consumo de memoria mínimo en reposo (~50MB).
* 🕵️ **Indexación Invisible:** Opera silenciosamente en segundo plano detectando nuevos archivos en tus carpetas clave sin saturar tu CPU.
* 🚫 **Sin Costos Recurrentes:** Cero pagos por APIs. Uso exclusivo de modelos open-source como *Llama 3.2*, *Moondream2* y *BGE-Small*.

---

## 📚 Documentación del Proyecto

La documentación está organizada por categorías en [`docs/`](docs/README.md):

### 📦 Producto y Requisitos (`docs/product/`)
* 🛠️ [Product Requirements Document (PRD)](docs/product/PRD.md) — Visión, alcance y estrategia técnica del producto.
* 📝 [Requerimientos Funcionales](docs/product/requerimientos_funcionales.md) — Capacidades y funcionalidades del sistema.
* ⚙️ [Requerimientos No Funcionales](docs/product/requerimientos_no_funcionales.md) — Restricciones técnicas, seguridad y métricas.
* 👤 [Casos de Uso](docs/product/casos_de_uso.md) — Escenarios de interacción del usuario con el framework.

### 🏗️ Arquitectura Técnica (`docs/architecture/`)
* 📐 [Arquitectura del Sistema](docs/architecture/architecture.md) — Arquitectura Hexagonal y patrones de diseño en Rust.
* 📦 [Esquema de Manifiestos](docs/architecture/manifest_schema.md) — Especificación del motor de Agentes y Skills de IA.
* 🧩 [Especificación de Skills](docs/architecture/skills_spec.md) — Sistema de skills del framework.

### 📅 Sesiones de Trabajo (`docs/sessions/`)
* Bitácora acumulada de sesiones — ver también [`AGENTS.md`](AGENTS.md).

---

## 🚀 Stack Tecnológico Principal

* **Backend / Desktop:** Tauri v2, Rust (`notify`, `tokio`).
* **Frontend:** React, TypeScript, Tailwind CSS, Zustand.
* **Inteligencia Artificial:** Ollama, Whisper.cpp.
* **Bases de Datos:** LanceDB (Vectorial) + SQLite (Metadatos e índice).

---

## 🤖 Para el Agente de IA

Lee [`AGENTS.md`](AGENTS.md) antes de comenzar cualquier tarea. Contiene el contexto del proyecto, las convenciones de código y la bitácora de sesiones anteriores.

---

> *"El futuro de los sistemas operativos no son las carpetas, es la recuperación semántica."*
