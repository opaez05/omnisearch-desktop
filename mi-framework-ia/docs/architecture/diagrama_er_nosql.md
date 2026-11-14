# Modelo ER NoSQL propuesto

> Modelo lógico para una evolución del almacenamiento de OmniSearch. La arquitectura documentada actualmente usa SQLite para metadatos y LanceDB para vectores; este diseño propone MongoDB para los metadatos y Redis para estructuras efímeras de ejecución. LanceDB continúa como almacén vectorial.

![Diagrama ER NoSQL de OmniSearch](diagrama_er_nosql.png)

```mermaid
---
title: Modelo ER NoSQL de OmniSearch
---
erDiagram
    direction LR

    M_WATCHED_FOLDER["MongoDB: WatchedFolder"] {
        string id PK
        string rootPath UK
        boolean enabled
        datetime createdAt
    }
    M_FILE["MongoDB: File"] {
        string id PK
        string sha256 UK
        string mimeType
        int sizeBytes
        datetime modifiedAt
        string indexStatus
        datetime indexedAt
    }
    M_FILE_LOCATION["MongoDB: FileLocation"] {
        string id PK
        string fileId FK
        string watchedFolderId FK
        string absolutePath UK
        string fileName
        datetime discoveredAt
        boolean exists
    }
    M_EXTRACTION["MongoDB: Extraction"] {
        string id PK
        string fileId FK
        string modality
        string content
        string modelName
        string language
        datetime createdAt
    }
    M_CONTENT_CHUNK["MongoDB: ContentChunk"] {
        string id PK
        string extractionId FK
        int sequence
        string text
        string vectorRecordId
    }
    M_INDEX_JOB["MongoDB: IndexJob"] {
        string id PK
        string fileId FK
        string status
        int attempts
        string errorCode
        datetime createdAt
        datetime updatedAt
    }
    L_VECTOR_RECORD["LanceDB: VectorRecord"] {
        string id PK
        string chunkId UK
        string modelName
        string vector
    }
    R_INDEX_QUEUE["Redis: Stream index:jobs"] {
        string jobId
        int attempt
        datetime enqueuedAt
    }
    R_JOB_STATE["Redis: Key job:{jobId}"] {
        string jobId PK
        string state
        int progress
        datetime expiresAt
    }
    R_SEARCH_CACHE["Redis: Cache search:{queryHash}"] {
        string queryHash PK
        string resultReferences
        datetime expiresAt
    }

    M_WATCHED_FOLDER ||--o{ M_FILE_LOCATION : vigila
    M_FILE ||--|{ M_FILE_LOCATION : tiene_ubicaciones
    M_FILE ||--o{ M_EXTRACTION : genera
    M_EXTRACTION ||--o{ M_CONTENT_CHUNK : divide_en
    M_FILE ||--o{ M_INDEX_JOB : procesa
    M_CONTENT_CHUNK ||..o| L_VECTOR_RECORD : indexa_vector
    M_INDEX_JOB ||..o{ R_INDEX_QUEUE : publica_id_en
    M_INDEX_JOB ||..o| R_JOB_STATE : refleja_estado_temporal
    R_SEARCH_CACHE }o..o{ M_FILE : cachea_referencias_a

    classDef mongo fill:#e8f3e8,stroke:#39734a,color:#152b1a
    classDef redis fill:#fff0e8,stroke:#bf542b,color:#402012
    classDef vector fill:#e9efff,stroke:#4664a8,color:#172344
    class M_WATCHED_FOLDER,M_FILE,M_FILE_LOCATION,M_EXTRACTION,M_CONTENT_CHUNK,M_INDEX_JOB mongo
    class R_INDEX_QUEUE,R_JOB_STATE,R_SEARCH_CACHE redis
    class L_VECTOR_RECORD vector
```

## Colecciones MongoDB

- `files`: un documento canónico por hash SHA-256. Un contenido repetido reutiliza sus extracciones y vectores; cada copia física se registra por separado en `file_locations`.
- `file_locations`: relaciona el archivo lógico con cada ruta detectada y, cuando aplique, con la carpeta vigilada. Así se conserva la deduplicación sin perder las rutas alternativas.
- `extractions`: guarda texto extraído, caption de imágenes o transcripción de audio, junto con modalidad y modelo que produjo el resultado.
- `content_chunks`: fragmentos direccionables para búsquedas y embeddings. Se mantienen separados de `extractions` para evitar documentos MongoDB sin límite práctico de tamaño.
- `index_jobs`: registro duradero del ciclo de indexación, incluidos reintentos y errores. Redis no es la fuente de verdad del estado del trabajo.
- `watched_folders`: configuración de las carpetas monitorizadas.

## Estructuras Redis

- `index:jobs`: Redis Stream con grupos de consumidores para entregar trabajos pendientes al worker; cada entrada transporta el `jobId`, no el archivo completo.
- `job:{jobId}`: progreso consultable por la UI. Mantener mientras el trabajo está activo; aplicar TTL únicamente al estado terminal.
- `search:{queryHash}`: resultados recientes con referencias a archivos y puntuaciones. Aplicar un TTL corto y configurable; la pérdida de esta caché no afecta a los datos persistentes.

## Reglas de persistencia

1. Crear un índice único para `files.sha256` y otro para `file_locations.absolutePath` normalizada. Si el hash ya existe en otra ruta, agregar una ubicación y reutilizar el contenido indexado.
2. Persistir primero el `index_job` en MongoDB y publicar su identificador en Redis. Si falla la publicación, un reconciliador puede volver a encolar los trabajos duraderos pendientes.
3. Guardar los embeddings en LanceDB; MongoDB conserva `vectorRecordId` como referencia, no el vector denso. La clave del vector debe ser estable por fragmento y modelo.
4. Al completar o fallar un trabajo, actualizar MongoDB como registro duradero y Redis como estado de ejecución/consulta temporal.
5. Tratar rutas, captions, transcripciones y consultas como datos privados locales, de acuerdo con RNF-01.

## Límites del modelo

Este diagrama describe una propuesta NoSQL alineada con la deduplicación, indexación multimodal y cola asíncrona de la documentación. No implica que MongoDB o Redis ya estén integrados en el código actual ni reemplaza a LanceDB para búsqueda vectorial.