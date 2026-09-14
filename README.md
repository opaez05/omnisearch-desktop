<div align="center">

# 🤖 Mi Framework de IA con Agentes y Skills

**Arquitectura en capas, estructura de carpetas y guía de uso del generador**

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![YAML](https://img.shields.io/badge/Config-YAML-CB171E?style=for-the-badge&logo=yaml&logoColor=white)
![Status](https://img.shields.io/badge/Status-En%20Desarrollo-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)

Un framework de software para alojar **múltiples agentes de IA**, **skills reutilizables** y su **infraestructura compartida** (orquestación, memoria, gateway de LLM, seguridad y observabilidad).

</div>

---

## 📋 Tabla de contenidos

- [Principios de diseño](#-principios-de-diseño)
- [Arquitectura en capas](#-arquitectura-en-capas)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Detalle de cada carpeta](#-detalle-de-cada-carpeta)
- [El manifiesto de agente/skill](#-el-manifiesto-de-agente-skill)
- [Cómo usar el generador](#-cómo-usar-el-generador)
- [Errores comunes a evitar](#-errores-comunes-a-evitar)

---

## 🧭 Principios de diseño

> **Un agente no es un skill.**

| Concepto | Descripción |
|----------|-------------|
| **Agente** | *Decide.* Mantiene un ciclo de razonamiento, estado y memoria de conversación. |
| **Skill** | *Ejecuta.* Capacidad determinística y sin estado propio que un agente invoca (función, wrapper de API, plantilla de prompt con contrato fijo). |

1. **Registro explícito, no autodescubrimiento mágico.** Cada agente y skill se declara en un manifiesto (YAML) con su contrato de entrada/salida, permisos y dependencias — nada de escanear carpetas y adivinar.
2. **El orquestador no contiene lógica de negocio.** Solo enruta, planifica y delega. La lógica específica de dominio vive dentro de cada agente.
3. **La memoria es un servicio, no un detalle de cada agente.** Solo así se pueden componer agentes y auditar qué se guardó y por qué.

---

## 🏗️ Arquitectura en capas

El framework se organiza en **cuatro capas**, cada una dependiente únicamente de la capa inmediatamente inferior:

```
┌─────────────────────────────────────────────────────────────┐
│                       INTERFACES                            │
│              API · CLI · Chat UI                            │
├─────────────────────────────────────────────────────────────┤
│                      ORQUESTADOR                            │
│          Router · Planner · Executor                        │
├─────────────────────────────────────────────────────────────┤
│                 AGENTES  ·  SKILLS                          │
│      research_agent    web_search      code_executor        │
│      coding_agent      db_query  document_generator         │
├─────────────────────────────────────────────────────────────┤
│                 INFRAESTRUCTURA COMPARTIDA                  │
│      Memoria · LLM Gateway · Seguridad · Observabilidad     │
└─────────────────────────────────────────────────────────────┘
```

Las capas superiores dependen de la infraestructura compartida; **ninguna capa inferior conoce a las superiores**. Esto permite reemplazar, por ejemplo, el proveedor de LLM sin tocar el código de los agentes.

---

## 📁 Estructura del proyecto

```text
mi-framework-ia/
├── core/                     # Runtime del framework (agnóstico de dominio)
│   ├── orchestrator/         #   router, planner, executor
│   ├── agent_base/           #   clase base + registro de agentes
│   ├── skill_base/           #   clase base + registro de skills
│   ├── memory/               #   short_term, long_term, memory_manager
│   ├── llm_gateway/          #   provider_router, cost_tracker
│   ├── security/             #   permissions, guardrails
│   └── observability/        #   tracer, logger
├── agents/                   # Un subdirectorio por agente
│   ├── research_agent/       #   agent.py, manifest.yaml
│   └── coding_agent/         #   agent.py, manifest.yaml
├── skills/                   # Capacidades reutilizables entre agentes
│   ├── web_search/
│   ├── code_executor/
│   ├── db_query/
│   └── document_generator/
├── tools/                    # Integraciones externas puras (GitHub, Slack)
├── config/                   # Qué está activo + configuración por entorno
│   └── environments/         #   dev.yaml, prod.yaml
├── evaluations/              # Benchmarks y tests (regresiones)
│   ├── agent_benchmarks/
│   └── skill_tests/
├── interfaces/               # Puntos de entrada externos
│   ├── api/
│   ├── cli/
│   └── chat_ui/
├── docs/                     # architecture.md, manifest_schema.md
├── crear_estructura_framework.py   # Script generador idempotente
└── README.md
```

---

## 🗂️ Detalle de cada carpeta

### 🧬 `core/`
**El runtime del framework**: código agnóstico de dominio que no cambia entre proyectos. Contiene el orquestador, las clases base de agente y skill, la gestión de memoria, el gateway de LLM, seguridad y observabilidad.

| Módulo | Componentes | Responsabilidad |
|--------|-------------|-----------------|
| `orchestrator` | `router` · `planner` · `executor` | Decide qué agente atiende cada tarea, descompone tareas complejas y ejecuta el plan con reintentos. |
| `agent_base` | `base_agent` · `agent_registry` | Ciclo de vida de los agentes y registro central para el orquestador. |
| `skill_base` | `base_skill` · `skill_registry` | Contrato de entrada/salida y registro de skills. |
| `memory` | `short_term` · `long_term` · `memory_manager` | Contexto de sesión, memoria persistente y API única de acceso. |
| `llm_gateway` | `provider_router` · `cost_tracker` | Abstrae el proveedor de LLM y registra tokens/costo por llamada. |
| `security` | `permissions` · `guardrails` | Mínimo privilegio por agente/skill y validación de entradas/salidas. |
| `observability` | `tracer` · `logger` | Traza cada decisión y llamada; logging centralizado. |

### 🤖 `agents/`
Un **subdirectorio por agente**. Cada uno implementa la clase base de agente (`BaseAgent`) y declara su propio `manifest.yaml` con las **skills que requiere** y los **permisos que necesita**.

| Agente | Skills requeridas | Permisos |
|--------|-------------------|----------|
| `research_agent` | `web_search`, `document_generator` | `network_access` |
| `coding_agent` | `code_executor` | `code_execution` |

### 🧩 `skills/`
**Capacidades reutilizables entre agentes.** Cada skill es determinística, sin estado propio, y declara su contrato de entrada/salida en su manifiesto.

| Skill | Entrada | Salida | Permisos |
|-------|---------|--------|----------|
| `web_search` | `query` | `results[]` | network |
| `code_executor` | `code`, `language` | `stdout`, `stderr` | `code_execution` |
| `db_query` | `sql` | `rows[]` | `db_read` |
| `document_generator` | `content`, `format` | `file_path` | — |

### 🔌 `tools/`
Integraciones externas puras — clientes de API como GitHub o Slack — **sin ninguna lógica de agente ni de orquestación**.

### ⚙️ `config/`
Define **qué agentes y skills están activos** y la **configuración por entorno** (desarrollo, producción).

```yaml
# config/agents.yaml
active_agents:
  - research_agent
  - coding_agent
```

### 🧪 `evaluations/`
Casos de prueba y benchmarks que verifican que un **cambio de prompt o de skill no rompe** el comportamiento esperado de un agente. Suele omitirse al inicio — es la **causa más común de regresiones silenciosas**.

### 🚪 `interfaces/`
**Puntos de entrada externos**: API HTTP, CLI y una posible interfaz de chat, todos consumiendo al orquestador.

### 📄 `docs/`
Documentación técnica: arquitectura (`architecture.md`) y esquema de manifiestos (`manifest_schema.md`).

---

## 📝 El manifiesto de agente/skill

Cada agente y skill **declara, en lugar de solo implementar**, su contrato. Ejemplo real generado por el script:

```yaml
# agents/research_agent/manifest.yaml
name: research_agent
version: 0.1.0
description: Investiga un tema y produce un resumen con fuentes
skills_required: [web_search, document_generator]
permissions: [network_access]
input_schema: {}
output_schema: {}
```

Esto permite tres cosas:

1. **El orquestador decide a quién delegar** sin inspeccionar código.
2. **Agentes y skills se versionan de forma independiente.**
3. **Se puede auditar qué tiene acceso a qué** — especialmente relevante cuando una skill tiene permisos de escritura o ejecución de código.

---

## 🚀 Cómo usar el generador

El script `crear_estructura_framework.py` crea todas las carpetas y archivos base (`.py`, `.yaml` y `.md`) en **una sola ejecución**. Es **idempotente**: si un archivo ya existe, lo omite en lugar de sobrescribirlo.

### Ejecución

```bash
# 1. Crea la carpeta "mi-framework-ia" en el directorio actual
python3 crear_estructura_framework.py

# 2. O con un nombre específico
python3 crear_estructura_framework.py mi-framework-ia

# 3. O en una ruta absoluta
python3 crear_estructura_framework.py /home/esteban/proyectos/mi-framework-ia
```

> 💡 **Windows**: reemplaza `python3` por `python` si tu instalación no registra el alias `python3`.

Al finalizar, el script imprime en consola **cada archivo creado** y la **ruta absoluta final** del proyecto.

---

## ⚠️ Errores comunes a evitar

| Error | Por qué evitarlo |
|-------|------------------|
| 🧠 **Skills con estado escondido** | Si una skill guarda información entre llamadas sin pasar por `memory_manager`, se rompe la composabilidad y la trazabilidad. |
| 🔌 **Orquestador acoplado a un proveedor de LLM** | Por eso existe `llm_gateway` como capa separada: cambiar de proveedor no debería requerir tocar agentes ni orquestador. |
| 🧪 **Ausencia de evaluaciones automatizadas** | Un cambio de prompt puede romper silenciosamente el comportamiento de un agente; sin benchmarks en `evaluations/`, el problema se detecta hasta producción. |
| 🔐 **Seguridad como ocurrencia tardía** | `permissions` y `guardrails` deben existir desde el primer agente con red o ejecución de código, no agregarse cuando ya hay diez skills sin restricciones. |

---

## 📄 Licencia

MIT © [Esteban]()

---

<div align="center">

**¿Encontraste un bug o tienes una mejora?** Abre un [issue](https://github.com/esteban) o envía un *pull request*.

</div>
# frameworkIa
