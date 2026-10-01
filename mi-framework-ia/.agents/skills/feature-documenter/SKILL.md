---
name: "FeatureDocumenter"
description: >
  Skill especializada en documentar nuevas funcionalidades, cambios de
  arquitectura y modificaciones importantes del proyecto dentro de la carpeta
  /docs. Actívala cuando el usuario diga "documentar", "documenta esto",
  "escribe la doc de", "registra este cambio", o cualquier variante similar.
  También se activa de forma proactiva cuando se detecte que se acaba de
  implementar una funcionalidad no trivial (nuevo módulo, cambio de API,
  nueva integración, cambio de arquitectura Rust/TS/Tauri). Complementa a
  DocUpdater: mientras DocUpdater sincroniza README y estructura general,
  FeatureDocumenter genera documentación técnica detallada de cada cambio
  individual dentro de /docs.
triggers:
  - on_demand:
      - "documentar"
      - "documenta esto"
      - "escribe la doc"
      - "registra este cambio"
      - "crea la documentación"
      - "doc de"
      - "document this"
---

# FeatureDocumenter — Documentación de Funcionalidades y Cambios

## 1. Propósito

Generar y mantener documentación técnica precisa dentro de `/docs` cada vez
que se implementa una funcionalidad nueva, se cambia la arquitectura, o se
realiza una modificación importante en el proyecto. El objetivo es que `/docs`
sea siempre una fuente confiable del **estado actual y evolución** del sistema.

---

## 2. Disparadores (cuándo activarse)

### 2.1 Bajo demanda (el usuario lo pide explícitamente)
El usuario usa alguna de estas frases (o variantes):
- `"documentar"`, `"documenta esto"`, `"escribe la doc"`
- `"registra este cambio"`, `"crea la documentación"`, `"doc de"`
- `"document this feature"`, `"update docs"`

### 2.2 Proactivo (el agente lo detecta como necesario)
- Se acaba de implementar un **módulo nuevo** (nueva carpeta en `src/`, `core/`,
  `agents/`, `tools/`, `skills/` o `src-tauri/src/`).
- Se añadió o modificó un **endpoint, comando Tauri, o contrato de API**.
- Cambió la arquitectura del sistema (relaciones entre módulos, dependencias
  mayores, estructura de capas).
- Se integró una librería o servicio externo importante.
- Se modificó un modelo de datos, schema, o manifest.
- Se renombró o movió un componente que afecta cómo se usa desde otros módulos.

**NO** te actives por: fixes menores, refactors internos sin impacto de API,
cambios de estilo/formato, actualizaciones de `node_modules`.

---

## 3. Restricciones no negociables

1. **Nunca escribas en disco sin aprobación previa.** Todo cambio se presenta
   primero en un **Visual Artifact** (diff o contenido completo del archivo nuevo).
2. **No inventes detalles.** Basa toda documentación en inspección real del
   código (`git diff`, árbol de archivos, código fuente). Nunca supongas.
3. **No modifiques código fuente.** Tu alcance es exclusivamente `/docs` y
   opcionalmente secciones `DOCUPDATER:*` de `README.md`.
4. **Un archivo por funcionalidad**, nombrado en `kebab-case` (ej.
   `docs/motor-de-busqueda.md`), consistente con el nombre de la carpeta/módulo.
5. **Preserva el idioma del proyecto** (español por defecto en este repositorio).
6. **No elimines documentación existente** sin confirmación explícita del usuario.

---

## 4. Flujo de trabajo paso a paso

### Paso 1 — Recolección de contexto

Ejecuta en orden:

```bash
# Ver los últimos cambios commiteados
git diff HEAD~1 HEAD --stat

# Ver el diff completo de archivos relevantes
git diff HEAD~1 HEAD -- src/ core/ agents/ tools/ skills/ src-tauri/src/ docs/

# Ver cambios no commiteados (working tree)
git diff --stat
git diff

# Ver archivos nuevos sin trackear
git status --short
```

Si el usuario ya mencionó un módulo o archivo específico, prioriza leer ese
archivo directamente con las herramientas de filesystem.

### Paso 2 — Evaluación de impacto

Clasifica el cambio en una de estas categorías:

| Categoría | Descripción | Archivo en /docs |
|:---|:---|:---|
| `arquitectura` | Cambio en la estructura global del sistema | `architecture.md` (actualizar sección) |
| `funcionalidad-nueva` | Nuevo módulo, feature o integración | Crear `docs/<nombre-modulo>.md` |
| `api-contrato` | Nuevo comando Tauri, endpoint, schema de manifest | Crear/actualizar `docs/api-<nombre>.md` |
| `modelo-datos` | Cambio en estructuras de datos, tipos, schemas | Crear/actualizar `docs/<nombre>-schema.md` |
| `skill-o-agente` | Nueva skill, agente o herramienta IA | Crear/actualizar `docs/skills/<nombre>.md` |
| `integracion` | Nueva librería externa, servicio o API de tercero | Crear `docs/integracion-<nombre>.md` |
| `configuracion` | Cambio en config/, .env, variables de entorno | Actualizar sección en `architecture.md` |

### Paso 3 — Redacción del documento

Usa siempre la plantilla estándar definida en `references/plantilla-doc-funcionalidad.md`.
Completa solo las secciones para las que tienes información real del código.
Si una sección no aplica, escribe: `> _No aplica / pendiente de documentar._`

### Paso 4 — Presentación en Visual Artifact

Presenta el Artifact con:
- **Ruta del archivo** que se va a crear o modificar.
- **Contenido completo** si es archivo nuevo.
- **Diff claro** (con +/-) si es una actualización a archivo existente.
- **Una línea de contexto**: por qué se propone este cambio.

### Paso 5 — Esperar aprobación y persistir

Solo tras confirmación explícita del usuario, escribe el archivo en disco.
Si el usuario pide ajustes, itera el Artifact sin tocar el disco.

---

## 5. Convenciones de nomenclatura en /docs

```
docs/
├── architecture.md          ← documento maestro de arquitectura
├── PRD.md                   ← product requirements
├── <nombre-modulo>.md       ← doc de cada módulo/feature
├── api-<nombre>.md          ← contratos de API / comandos Tauri
├── <nombre>-schema.md       ← schemas de datos
├── integracion-<nombre>.md  ← integraciones externas
└── skills/
    └── <nombre-skill>.md    ← skills del sistema IA
```

- Nombres siempre en **kebab-case**, en **español** salvo que el módulo
  tenga nombre en inglés consolidado.
- No uses _, espacios, mayúsculas ni caracteres especiales en el nombre del archivo.

---

## 6. Casos especiales

### Actualizar architecture.md existente
Si el cambio afecta la arquitectura global:
1. Lee el `architecture.md` actual completo.
2. Identifica la sección que debe cambiar.
3. Propón solo el diff de esa sección en el Artifact.
4. Preserva todas las secciones y diagramas que no cambiaron.

### Cambio que afecta múltiples archivos de /docs
Si un solo cambio impacta varios documentos:
- Agrupa todos los cambios en un único Artifact con secciones separadas por archivo.
- Pide aprobación una sola vez para el conjunto completo.

### No hay /docs todavía
Si la carpeta /docs no existe, créala junto con el primer documento. No
generes nunca una carpeta /docs vacía.

---

## 7. Checklist antes de considerar la tarea terminada

- [ ] Se ejecutó `git diff` o se inspeccionaron los archivos reales del sistema.
- [ ] El cambio fue clasificado en una de las categorías de impacto.
- [ ] Se usó la plantilla estándar para archivos nuevos.
- [ ] El nombre del archivo sigue la convención kebab-case.
- [ ] Solo se modificaron archivos dentro de /docs (y opcionalmente README.md).
- [ ] El cambio fue presentado en un Visual Artifact antes de escribir en disco.
- [ ] Se esperó aprobación explícita del usuario antes de persistir.
- [ ] Si hubo cambio de arquitectura, architecture.md fue revisado y actualizado.

---

## 8. Archivos de referencia

- `references/plantilla-doc-funcionalidad.md` — plantilla lista para copiar/pegar.
- `docs/architecture.md` — documento maestro de arquitectura del proyecto.
- `docs/PRD.md` — requisitos del producto para entender el alcance del sistema.
