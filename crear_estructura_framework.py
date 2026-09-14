#!/usr/bin/env python3
"""
Genera el árbol de carpetas del framework de IA (orquestador, agentes, skills,
memoria, seguridad, observabilidad) con archivos base y manifiestos de ejemplo.

Uso:
    python crear_estructura_framework.py [ruta_destino]

Si no se indica ruta_destino, se crea "mi-framework-ia" en el directorio actual.
"""

import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Estructura: carpetas a crear (todas llevan un .gitkeep si quedan vacías)
# ---------------------------------------------------------------------------
CARPETAS = [
    "core/orchestrator",
    "core/agent_base",
    "core/skill_base",
    "core/memory",
    "core/llm_gateway",
    "core/security",
    "core/observability",
    "agents/research_agent/prompts",
    "agents/coding_agent/prompts",
    "skills/web_search",
    "skills/code_executor",
    "skills/db_query",
    "skills/document_generator",
    "tools",
    "config/environments",
    "evaluations/agent_benchmarks",
    "evaluations/skill_tests",
    "interfaces/api",
    "interfaces/cli",
    "interfaces/chat_ui",
    "docs",
]

# ---------------------------------------------------------------------------
# Archivos base con contenido mínimo (placeholders con docstring, no vacíos)
# ---------------------------------------------------------------------------
ARCHIVOS = {
    "core/orchestrator/router.py": '"""Decide qué agente atiende una tarea entrante."""\n',
    "core/orchestrator/planner.py": '"""Descompone tareas complejas en subtareas delegables."""\n',
    "core/orchestrator/executor.py": '"""Ejecuta el plan del planner, maneja reintentos y fallbacks."""\n',
    "core/agent_base/base_agent.py": (
        '"""Clase abstracta que define el ciclo de vida de un agente.\n\n'
        "Todo agente concreto (en agents/) debe heredar de BaseAgent e\n"
        'implementar el método run().\n"""\n\n'
        "from abc import ABC, abstractmethod\n\n\n"
        "class BaseAgent(ABC):\n"
        "    name: str = \"unnamed_agent\"\n\n"
        "    @abstractmethod\n"
        "    def run(self, task: dict) -> dict:\n"
        '        """Ejecuta la tarea y devuelve un resultado estructurado."""\n'
        "        raise NotImplementedError\n"
    ),
    "core/agent_base/agent_registry.py": '"""Registro central de agentes disponibles para el orquestador."""\n\nAGENT_REGISTRY: dict = {}\n\n\ndef register_agent(agent_cls):\n    AGENT_REGISTRY[agent_cls.name] = agent_cls\n    return agent_cls\n',
    "core/skill_base/base_skill.py": (
        '"""Contrato que toda skill debe cumplir: input/output schema y run()."""\n\n'
        "from abc import ABC, abstractmethod\n\n\n"
        "class BaseSkill(ABC):\n"
        "    name: str = \"unnamed_skill\"\n\n"
        "    @abstractmethod\n"
        "    def run(self, params: dict) -> dict:\n"
        '        """Ejecuta la skill de forma determinística, sin estado propio."""\n'
        "        raise NotImplementedError\n"
    ),
    "core/skill_base/skill_registry.py": '"""Registro central de skills disponibles para los agentes."""\n\nSKILL_REGISTRY: dict = {}\n\n\ndef register_skill(skill_cls):\n    SKILL_REGISTRY[skill_cls.name] = skill_cls\n    return skill_cls\n',
    "core/memory/short_term.py": '"""Contexto de la conversación/sesión actual (en memoria, volátil)."""\n',
    "core/memory/long_term.py": '"""Memoria persistente (vectorial/relacional) entre sesiones."""\n',
    "core/memory/memory_manager.py": '"""API única de lectura/escritura de memoria que usan los agentes.\n\nNingún agente ni skill debe acceder a short_term/long_term directamente:\ntodo pasa por aquí para mantener trazabilidad y composabilidad.\n"""\n',
    "core/llm_gateway/provider_router.py": '"""Abstrae el proveedor de LLM (Claude, GPT, local) frente al resto del framework."""\n',
    "core/llm_gateway/cost_tracker.py": '"""Registra tokens y costo por llamada, por agente y por skill."""\n',
    "core/security/permissions.py": '"""Define qué puede hacer cada agente/skill (principio de mínimo privilegio)."""\n',
    "core/security/guardrails.py": '"""Validación de entradas/salidas y filtros de seguridad."""\n',
    "core/observability/tracer.py": '"""Traza cada decisión del orquestador y cada llamada a skill/LLM."""\n',
    "core/observability/logger.py": '"""Logger centralizado del framework."""\n',
    "agents/research_agent/agent.py": (
        '"""Agente de investigación: usa web_search y document_generator."""\n\n'
        "from core.agent_base.base_agent import BaseAgent\n\n\n"
        "class ResearchAgent(BaseAgent):\n"
        "    name = \"research_agent\"\n\n"
        "    def run(self, task: dict) -> dict:\n"
        "        raise NotImplementedError\n"
    ),
    "agents/research_agent/manifest.yaml": (
        "name: research_agent\n"
        "version: 0.1.0\n"
        "description: Investiga un tema y produce un resumen con fuentes\n"
        "skills_required: [web_search, document_generator]\n"
        "permissions: [network_access]\n"
        "input_schema: {}\n"
        "output_schema: {}\n"
    ),
    "agents/coding_agent/agent.py": (
        '"""Agente de código: usa code_executor."""\n\n'
        "from core.agent_base.base_agent import BaseAgent\n\n\n"
        "class CodingAgent(BaseAgent):\n"
        "    name = \"coding_agent\"\n\n"
        "    def run(self, task: dict) -> dict:\n"
        "        raise NotImplementedError\n"
    ),
    "agents/coding_agent/manifest.yaml": (
        "name: coding_agent\n"
        "version: 0.1.0\n"
        "description: Escribe y ejecuta código para resolver una tarea\n"
        "skills_required: [code_executor]\n"
        "permissions: [code_execution]\n"
        "input_schema: {}\n"
        "output_schema: {}\n"
    ),
    "skills/web_search/skill.py": '"""Skill: búsqueda web."""\n\nfrom core.skill_base.base_skill import BaseSkill\n\n\nclass WebSearchSkill(BaseSkill):\n    name = "web_search"\n\n    def run(self, params: dict) -> dict:\n        raise NotImplementedError\n',
    "skills/web_search/manifest.yaml": "name: web_search\nversion: 0.1.0\ninput_schema: {query: string}\noutput_schema: {results: array}\nrate_limit: 60/min\n",
    "skills/code_executor/skill.py": '"""Skill: ejecución de código en un entorno aislado."""\n\nfrom core.skill_base.base_skill import BaseSkill\n\n\nclass CodeExecutorSkill(BaseSkill):\n    name = "code_executor"\n\n    def run(self, params: dict) -> dict:\n        raise NotImplementedError\n',
    "skills/code_executor/manifest.yaml": "name: code_executor\nversion: 0.1.0\ninput_schema: {code: string, language: string}\noutput_schema: {stdout: string, stderr: string}\npermissions: [code_execution]\n",
    "skills/db_query/skill.py": '"""Skill: consultas a base de datos."""\n\nfrom core.skill_base.base_skill import BaseSkill\n\n\nclass DbQuerySkill(BaseSkill):\n    name = "db_query"\n\n    def run(self, params: dict) -> dict:\n        raise NotImplementedError\n',
    "skills/db_query/manifest.yaml": "name: db_query\nversion: 0.1.0\ninput_schema: {sql: string}\noutput_schema: {rows: array}\npermissions: [db_read]\n",
    "skills/document_generator/skill.py": '"""Skill: generación de documentos (docx/pdf/md)."""\n\nfrom core.skill_base.base_skill import BaseSkill\n\n\nclass DocumentGeneratorSkill(BaseSkill):\n    name = "document_generator"\n\n    def run(self, params: dict) -> dict:\n        raise NotImplementedError\n',
    "skills/document_generator/manifest.yaml": "name: document_generator\nversion: 0.1.0\ninput_schema: {content: string, format: string}\noutput_schema: {file_path: string}\n",
    "tools/github_client.py": '"""Integración pura con la API de GitHub (sin lógica de agente)."""\n',
    "tools/slack_client.py": '"""Integración pura con la API de Slack (sin lógica de agente)."""\n',
    "config/agents.yaml": "active_agents:\n  - research_agent\n  - coding_agent\n",
    "config/skills.yaml": "active_skills:\n  - web_search\n  - code_executor\n  - db_query\n  - document_generator\n",
    "config/environments/dev.yaml": "llm_provider: claude\nlog_level: debug\n",
    "config/environments/prod.yaml": "llm_provider: claude\nlog_level: info\n",
    "evaluations/agent_benchmarks/README.md": "# Benchmarks de agentes\n\nCasos de prueba que verifican que un cambio de prompt o de skill no rompe\nel comportamiento esperado de cada agente.\n",
    "evaluations/skill_tests/README.md": "# Tests de skills\n\nPruebas unitarias por skill: contrato de entrada/salida y casos límite.\n",
    "interfaces/api/main.py": '"""Punto de entrada HTTP (FastAPI/Express) hacia el orquestador."""\n',
    "interfaces/cli/main.py": '"""Punto de entrada por línea de comandos hacia el orquestador."""\n',
    "interfaces/chat_ui/README.md": "# Chat UI\n\nInterfaz conversacional que consume el orquestador vía interfaces/api.\n",
    "docs/architecture.md": "# Arquitectura\n\nDescribe aquí las capas: interfaces, orquestador, agentes y skills,\ninfraestructura compartida (memoria, LLM gateway, seguridad, observabilidad).\n",
    "docs/manifest_schema.md": "# Esquema de manifest.yaml\n\nCampos obligatorios para agentes y skills: name, version, description,\ninput_schema, output_schema, permissions.\n",
    "README.md": "# Mi Framework de IA\n\nEstructura generada automáticamente. Ver docs/architecture.md.\n",
    ".gitignore": "__pycache__/\n*.pyc\n.env\n.venv/\n",
}


def crear_estructura(base: Path) -> None:
    base.mkdir(parents=True, exist_ok=True)

    for carpeta in CARPETAS:
        (base / carpeta).mkdir(parents=True, exist_ok=True)

    for ruta_relativa, contenido in ARCHIVOS.items():
        ruta = base / ruta_relativa
        ruta.parent.mkdir(parents=True, exist_ok=True)
        if ruta.exists():
            print(f"  ya existe, se omite: {ruta_relativa}")
            continue
        ruta.write_text(contenido, encoding="utf-8")
        print(f"  creado: {ruta_relativa}")

    # __init__.py en los paquetes de core/, agents/, skills/ para que sean importables
    for paquete in ["core", "agents", "skills", "tools",
                    "core/orchestrator", "core/agent_base", "core/skill_base",
                    "core/memory", "core/llm_gateway", "core/security",
                    "core/observability"]:
        init_file = base / paquete / "__init__.py"
        if not init_file.exists():
            init_file.write_text("", encoding="utf-8")


def main() -> None:
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("mi-framework-ia")
    print(f"Creando estructura en: {destino.resolve()}\n")
    crear_estructura(destino)
    print(f"\nListo. Estructura creada en: {destino.resolve()}")


if __name__ == "__main__":
    main()
