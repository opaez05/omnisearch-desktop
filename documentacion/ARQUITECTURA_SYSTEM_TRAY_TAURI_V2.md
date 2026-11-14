# Arquitectura e Implementación de System Tray en Tauri v2 — OmniSearch Desktop

## 1. Decisión Arquitectónica: Dos Ventanas (`main` + `tray-popup`) vs. Ventana Única

Se implementó la estrategia de **dos ventanas independientes de Tauri (`main` y `tray-popup`)** definidas en `tauri.conf.json`:
1. **`main` (`1180×780`)**: Ventana principal completa con barra de título (`decorations: true`), redimensionable (`resizable: true`) y visible en la barra de tareas (`skipTaskbar: false`).
2. **`tray-popup` (`360×500`)**: Ventana emergente compacta sin bordes (`decorations: false`), tamaño fijo (`resizable: false`), siempre encima (`alwaysOnTop: true`), oculta de la barra de tareas (`skipTaskbar: true`) y que se oculta automáticamente al perder el foco (`WindowEvent::Focused(false)`).

### Justificación técnica frente a mutar una sola ventana:
- **Cero parpadeo del gestor de ventanas (DWM / Mutter / Quartz):** Cambiar `decorations`, `skipTaskbar` y dimensiones en caliente sobre una única ventana provoca parpadeos visuales en Windows y fallos de posicionamiento en Wayland/macOS.
- **Compartición de estado en tiempo real:**
  - **En Rust (Backend):** Ambas ventanas acceden al mismo `tauri::State<'_, AppState>` y `tauri::State<'_, AppConfigState>` protegido con `Arc<RwLock<AppConfig>>`.
  - **En React (Frontend):** Cualquier cambio en el índice o en la configuración dispara `app.emit("config-updated", &updated)` y `app.emit("index-updated", count)`, sincronizando ambas vistas al instante.

---

## 2. Diferencias Clave entre Tauri v1 y Tauri v2 en System Tray

| Aspecto | Tauri v1 | Tauri v2 (Implementado) |
| :--- | :--- | :--- |
| **Feature en `Cargo.toml`** | `system-tray` | `tray-icon` (`tauri = { version = "2", features = ["tray-icon"] }`) |
| **API de Bandeja en Rust** | `tauri::SystemTray`, `SystemTrayMenu` | `tauri::tray::TrayIconBuilder`, `tauri::menu::{Menu, MenuItem}` |
| **Acceso a ventanas** | `app.get_window("main")` | `app.get_webview_window("main")` |
| **Eventos globales IPC** | `app.emit_all("evento", payload)` | `app.emit("evento", payload)` (mediante trait `tauri::Emitter`) |
| **Permisos / Seguridad** | `allowlist` en `tauri.conf.json` | Archivos de `capabilities/*.json` listando `"windows": ["main", "tray-popup"]` |

---

## 3. Diagrama de Flujo Completo

```
                        ┌───────────────────────────────┐
                        │    Inicio de la Aplicación    │
                        └───────────────┬───────────────┘
                                        │
                        ┌───────────────▼───────────────┐
                        │ ¿Otra instancia en ejecución? │
                        │   (127.0.0.1:47831 ocupada)   │
                        └───────┬───────────────┬───────┘
                            SÍ  │               │ NO
        ┌───────────────────────▼──┐         ┌──▼────────────────────────────┐
        │ Envía señal FOCUS_MAIN a │         │ Lee app_config.json en AppData│
        │ instancia activa y sale  │         │  ¿setup_completed == true?    │
        └──────────────────────────┘         └──────┬────────────────┬───────┘
                                           NO (1ra) │                │ SÍ (2da+)
                     ┌──────────────────────────────▼─┐    ┌─────────▼────────────────────┐
                     │ MODO COMPLETO (Onboarding):    │    │ MODO BANDEJA SILENCIOSO:     │
                     │ - Muestra ventana `main`       │    │ - `main` y `tray-popup`      │
                     │ - Visible en barra de tareas   │    │   arrancan ocultas           │
                     │ - Bloquea ocultar a bandeja    │    │ - macOS: ActivationPolicy::  │
                     │   hasta pulsar "Completar"     │    │   Accessory (sin icono Dock) │
                     └──────────────┬─────────────────┘    └─────────┬────────────────────┘
                                    │                                │
                                    │ invoke("complete_setup")       │
                                    └───────────────►────────────────┘
                                                    │
                    ┌───────────────────────────────▼───────────────────────────────┐
                    │                ICONO EN BANDEJA DEL SISTEMA                   │
                    └──────┬────────────────────────┬────────────────────────┬──────┘
             Clic Izquierdo│                        │Clic Derecho            │Botón X en `main`
      ┌────────────────────▼─────┐    ┌─────────────▼──────────────┐   ┌─────▼──────────────────┐
      │ Alterna `tray-popup`     │    │ Menú Contextual:           │   │ `api.prevent_close()`  │
      │ (360×500, sin bordes)    │    │ - Abrir app completa       │   │ `hide_main_to_tray()`  │
      │ junto al icono (`rect`). │    │ - Búsqueda rápida (Popup)  │   │ La app sigue viva en   │
      │ Se oculta al perder foco │    │ - Re-escanear carpeta ahora│   │ la bandeja del sistema │
      │ (`Focused(false)`).      │    │ - Configuración            │   └────────────────────────┘
      └──────────────────────────┘    │ - Salir (`app.exit(0)`)    │
                                      └────────────────────────────┘
```

---

## 4. Consideraciones Específicas por Sistema Operativo

### Windows (10 / 11)
- **Área de desbordamiento (Flecha `^`):** Windows oculta por defecto los iconos nuevos de aplicaciones en el panel desplegable `^` junto al reloj. El usuario puede arrastrar el icono de **OmniSearch Desktop** fuera del menú `^` hacia la barra principal para dejarlo fijo.
- **Posicionamiento del Popup (`360×500`):** Al hacer clic izquierdo, `TrayIconEvent::Click` entrega el `rect` físico del icono. Como en Windows la barra suele estar abajo (`icon_y > 540`), el popup se posiciona automáticamente **encima** del icono (`icon_y - 500 - 8`).
- **Autostart:** Se registra en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` bajo el valor `OmniSearchDesktop`.

### macOS
- **Dock Dinámico (`ActivationPolicy`):**
  - Cuando la ventana principal `main` se oculta a la bandeja, se ejecuta `app.set_activation_policy(tauri::ActivationPolicy::Accessory)`, ocultando el icono del Dock y dejando únicamente el icono en la Menu Bar superior.
  - Cuando el usuario abre la ventana completa o la sección de Configuración, se restaura `tauri::ActivationPolicy::Regular` para que vuelva a aparecer en el Dock y en `Cmd + Tab`.
- **Autostart:** Se gestiona mediante un archivo LaunchAgent en `~/Library/LaunchAgents/com.miframework.semanticexplorer.plist`.

### Linux (Ubuntu / Fedora / Arch)
- **Requisitos de AppIndicator:**
  - Tauri v2 utiliza `libayatana-appindicator` o `libappindicator3` a través del crate `tray-icon`.
  - **Debian / Ubuntu:** `sudo apt install libayatana-appindicator3-dev`
  - **Fedora:** `sudo dnf install libayatana-appindicator-gtk3-devel`
  - **Arch Linux:** `sudo pacman -S libayatana-appindicator`
  - **Nota sobre GNOME:** GNOME puro no muestra iconos de bandeja por defecto sin la extensión **AppIndicator and KStatusNotifierItem Support** (`gnome-shell-extension-appindicator`).

---

## 5. Lista de Pruebas Manuales para Verificar el Funcionamiento

1. **Prueba de Primera Ejecución (Onboarding):**
   - Si ya habías completado el setup, abre `⚙️ Configuración` y haz clic en **"Reiniciar 1ra Ejecución"** (o borra `%LOCALAPPDATA%\omnisearch-desktop\app_config.json`).
   - Verifica que aparece el modal de **Primera Ejecución** en la ventana principal completa.
   - Intenta cerrar la ventana con la `X`: verás que **no** se cierra ni se esconde en la bandeja, mostrando el aviso amarillo de que primero debes completar la configuración inicial.
   - Haz clic en **"Completar y probar ahora el Popup de Bandeja (360×500)"**: la ventana principal se ocultará y aparecerá el mini-buscador de bandeja.
2. **Prueba de Clic Izquierdo en el Icono de Bandeja:**
   - Busca el icono de OmniSearch junto al reloj (o dentro de la flecha `^` en Windows) y haz **clic izquierdo**: se mostrará el popup sin bordes de `360×500` pegado al icono.
   - Haz clic en cualquier lugar del escritorio fuera del popup: el popup se ocultará automáticamente (`Focused(false)`).
3. **Prueba de Clic Derecho (Menú Contextual):**
   - Haz **clic derecho** sobre el icono de la bandeja y verifica las opciones:
     - *Abrir app completa*: abre y enfoca la ventana `main`.
     - *Búsqueda rápida (Popup)*: muestra el popup compacto `360×500`.
     - *Re-escanear carpeta ahora*: re-indexa en segundo plano y actualiza el contador de chunks.
     - *Configuración*: abre la ventana `main` directamente con el modal de preferencias abierto.
     - *Salir*: termina el proceso por completo.
4. **Prueba de Cierre a Bandeja (`X`) e Instancia Única:**
   - Con la ventana principal `main` abierta (y `setup_completed: true`), pulsa la `X` de la esquina superior derecha: la ventana se oculta pero el icono sigue activo en la bandeja.
   - Intenta ejecutar una segunda instancia del binario: detectará el puerto local `127.0.0.1:47831` y enfocará automáticamente la ventana existente sin duplicar procesos.
