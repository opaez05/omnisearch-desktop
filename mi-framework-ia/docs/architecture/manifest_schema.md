# Especificación del Esquema de Manifiesto (`manifest.yaml`)

El archivo `manifest.yaml` es el **contrato formal** que todo Agente y todo Skill debe incluir en su carpeta correspondiente. Permite que el **Orquestador (`core/orchestrator`)** conozca qué capacidades existen, cuáles son sus esquemas de entrada y salida, qué permisos requieren y qué otras skills necesitan invocar sin inspeccionar código ejecutable.

---

## 1. Esquema Genérico de Manifiesto

Todo manifiesto debe seguir esta estructura base válida en YAML:

```yaml
name: string               # Nombre único en snake_case
version: string            # Versión semántica (ej. "1.0.0")
type: string               # Tipo de componente: "agent" | "skill"
description: string        # Descripción funcional que el orquestador usa para decidir cuándo invocarlo
author: string             # Creador o responsable del módulo
permissions: list[string]  # Lista de permisos de sistema necesarios
input_schema: object       # Definición JSON Schema de los parámetros de entrada
output_schema: object      # Definición JSON Schema del resultado esperado
```

---

## 2. Manifiesto para Agentes (`type: agent`)

Los agentes incluyen campos adicionales para especificar qué skills requieren para operar y qué activadores (*triggers*) reconocen.

### Campos específicos de Agente:
* `skills_required`: Lista de nombres de skills registradas que el agente necesita invocar.
* `triggers`: Frases o intenciones clave que el router usa para dirigir mensajes a este agente.

### Ejemplo Real: `agents/ingest_agent/manifest.yaml`
```yaml
name: ingest_agent
version: 1.0.0
type: agent
description: Agente encargado de recibir un nuevo archivo detectado en disco, determinar su tipo MIME y orquestar la ingesta y vectorización.
author: Esteban
skills_required:
  - text_extractor
  - vlm_captioner
  - whisper_transcriber
  - embedding_generator
  - lancedb_indexer
permissions:
  - file_system_read
  - lancedb_write
  - ollama_api_access
triggers:
  - "nuevo archivo detectado"
  - "reindexar directorio"
input_schema:
  type: object
  properties:
    file_path:
      type: string
      description: Ruta absoluta del archivo a procesar
  required:
    - file_path
output_schema:
  type: object
  properties:
    status:
      type: string
      enum: ["SUCCESS", "SKIPPED", "FAILED"]
    indexed_id:
      type: string
```

---

## 3. Manifiesto para Skills (`type: skill`)

Las skills son determinísticas y no tienen estado propio. Su manifiesto declara con precisión sus parámetros de entrada y salida.

### Ejemplo Real: `skills/vlm_captioner/manifest.yaml`
```yaml
name: vlm_captioner
version: 1.0.0
type: skill
description: Utiliza un modelo de visión por computadora local (Moondream2 / Florence-2) vía Ollama para generar una descripción textual detallada de una imagen.
author: Esteban
permissions:
  - file_system_read
  - ollama_api_access
input_schema:
  type: object
  properties:
    image_path:
      type: string
      description: Ruta absoluta de la imagen (.jpg, .png, .webp)
    prompt:
      type: string
      default: "Describe en detalle el contenido de esta imagen, texto impreso y firmas."
  required:
    - image_path
output_schema:
  type: object
  properties:
    caption:
      type: string
      description: Descripción textual generada por el VLM
```

---

## 4. Validación de Permisos Disponibles

Para garantizar la seguridad del sistema, la propiedad `permissions` solo admite los siguientes valores predefinidos:

* `file_system_read`: Permiso para leer archivos locales.
* `file_system_write`: Permiso para escribir o crear archivos locales.
* `lancedb_read` / `lancedb_write`: Acceso a la base de datos vectorial local.
* `sqlite_read` / `sqlite_write`: Acceso al archivo `index.db`.
* `ollama_api_access`: Permiso para hacer inferencia local vía HTTP en `localhost:11434`.
* `git_execution`: Permiso para ejecutar comandos `git`.
