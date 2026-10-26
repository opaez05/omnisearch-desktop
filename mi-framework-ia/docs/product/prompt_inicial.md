# Documento de Especificación Inicial y Prompt Semilla

> **Documento:** `docs/product/prompt_inicial.md`  
> **Fecha de registro:** 2026-10-26  
> **Propósito:** Preservar el prompt y las especificaciones fundacionales con las que se conceptualizó e inició el desarrollo de **OmniSearch Desktop** (*Explorador Semántico Local Inteligente*).

---

## 1. Contexto de Creación

Este documento preserva la directriz y especificación de producto original empleada para el diseño de la aplicación. Describe la transición de la navegación clásica jerárquica de carpetas hacia un sistema de **organización invisible y recuperación semántica multimodal 100% privada y local**.

---

## 2. Prompt Inicial / Especificación de Origen

```markdown
Diseñar y desarrollar un "Explorador Semántico Local Inteligente" (OmniSearch Desktop) enfocado en el enfoque "Reto Pro".

La aplicación debe ser de escritorio, multiplataforma, y reemplazar la navegación manual de carpetas por una interfaz de recuperación semántica multimodal y organización invisible en tiempo real.

Requisitos Fundacionales:
1. Privacidad Total (100% Local / Zero Cloud):
   - Todo procesamiento (embeddings, visión multimodal, transcripción de voz, búsqueda y re-ranking) debe ejecutarse localmente sin transmitir datos personales a la nube pública.
   - Opcionalmente soportar un nodo Ollama centralizado dentro de la red local para computación distribuida.

2. Monitorización Continua y en Segundo Plano:
   - Vigilar de forma no invasiva directorios clave (como Descargas y Documentos) detectando creación o descarga de nuevos archivos sin sondeo activo intensivo en disco.

3. Pipeline de Ingesta Multimodal:
   - Documentos (PDF, DOCX, TXT): Extracción de texto y cálculo de embeddings densos.
   - Imágenes (JPG, PNG, WebP): Inferencia con VLM local (ej. Moondream2 o Florence-2) para descripciones ricas de contenido, sellos, firmas y texto visual.
   - Audio (WAV, MP3, M4A, OGG): Transcripción automática de voz a texto (Whisper).

4. Búsqueda Semántica Multiconceptual y Desambiguación:
   - Responder a consultas complejas que cruzan conceptos independientes (ejemplo: "Muéstrame el contrato donde hablábamos de la penalización del 10% y la foto de la firma").
   - Recuperación multivectorial por similitud coseno combinada con un SLM local (Llama 3.2 / Gemma 2) para re-ranking y síntesis.

5. Arquitectura Técnica y Restricciones de Rendimiento:
   - Capa de Escritorio: Tauri v2 (Rust + React/TypeScript) para mantener un ejecutable ultraligero y consumo de RAM mínimo (<60 MB en reposo).
   - Base de Datos: Motor NoSQL/vectorial embebido sin requerir Docker ni servicios externos pesados (LanceDB + SQLite-JSON1 para deduplicación por hash SHA-256).
   - Patrón Arquitectónico: Arquitectura Hexagonal (Clean Architecture) con separación estricta entre puertos, adaptadores e interfaces IPC.
   - Acceso Rápido: Lanzador flotante tipo Spotlight / Raycast activable con atajo global (Cmd/Alt + Espacio).
```

---

## 3. Desglose de Capacidades Derivadas

A partir de esta solicitud inicial, el sistema se estructuró en los siguientes componentes clave documentados en el proyecto:

| Componente | Especificación Derivada | Documento de Referencia |
| :--- | :--- | :--- |
| **Visión de Producto** | Alcance del "Reto Pro", topologías y análisis de limitaciones de hardware | [`docs/product/PRD.md`](product/PRD.md) |
| **Requerimientos Funcionales** | Especificación detallada de RF-01 a RF-12 | [`docs/product/requerimientos_funcionales.md`](product/requerimientos_funcionales.md) |
| **Historias de Usuario** | Escenarios BDD/Gherkin y matriz de trazabilidad (HU-01 a HU-12) | [`docs/product/historias_de_usuario.md`](product/historias_de_usuario.md) |
| **Arquitectura de Software** | Arquitectura Hexagonal en Tauri v2 (Rust) + React/TS | [`docs/architecture/architecture.md`](../architecture/architecture.md) |
| **Persistencia NoSQL** | Base de datos embebida (LanceDB + SQLite-JSON1) frente a MongoDB/Redis | [`docs/architecture/database_architecture.md`](../architecture/database_architecture.md) |
| **Prototipo de UI** | Diseño visual de interfaz modal split-pane (Spotlight/Raycast) | [`docs/prototipos/pantalla_principal_usuario.png`](../prototipos/pantalla_principal_usuario.png) |

---

## 4. Trazabilidad

- **Archivo generado:** `docs/product/prompt_inicial.md`
- **Índice general:** Actualizado en [`docs/README.md`](../README.md) bajo la sección de producto.
