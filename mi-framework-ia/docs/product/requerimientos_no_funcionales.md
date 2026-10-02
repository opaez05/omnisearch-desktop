# Requerimientos No Funcionales (RNF)

Los Requerimientos No Funcionales definen los atributos de calidad, seguridad, rendimiento y restricciones arquitectónicas bajo los cuales debe operar el **Explorador Semántico Local**.

### Privacidad y Seguridad (Zero Telemetry)
* **RNF-01 (100% Local):** El sistema debe garantizar que el 100% del procesamiento de IA (Embeddings, Visión, Transcripción y Razonamiento) ocurra en la máquina del usuario o en un servidor dedicado en una LAN privada. Ningún dato, vector o archivo debe enviarse a APIs públicas de terceros (como OpenAI o Anthropic).
* **RNF-02 (Aislamiento de Archivos):** La aplicación debe tener permisos estrictos de solo lectura (`file_system_read`) para la mayoría de operaciones. El sistema nunca debe borrar, reubicar o modificar de forma destructiva los archivos originales del disco del usuario sin confirmación explícita.

### Rendimiento y Tiempo de Respuesta
* **RNF-03 (Latencia de Búsqueda):** El tiempo transcurrido desde que el usuario oprime "Enter" en la barra de búsqueda hasta que se pintan los resultados en pantalla no debe exceder los **500 milisegundos** para la búsqueda vectorial pura.
* **RNF-04 (Consumo de Memoria en Reposo):** Cuando el usuario no está buscando activamente y no hay archivos en la cola de indexación, el proceso principal de escritorio (Tauri) no debe consumir más de **60 MB de memoria RAM**.

### Concurrencia y Estabilidad del Sistema
* **RNF-05 (Throttling y Control de Estrangulamiento):** La ingesta en segundo plano (procesamiento por lotes de nuevos archivos) debe estar limitada por semáforos de concurrencia (ej. máximo 2 modelos concurrentes) para no asfixiar la CPU/GPU del equipo e interferir con las tareas primarias del usuario.
* **RNF-06 (Conciencia de Batería - *Deseable*):** Si el sistema detecta que la computadora está ejecutándose bajo alimentación de batería (desconectada de AC), el flujo de indexación pesada debe pausarse automáticamente.
* **RNF-07 (Prevención de Model Thrashing):** El gestor de inferencia debe agrupar u optimizar las llamadas a Ollama para minimizar los tiempos muertos causados al descargar de memoria de VRAM el modelo VLM para cargar el modelo de Embeddings en hardware modesto.

### Escalabilidad de Almacenamiento
* **RNF-08 (Volumen de Indexación):** La base de datos vectorial (VectorStore) y la base de metadatos (NoSQL/SQLite) deben soportar y responder eficientemente con una biblioteca de al menos **100,000 archivos** indexados sin degradación notable en la velocidad de búsqueda.

### Usabilidad y Portabilidad
* **RNF-09 (Multiplataforma):** Gracias al uso de Rust y Tauri, el binario debe poder compilarse y ejecutarse en Windows (x86_64), macOS (Apple Silicon ARM64) y distribuciones modernas de Linux.
* **RNF-10 (Experiencia UI/UX):** La interfaz gráfica no debe bloquearse (freeze) durante la ingesta de archivos. Todas las llamadas pesadas de indexación e inferencia deben ejecutarse asíncronamente para mantener React/Vite a 60FPS.
