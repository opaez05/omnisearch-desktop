# Historias de Usuario (HU) — OmniSearch Desktop

Este documento define las Historias de Usuario para el **Explorador Semántico Local Inteligente (OmniSearch Desktop)**. Están estructuradas bajo metodología ágil con criterios de aceptación en formato **BDD / Gherkin**, priorización **MoSCoW**, estimación en **Story Points** (secuencia Fibonacci) y una **Matriz de Trazabilidad** completa con los Requerimientos Funcionales (RF), Requerimientos No Funcionales (RNF) y Casos de Uso (CU).

---

## 👤 Rol del Sistema

* **Usuario Final:** Persona que almacena información diversa en su computador personal (documentos, imágenes, capturas, notas de voz) y necesita encontrarla instantáneamente mediante lenguaje natural y consultas multimodales, sin comprometer su privacidad ni enviar información a la nube. También se encarga de configurar sus preferencias locales (carpetas a vigilar, conexión con Ollama).

---

## 🗺️ Mapa de Épicas

1. **Épica 1: Vigilancia e Ingesta de Archivos en Segundo Plano**
2. **Épica 2: Extracción e Inferencia Multimodal Local (AI Skills)**
3. **Épica 3: Búsqueda Semántica, Re-ranking y RAG**
4. **Épica 4: Experiencia de Usuario y Modos de Interfaz (Desktop UI)**

---

## 📦 Épica 1: Vigilancia e Ingesta de Archivos en Segundo Plano

### HU-01: Detección e Ingesta Automática en Segundo Plano
* **Como:** Usuario Final.
* **Quiero:** Que el sistema detecte automáticamente cuando descargo, copio o creo archivos en mis carpetas configuradas (ej. `Descargas`, `Documentos`).
* **Para:** Que mis archivos se indexen de forma invisible sin necesidad de ejecutar procesos manuales de carga.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Detección en carpeta vigilada**
    * **Dado que** la aplicación está activa en segundo plano y la carpeta `Descargas` está configurada como vigilada,
    * **Cuando** el usuario guarda un nuevo archivo `contrato_arriendo.pdf` en dicha carpeta,
    * **Entonces** el subsistema de vigilancia (`notify`) debe capturar el evento `FileCreated` en menos de 1 segundo y colocar la ruta en la cola asíncrona de procesamiento.
  * **Escenario 2: Respeto a permisos de solo lectura**
    * **Dado que** se inicia la ingesta de un archivo,
    * **Cuando** el sistema procesa el contenido,
    * **Entonces** el archivo original no debe ser modificado, renombrado, movido ni eliminado bajo ninguna circunstancia.

* **Prioridad:** Must Have (Alta) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-01`, `RF-03`, `RNF-02`, `RNF-04` y `CU-01`.

---

### HU-02: Deduplicación Inteligente por Hash de Contenido
* **Como:** Usuario Final.
* **Quiero:** Que el sistema reconozca archivos repetidos o duplicados entre distintas carpetas.
* **Para:** Ahorrar memoria, espacio en disco y ciclos de cómputo de la GPU/CPU al evitar re-procesar archivos idénticos con IA.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Archivo idéntico copiado a otra carpeta**
    * **Dado que** existe un archivo indexado cuyo hash SHA-256 ya está registrado en SQLite,
    * **Cuando** el usuario copia ese mismo archivo a otra carpeta vigilada,
    * **Entonces** el sistema debe calcular el hash SHA-256, identificar la colisión exacta y asociar la nueva ruta al vector existente en LanceDB sin re-ejecutar los modelos de IA.
  * **Escenario 2: Archivo modificado con mismo nombre**
    * **Dado que** un archivo existente cambia su contenido en disco,
    * **Cuando** el watcher detecta el evento de modificación,
    * **Entonces** el sistema debe calcular el nuevo hash, invalidar el vector previo y generar el nuevo índice.

* **Prioridad:** Must Have (Alta) | **Estimación:** 3 Story Points
* **Trazabilidad:** Mapea con `RF-02`, `RNF-05` y `CU-04`.

---

### HU-03: Control de Concurrencia y Conciencia de Recursos
* **Como:** Usuario Final.
* **Quiero:** Que la ingesta en segundo plano limite su consumo de CPU, GPU y pause si estoy usando batería.
* **Para:** Poder continuar usando mi computador para trabajar o jugar sin que el ventilador se dispare ni se degrade el rendimiento general.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Control de concurrencia (Throttling)**
    * **Dado que** se ingresan 50 archivos de forma simultánea a la cola de ingesta,
    * **Cuando** el pipeline de procesamiento comienza a procesarlos,
    * **Entonces** el sistema debe procesar con un máximo de 2 tareas de inferencia de IA en paralelo para evitar saturar la VRAM y la CPU.
  * **Escenario 2: Pausa por uso de batería**
    * **Dado que** el equipo se desconecta de la corriente alterna (AC),
    * **Cuando** el monitor de energía detecta el estado de batería,
    * **Entonces** la cola de procesamiento pesado de IA debe suspenderse temporalmente hasta reconectar el cable de energía.

* **Prioridad:** Should Have (Media) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RNF-05`, `RNF-06`, `RNF-07`.

---

## 🧠 Épica 2: Extracción e Inferencia Multimodal Local (AI Skills)

### HU-04: Extracción de Texto e Indexación Vectorial de Documentos
* **Como:** Usuario Final.
* **Quiero:** Que el contenido textual de mis documentos (PDF, DOCX, TXT) sea extraído y convertido a representaciones semánticas.
* **Para:** Poder encontrar fragmentos relevantes de mis lecturas y reportes mediante búsquedas temáticas.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Extracción limpia de texto en PDF**
    * **Dado que** se recibe un archivo PDF con texto incrustado,
    * **Cuando** se ejecuta la skill `text_extractor`,
    * **Entonces** se debe extraer el texto crudo estructurado por chunks, descartar caracteres de control redundantes y generar vectores numéricos mediante el modelo local de embeddings (`bge-small-en-v1.5` o `nomic-embed-text`).
  * **Escenario 2: Almacenamiento en LanceDB**
    * **Dado que** se obtuvieron los vectores y metadatos del documento,
    * **Cuando** finaliza la vectorización,
    * **Entonces** los registros deben persistirse en la base de datos LanceDB embebida garantizando privacidad 100% local (Zero Telemetry).

* **Prioridad:** Must Have (Alta) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-04`, `RF-07`, `RNF-01`, `RNF-08` y `CU-01`.

---

### HU-05: Comprensión Visual y Subtitulado Automático de Imágenes (VLM)
* **Como:** Usuario Final.
* **Quiero:** Que mis imágenes, capturas de pantalla y fotos sean descritas automáticamente por un modelo de visión local.
* **Para:** Encontrar imágenes basándome en lo que aparece visualmente en ellas o en el texto impreso que contienen.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Inferencia de visión local con VLM**
    * **Dado que** se ingresa una imagen (`JPG`, `PNG` o `WebP`),
    * **Cuando** se activa la skill `vlm_captioner` conectada a `Moondream2` o `Florence-2`,
    * **Entonces** el modelo debe generar una descripción densa en lenguaje natural detallando los objetos visibles y el texto presente.
  * **Escenario 2: Indexación del caption visual**
    * **Dado que** el VLM devuelve el caption generado,
    * **Cuando** se completa la inferencia,
    * **Entonces** el texto descriptivo debe ser enviado al generador de embeddings para que la imagen sea recuperable a través de consultas semánticas.

* **Prioridad:** Must Have (Alta) | **Estimación:** 8 Story Points
* **Trazabilidad:** Mapea con `RF-05`, `RF-07`, `RNF-01`, `RNF-07` y `CU-03`.

---

### HU-06: Transcripción Automática de Archivos de Audio y Voz (STT)
* **Como:** Usuario Final.
* **Quiero:** Que mis grabaciones y notas de voz (`WAV`, `MP3`, `M4A`, `OGG`) sean transcritas a texto de forma local.
* **Para:** Recuperar audios de reuniones, entrevistas o notas personales buscando palabras clave de lo que se habló.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Transcripción con Whisper.cpp**
    * **Dado que** se detecta un archivo de audio soportado,
    * **Cuando** la skill de audio procesa el archivo mediante `whisper.cpp`,
    * **Entonces** se debe generar la transcripción de texto en el idioma detectado sin recurrir a servicios en la nube.
  * **Escenario 2: Vectorización de transcripción**
    * **Dado que** la transcripción fue completada,
    * **Cuando** se guarda el registro,
    * **Entonces** el texto transcrito se indexa en LanceDB vinculado a la ruta original del archivo de audio.

* **Prioridad:** Should Have (Media) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-06`, `RF-07`, `RNF-01` y `CU-01`.

---

## 🔎 Épica 3: Búsqueda Semántica, Re-ranking y RAG

### HU-07: Búsqueda Semántica en Lenguaje Natural de Conceptos Cruzados
* **Como:** Usuario Final.
* **Quiero:** Realizar búsquedas con oraciones naturales que crucen conceptos heterogéneos (ej. *"contrato con firma y audio de la junta"*).
* **Para:** Localizar archivos relacionados sin recordar nombres exactos, fechas o carpetas específicas.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Consulta multiconceptual**
    * **Dado que** existen documentos, imágenes y audios indexados en el sistema,
    * **Cuando** el usuario ingresa una consulta como *"el contrato donde hablábamos de la penalización y la foto de la firma"*,
    * **Entonces** el sistema debe convertir la consulta a vector y recuperar simultáneamente ambos archivos calculando la distancia coseno en LanceDB.
  * **Escenario 2: Latencia de respuesta**
    * **Dado que** el usuario presiona Enter en la barra de búsqueda,
    * **Cuando** se realiza la búsqueda vectorial pura,
    * **Entonces** los resultados deben calcularse y presentarse en pantalla en menos de **500 milisegundos**.

* **Prioridad:** Must Have (Alta) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-08`, `RF-09`, `RNF-01`, `RNF-03`, `RNF-08` y `CU-02`.

---

### HU-08: Re-ranking Semántico y Desambiguación con SLM Local
* **Como:** Usuario Final.
* **Quiero:** Que un modelo de lenguaje pequeño (SLM) reordene y refine los resultados obtenidos de la búsqueda vectorial.
* **Para:** Que los primeros resultados coincidan con mi intención real incluso cuando la búsqueda contiene ambigüedades.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Reordenamiento contextual**
    * **Dado que** la búsqueda vectorial retorna 15 candidatos preliminares,
    * **Cuando** se activa el paso de re-ranking con el SLM local (`Llama 3.2` o `Gemma 2`),
    * **Entonces** el modelo debe evaluar la relevancia semántica de cada extracto frente a la consulta del usuario y posicionar los más acertados al inicio.
  * **Escenario 2: Degradación elegante si el SLM está offline**
    * **Dado que** el servidor Ollama no está disponible o el usuario tiene hardware limitado,
    * **Cuando** se ejecuta la búsqueda,
    * **Entonces** el sistema debe omitir el re-ranking y mostrar directamente los resultados ordenados por similitud coseno sin bloquear la experiencia.

* **Prioridad:** Could Have (Baja) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-10`, `RNF-01`, `RNF-10` y `CU-02`.

---

### HU-09: Preguntas y Respuestas sobre Documentos (RAG Local)
* **Como:** Usuario Final.
* **Quiero:** Hacer preguntas directas en lenguaje natural sobre el contenido de mis archivos y recibir una respuesta sintetizada.
* **Para:** Conocer rápidamente el resumen o un dato específico de mis documentos sin tener que abrirlos y leerlos por completo.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Consulta RAG con contexto documental**
    * **Dado que** tengo documentos indexados y Ollama está en línea,
    * **Cuando** pregunto *"¿Cuál es la fecha límite estipulada en el contrato de arriendo?"*,
    * **Entonces** el sistema debe recuperar los fragmentos relevantes, inyectarlos en el prompt del SLM y devolver una respuesta en texto claro citando la información extraída.
  * **Escenario 2: Notificación de falta de contexto**
    * **Dado que** la pregunta no tiene relación con ningún archivo indexado,
    * **Cuando** el SLM procesa la solicitud,
    * **Entonces** debe responder indicando que no encontró información sobre ese tema en los documentos locales en lugar de alucinar.

* **Prioridad:** Should Have (Media) | **Estimación:** 8 Story Points
* **Trazabilidad:** Mapea con `RF-08`, `RF-10`, `RNF-01` y prototipo `App.tsx`.

---

## 🖥️ Épica 4: Experiencia de Usuario y Modos de Interfaz (Desktop UI)

### HU-10: Invocación Instantánea mediante Lanzador Flotante (Spotlight/Raycast)
* **Como:** Usuario Final.
* **Quiero:** Abrir y cerrar una barra de búsqueda flotante centrada en la pantalla usando un atajo de teclado global (`Cmd/Alt + Espacio`).
* **Para:** Buscar cualquier archivo desde cualquier aplicación que esté usando sin interrumpir mi flujo de trabajo.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Despliegue con atajo de teclado**
    * **Dado que** estoy trabajando en cualquier aplicación externa (ej. navegador, editor de texto),
    * **Cuando** presiono `Cmd + Espacio` (en macOS) o `Alt + Espacio` (en Windows/Linux),
    * **Entonces** la ventana flotante de OmniSearch debe aparecer al frente centrada en la pantalla en menos de 100ms con el foco inmediatamente en el campo de texto.
  * **Escenario 2: Ocultamiento rápido**
    * **Dado que** la barra flotante está visible,
    * **Cuando** presiono la tecla `Escape` o hago clic fuera de la ventana,
    * **Entonces** la ventana debe ocultarse inmediatamente sin cerrar el proceso en segundo plano.

* **Prioridad:** Must Have (Alta) | **Estimación:** 3 Story Points
* **Trazabilidad:** Mapea con `RF-11`, `RNF-04`, `RNF-09`, `RNF-10` y `CU-02`.

---

### HU-11: Previsualización Enriquecida y Apertura Directa de Resultados
* **Como:** Usuario Final.
* **Quiero:** Ver una lista interactiva de resultados con tarjetas que muestren el nombre del archivo, tipo, score de relevancia y extracto resaltado, pudiendo abrirlo con un clic o Enter.
* **Para:** Confirmar de inmediato si es el archivo correcto y abrirlo sin tener que navegar manualmente por el explorador de archivos.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Visualización de tarjeta de resultado**
    * **Dado que** la búsqueda arrojó coincidencias,
    * **Cuando** se renderiza la lista de resultados,
    * **Entonces** cada tarjeta debe presentar: ícono por tipo (PDF/IMG/Audio), nombre del archivo, ruta relativa, porcentaje de coincidencia semántica y el fragmento del texto o caption donde ocurrió la coincidencia.
  * **Escenario 2: Apertura en la aplicación predeterminada**
    * **Dado que** el usuario selecciona una tarjeta de resultado,
    * **Cuando** hace doble clic o presiona `Enter` sobre ella,
    * **Entonces** el archivo debe abrirse en el visor nativo del sistema operativo (ej. visor de fotos, lector PDF o reproductor de audio) usando las APIs seguras de Tauri.

* **Prioridad:** Must Have (Alta) | **Estimación:** 3 Story Points
* **Trazabilidad:** Mapea con `RF-12`, `RNF-02`, `RNF-10` y `CU-02`.

---

### HU-12: Dashboard de Configuración, Carpetas y Salud del Sistema
* **Como:** Usuario Final.
* **Quiero:** Contar con una vista independiente de Configuración/Dashboard donde pueda administrar las carpetas vigiladas, verificar el estado de Ollama y ver estadísticas de indexación.
* **Para:** Tener visibilidad total y control sobre qué partes de mi disco están siendo vigiladas y cómo están respondiendo los modelos de IA.

* **Criterios de Aceptación (Gherkin):**
  * **Escenario 1: Gestión de carpetas vigiladas**
    * **Dado que** el usuario abre la ventana de configuración,
    * **Cuando** agrega una nueva carpeta o remueve una existente de la lista de vigilancia,
    * **Entonces** el vigilante en segundo plano debe actualizar sus suscripciones sin necesidad de reiniciar la aplicación.
  * **Escenario 2: Monitor de salud de Ollama e indicadores de estado**
    * **Dado que** la aplicación está abierta,
    * **Cuando** se visualiza la barra de estado o el dashboard,
    * **Entonces** se debe mostrar un indicador dinámico en tiempo real del estado de conexión con Ollama (Online/Offline/Local Fallback) y el número total de chunks indexados en LanceDB.

* **Prioridad:** Should Have (Media) | **Estimación:** 5 Story Points
* **Trazabilidad:** Mapea con `RF-01`, `RNF-01`, `RNF-08` y prototipo `App.tsx`.

---

## 📊 Matriz de Trazabilidad Completa

La siguiente tabla certifica la cobertura de todos los Requerimientos Funcionales (`RF`), Requerimientos No Funcionales (`RNF`) y Casos de Uso (`CU`) definidos en el proyecto:

| ID HU | Nombre de la Historia de Usuario | Épica | RFs Cubiertos | RNFs Cubiertos | Caso de Uso | Prioridad | Story Points |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **HU-01** | Detección e Ingesta Automática | Épica 1 | RF-01, RF-03 | RNF-02, RNF-04 | CU-01 | Must | 5 |
| **HU-02** | Deduplicación Inteligente por Hash | Épica 1 | RF-02 | RNF-05 | CU-04 | Must | 3 |
| **HU-03** | Control de Concurrencia y Batería | Épica 1 | — | RNF-05, RNF-06, RNF-07 | CU-01 | Should | 5 |
| **HU-04** | Extracción e Indexación de Documentos | Épica 2 | RF-04, RF-07 | RNF-01, RNF-08 | CU-01 | Must | 5 |
| **HU-05** | Comprensión Visual con VLM | Épica 2 | RF-05, RF-07 | RNF-01, RNF-07 | CU-03 | Must | 8 |
| **HU-06** | Transcripción de Audio y Voz (STT) | Épica 2 | RF-06, RF-07 | RNF-01 | CU-01 | Should | 5 |
| **HU-07** | Búsqueda Semántica Multiconceptual | Épica 3 | RF-08, RF-09 | RNF-01, RNF-03, RNF-08 | CU-02 | Must | 5 |
| **HU-08** | Re-ranking Semántico con SLM | Épica 3 | RF-10 | RNF-01, RNF-10 | CU-02 | Could | 5 |
| **HU-09** | Preguntas y Respuestas (RAG Local) | Épica 3 | RF-08, RF-10 | RNF-01 | CU-02 | Should | 8 |
| **HU-10** | Lanzador Flotante Global (Spotlight) | Épica 4 | RF-11 | RNF-04, RNF-09, RNF-10 | CU-02 | Must | 3 |
| **HU-11** | Previsualización y Apertura de Resultados | Épica 4 | RF-12 | RNF-02, RNF-10 | CU-02 | Must | 3 |
| **HU-12** | Dashboard de Configuración y Salud | Épica 4 | RF-01 | RNF-01, RNF-08 | CU-01 | Should | 5 |

* **Total de Historias de Usuario:** 12
* **Total Story Points:** 60 pts
* **Distribución MoSCoW:**
  * **Must Have:** 7 HUs (32 pts)
  * **Should Have:** 4 HUs (23 pts)
  * **Could Have:** 1 HU (5 pts)
