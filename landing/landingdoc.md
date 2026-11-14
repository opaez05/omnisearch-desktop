# Documentación Técnica: Landing Page y Portal de Descarga — OmniSearch Desktop

## 1. Estructura Implementada

Se construyó una landing page estática y portal de descarga multiplataforma alojada en la carpeta `landing/` en la raíz del proyecto, utilizando exclusivamente **HTML5, CSS3 y JavaScript Vanilla** (sin frameworks ni dependencias externas):

```text
omnisearch-desktop/
└── landing/
    ├── index.html    # Estructura semántica y componentes de interfaz
    ├── styles.css    # Sistema de diseño, variables CSS, layouts y diseño responsivo
    └── app.js        # Detección de sistema operativo, modales y simulador de búsqueda
```

---

## 2. Detalle Técnico por Archivo

### 2.1. `landing/index.html` (Estructura y Contenido)
Define la maquetación semántica y los bloques funcionales de la página:
* **Cabecera fija (`<header class="navbar">`):** Barra de navegación superior con el logotipo de **OmniSearch Desktop**, enlaces de anclaje interno (`#descargar`, `#demo`, `#caracteristicas`, `#arquitectura`), acceso a GitHub y botón de descarga directa.
* **Portal de Descarga Multiplataforma (`#descargar`):**
  * Banner superior de versión (`v0.4.2`).
  * Pestañas de selección de sistema operativo (`Windows`, `macOS`, `Linux`) mediante atributos `role="tablist"` y `data-os`.
  * Bloque de descarga principal con botones para arquitecturas `x64` / `ARM64` (o `.AppImage` / `.deb` en Linux) y contenedor de requisitos mínimos.
  * Bloque de instalación vía terminal (`CLI & Pack de Modelos Locales`) con bloque `<code>` y botón de copiado rápido.
* **Simulador Interactivo (`#demo`):** Ventana tipo aplicación de escritorio con barra superior, botón de escaneo de carpeta, barra de progreso, campo de búsqueda semántica, chips de consultas rápidas, listado de resultados y panel lateral de inspección vectorial (`<aside class="inspector-panel">`).
* **Sección de Características (`#caracteristicas`):** Cuadrícula tipo *Bento Grid* con 5 tarjetas (`100% Privado`, `Búsqueda Semántica Multimodal`, `Ultraligero y Rápido`, `Indexación Invisible` y `Sin Costos Recurrentes`).
* **Stack Tecnológico (`#arquitectura`):** Cuadrícula de 4 tarjetas detallando el uso de **Tauri v2 + Rust + React**, **BGE-Small**, **Moondream2** y **Whisper + Llama 3.2**.
* **Modal de Descarga (`#download-modal`):** Ventana emergente oculta por defecto (`hidden`) que muestra el archivo seleccionado, su suma de verificación `SHA-256` y los pasos de instalación.

---

### 2.2. `landing/styles.css` (Estilos y Sistema Visual)
Implementa el sistema visual oscuro (*Dark Slate & Electric Sky Blue*) mediante variables CSS nativas y layouts modernos:
* **Variables globales (`:root`):** Define la paleta de fondos (`#0B1120`, `#0F172A`, `#1E293B`), colores de acento (`#38BDF8`, `#34D399`), tipografía (`Inter` y `JetBrains Mono`), bordes y radios.
* **Efectos visuales:** Iluminación ambiental mediante capas desenfocadas (`.bg-glow` con `filter: blur(130px)`) y barra superior translúcida (`backdrop-filter: blur(14px)`).
* **Sistemas de distribución (CSS Grid y Flexbox):**
  * `.app-workspace`: Grid de dos columnas (`1.4fr 1fr`) para separar la lista de resultados del inspector vectorial.
  * `.bento-grid`: Grid de 6 columnas donde las 2 tarjetas principales ocupan 3 columnas (`grid-column: span 3`) y las 3 restantes ocupan 2 columnas cada una (`grid-column: span 2`).
  * `.stack-grid`: Grid de 4 columnas iguales (`repeat(4, 1fr)`).
* **Diseño responsivo (`@media`):** Reglas adaptativas para pantallas menores a `900px` y `560px` que apilan las columnas a una sola fila y ajustan los espaciados.

---

### 2.3. `landing/app.js` (Lógica e Interactividad)
Encapsula toda la lógica del cliente dentro de una función autoejecutable (`IIFE`) sin contaminar el ámbito global:
* **Configuración por Sistema Operativo (`OS_CONFIG`):** Diccionario con textos, etiquetas de botones, requisitos mínimos, comandos de terminal, nombres de archivos instaladores, hashes `SHA-256` y pasos de instalación para `windows`, `macos` y `linux`.
* **Detección automática de plataforma (`detectOS`):** Analiza `navigator.userAgent` al cargar el DOM para activar por defecto la pestaña del sistema operativo del usuario (`updateOSView`).
* **Gestión de Modal y Portapapeles:**
  * `openDownloadModal`: Inyecta dinámicamente el nombre del instalador, el hash `SHA-256` y la lista `<li>` de pasos de instalación según el sistema activo.
  * Evento en `#btn-copy-cli`: Copia el comando de instalación al portapapeles usando `navigator.clipboard.writeText()` y actualiza temporalmente el texto del botón a `¡Copiado!`.
* **Motor de Búsqueda Simulado (`MOCK_FILES`):**
  * `filterAndRenderResults`: Filtra en tiempo real los registros de ejemplo (PDFs, imágenes y notas de voz) comparando los términos ingresados contra nombres, fragmentos y palabras clave, renderizando las tarjetas en `#search-results-list`.
  * `renderInspector`: Actualiza el panel derecho con la ruta local, el modelo de IA asociado, el porcentaje de similitud y el fragmento de contenido al seleccionar cualquier resultado.
  * Simulación de escaneo (`#btn-scan-folder`): Anima el ancho de `.scan-bar-fill` y actualiza el estado del botón para simular la indexación local.