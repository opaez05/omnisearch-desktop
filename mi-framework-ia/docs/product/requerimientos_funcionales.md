# Requerimientos Funcionales (RF)

Los Requerimientos Funcionales describen el comportamiento, las características y las funciones exactas que el **Explorador Semántico Local** debe realizar para satisfacer las necesidades del usuario, basándose en la ingesta y recuperación multimodal de archivos.

### Ingesta y Procesamiento de Archivos (Background Watcher)
* **RF-01 (Monitorización Continua):** El sistema debe detectar de forma automática e inmediata la creación, modificación o descarga de archivos dentro de los directorios preconfigurados por el usuario (ej. `Descargas`, `Documentos`) operando en segundo plano.
* **RF-02 (Gestión de Colas e Idempotencia):** Al detectar un archivo, el sistema debe generar su hash SHA-256. Si el hash ya existe en la base de datos (y la ruta es la misma), el sistema debe descartar el procesamiento para evitar duplicados.
* **RF-03 (Enrutamiento por Tipo MIME):** El sistema debe clasificar dinámicamente los archivos ingeridos en 3 flujos principales según su tipo: Documentos de Texto (PDF, DOCX, TXT), Imágenes (JPG, PNG, WebP) o Audio (WAV, MP3, M4A).

### Orquestación de Inteligencia Artificial (Skills Multimodales)
* **RF-04 (Extracción de Texto):** El sistema debe ser capaz de extraer el texto crudo del interior de documentos formales, ignorando formato innecesario, para su posterior indexación.
* **RF-05 (Comprensión Visual - VLM):** El sistema debe enviar las imágenes detectadas a un modelo de visión computacional local (ej. *Moondream2*) para generar una descripción densa ("caption") del contenido visual y extraer cualquier texto impreso en la imagen.
* **RF-06 (Transcripción de Voz - STT):** El sistema debe utilizar un modelo local de audio (ej. *Whisper.cpp*) para convertir archivos de voz en transcripciones de texto indexables.
* **RF-07 (Generación de Embeddings):** Todo texto extraído (de documentos, imágenes o audios) debe ser convertido a vectores densos mediante un modelo local de embeddings (ej. *BGE-Small*) y guardado en la base de datos vectorial con sus metadatos correspondientes.

### Búsqueda y Recuperación (Search Agent)
* **RF-08 (Búsqueda en Lenguaje Natural):** El usuario debe poder ingresar consultas en lenguaje natural complejo (ej. *"Muéstrame los apuntes de biología donde se habla de la mitocondria y el esquema dibujado a mano"*).
* **RF-09 (Recuperación Semántica Multivectorial):** El sistema debe convertir la consulta del usuario en un vector y ejecutar una búsqueda de similitud (ej. Distancia Coseno) en la base de datos vectorial para encontrar los archivos más relevantes.
* **RF-10 (Desambiguación con SLM):** Opcionalmente, el sistema debe utilizar un Modelo de Lenguaje Pequeño (SLM) para entender la intención compleja de la búsqueda y filtrar (re-rankear) los resultados antes de mostrarlos al usuario.

### Interfaz de Usuario (UI)
* **RF-11 (Activación Rápida):** La interfaz gráfica principal debe poder ser invocada instantáneamente mediante un atajo de teclado global (ej. `Cmd/Alt + Espacio`).
* **RF-12 (Previsualización de Resultados):** El sistema debe presentar una lista de resultados con una tarjeta visual que indique: Nombre del archivo, Ruta, Puntuación de similitud semántica y un extracto resaltado del contenido coincidente.
