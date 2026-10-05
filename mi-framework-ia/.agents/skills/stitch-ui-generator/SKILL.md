# Skill: Role-Based UI Generator (Stitch MCP)

## Propósito
Esta skill lee los documentos de requisitos funcionales y no funcionales para extraer los roles de usuario del sistema, y utiliza el MCP de Stitch para diseñar y generar los bocetos de las pantallas base en React/TypeScript.

## Instrucciones de Ejecución:
1. **Analizar Requisitos:** Utiliza el MCP `filesystem` para buscar y leer el documento de requisitos funcionales y no funcionales en el proyecto.
2. **Extraer Roles y Casos de Uso:** Enumera todos los roles de usuario identificados y qué acciones exactas debe realizar cada uno (basado en los RF).
3. **Generar UI con Stitch:** Por cada rol, usa el MCP de Stitch para estructurar las pantallas visuales correspondientes. Genera componentes funcionales puros en `src/components/` o páginas en `src/`, empleando Tailwind CSS[cite: 1].
4. **Respetar Arquitectura:** Asegúrate de que las pantallas sigan la arquitectura limpia definida (Tauri + React) sin inyectar lógica de backend o de Rust en el frontend[cite: 1].