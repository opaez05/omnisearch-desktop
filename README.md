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

El proyecto sigue estándares rigurosos de arquitectura y diseño. Consulta los siguientes documentos (ubicados en `mi-framework-ia/docs/`) para entender el núcleo del sistema:

* 📐 [Arquitectura del Sistema](mi-framework-ia/docs/architecture.md) - Arquitectura Hexagonal y patrones de diseño en Rust.
* 📝 [Requerimientos Funcionales](mi-framework-ia/docs/requerimientos_funcionales.md) - Capacidades y funcionalidades del sistema.
* ⚙️ [Requerimientos No Funcionales](mi-framework-ia/docs/requerimientos_no_funcionales.md) - Restricciones técnicas, seguridad y métricas.
* 👤 [Casos de Uso](mi-framework-ia/docs/casos_de_uso.md) - Escenarios de interacción del usuario con el framework.
* 🛠️ [Product Requirements Document (PRD)](mi-framework-ia/docs/PRD.md) - Visión, alcance y estrategia técnica del producto.
* 📦 [Esquema de Manifiestos](mi-framework-ia/docs/manifest_schema.md) - Especificación del motor de Agentes y Skills de IA.

---

## 🚀 Stack Tecnológico Principal

* **Backend / Desktop:** Tauri v2, Rust (`notify`, `tokio`).
* **Frontend:** React, TypeScript, Tailwind CSS, Zustand.
* **Inteligencia Artificial:** Ollama, Whisper.cpp (Python/YAML Framework).
* **Bases de Datos:** LanceDB (Vectorial) / NoSQL (MongoDB o Redis).

> *"El futuro de los sistemas operativos no son las carpetas, es la recuperación semántica."*
