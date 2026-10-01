# [Nombre Legible del Módulo / Funcionalidad]

> **Versión:** v1.0  |  **Última actualización:** YYYY-MM-DD  |  **Autor:** (agente/usuario)

## Descripción general

Qué hace este módulo/funcionalidad y cuál es su propósito dentro del sistema.
Una o dos frases concisas que respondan: ¿qué resuelve? ¿para quién?

## Ubicación en el código

| Elemento | Ruta |
|:---|:---|
| Código principal | `src/...` |
| Backend Rust | `src-tauri/src/...` |
| Tests | `tests/...` |
| Configuración | `config/...` |

## Arquitectura y diseño

Descripción de cómo está estructurado internamente y cómo se relaciona con el
resto del sistema. Incluye un diagrama ASCII si aplica.

```
[Diagrama opcional]
ComponenteA → ComponenteB → ComponenteC
```

## API / Interfaz pública

### Comandos Tauri / Endpoints

| Nombre | Parámetros | Retorno | Descripción |
|:---|:---|:---|:---|
| `nombre_comando` | `{ param: Tipo }` | `Tipo` | Qué hace |

### Tipos y modelos de datos

```typescript
// Tipos TypeScript del frontend
interface NombreModelo {
  campo: tipo;
}
```

```rust
// Structs Rust del backend (si aplica)
struct NombreStruct {
  campo: Tipo,
}
```

## Dependencias

| Dependencia | Versión | Propósito |
|:---|:---|:---|
| `nombre-lib` | `^X.Y` | Para qué se usa |

## Flujo de datos

Descripción paso a paso del flujo principal de datos:

1. El frontend envía...
2. El comando Tauri recibe...
3. El backend Rust procesa...
4. Se retorna al frontend...

## Ejemplos de uso

```typescript
// Ejemplo de invocación desde el frontend
import { invoke } from '@tauri-apps/api/tauri';
const resultado = await invoke('nombre_comando', { param: valor });
```

## Cambios recientes

| Fecha | Versión | Cambio |
|:---|:---|:---|
| YYYY-MM-DD | v1.0 | Implementación inicial |

## Notas y consideraciones

- Limitaciones conocidas o restricciones de uso.
- Decisiones de diseño importantes y su justificación.
- Edge cases a tener en cuenta.
- TODO / mejoras pendientes.
