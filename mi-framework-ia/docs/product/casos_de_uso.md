# Casos de Uso del Explorador Semántico Local

Este documento detalla los principales escenarios de interacción (*Casos de Uso*) entre los actores (Usuario, Sistema de Archivos, Orquestador de IA) y el Framework.

---

## CU-01: Indexación Automática en Segundo Plano (Ingesta)
**Actor Principal:** Sistema (Vigilante de Archivos / Notify)
**Actor Secundario:** Agente de Ingesta (`ingest_agent`), Modelos Locales (Ollama/Whisper)
**Precondiciones:** La aplicación de escritorio está corriendo en segundo plano y el watcher está suscrito a la carpeta de `Descargas`.
**Flujo Principal:**
1. El usuario descarga un archivo PDF llamado `recibo_luz_marzo.pdf` desde su navegador.
2. El Watcher detecta el evento del sistema operativo (`FileCreated`).
3. El Watcher coloca la ruta del archivo en la cola asíncrona.
4. El `ingest_agent` retira el archivo de la cola, calcula el hash SHA-256 y verifica que no exista en la BD.
5. El agente delega al skill `text_extractor`, obteniendo el texto plano del PDF.
6. El texto es enviado al `embedding_generator` (Ollama BGE-Small) para generar los vectores f32.
7. Los vectores, acompañados de los metadatos (ruta, nombre, fecha), se insertan en LanceDB y la base NoSQL.
**Postcondición:** El recibo de luz está indexado semánticamente sin ninguna intervención manual del usuario.

---

## CU-02: Búsqueda Semántica de Conceptos Cruzados
**Actor Principal:** Usuario
**Precondiciones:** El sistema tiene documentos, fotos y audios previamente indexados.
**Flujo Principal:**
1. El usuario presiona `Cmd/Alt + Espacio` para abrir la barra flotante de OmniSearch.
2. El usuario escribe: *"Busca la foto de la pizarra donde dibujamos el esquema de la base de datos de usuarios y también los audios de esa misma reunión"*.
3. El `search_agent` recibe el prompt y lo envía al modelo local de embeddings para vectorizar la intención de búsqueda.
4. El agente consulta a la base de datos vectorial para calcular las distancias coseno entre el vector de la búsqueda y los elementos de la BD.
5. *(Opcional)* Un modelo SLM local razona sobre los resultados y re-ordena (re-rank) las coincidencias de mayor a menor precisión.
6. La Interfaz de Usuario muestra de inmediato: La fotografía (cuyo caption generado por VLM dice "esquema en pizarra sobre base de usuarios") y los archivos MP3 (cuya transcripción de Whisper contiene la discusión de la reunión).
7. El usuario da clic sobre la foto para abrirla en su visor predeterminado.
**Postcondición:** El usuario encuentra información multimodal que de otro modo habría tardado minutos en buscar por palabras clave en el buscador clásico de Windows/Mac.

---

## CU-03: Procesamiento Multimodal de una Imagen (VLM)
**Actor Principal:** Sistema (Agente de Ingesta)
**Flujo Principal:**
1. Se detecta la creación de `screenshot_factura.png`.
2. El `ingest_agent` reconoce el MIME type como imagen y activa la skill `vlm_captioner`.
3. La imagen se codifica y se envía al modelo local `Moondream2`.
4. El modelo de visión examina la factura y devuelve el caption: *"Imagen de un comprobante de pago electrónico de Banco XYZ por un valor de 150 dólares, de Juan Pérez a María Gómez."*
5. Este caption se envía a `embedding_generator` para crear su vector semántico y ser indexado.

---

## CU-04: Gestión de Duplicados en Directorios Vigilados
**Actor Principal:** Sistema
**Flujo Principal:**
1. El usuario copia por accidente una carpeta completa de PDFs que ya estaban indexados a otro directorio que también es vigilado.
2. El Watcher encola los 50 PDFs.
3. El sistema calcula los hashes SHA-256 de forma inmediata.
4. Consulta en la base de metadatos (NoSQL) si esos hashes ya están presentes.
5. Al coincidir el hash, el sistema descarta hacer inferencia de IA (salvando recursos de CPU/VRAM) y simplemente asocia la nueva ruta al vector ya existente en la base de datos.
