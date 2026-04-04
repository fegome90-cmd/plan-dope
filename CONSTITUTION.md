# plan_dope — Local Constitution

## Propósito

`plan_dope` existe para **generar, validar y revisar planes técnicos de desarrollo** de forma consistente, multi-proyecto y automatizable, manteniendo al humano como autor y criterio final, y al sistema como derivador, verificador y productor de handoffs.

Su función no es ejecutar trabajo técnico ni administrar la vida completa de un delivery. Su función es producir planes legibles, validables y transferibles.

---

## Jurisdicción

Esta constitución gobierna:

- el core del CLI;
- la resolución del proyecto target;
- la escritura humana en Markdown;
- la derivación estructurada a YAML;
- los pipelines `authoring`, `validation` y `review`;
- la producción de `checkpoint` como artefacto de handoff;
- el uso del ecosistema `_ctx` como superficie operativa por proyecto;
- el modelo híbrido de estado: metadata global del CLI + artefactos por proyecto.

Esta constitución **no** gobierna:

- la ejecución de work orders o tareas;
- motores de orquestación externos;
- CI/CD;
- un sistema formal de plugins en v1;
- sincronización bidireccional Markdown ↔ YAML;
- planificación generalista no técnica.

Si un consumidor externo quiere ejecutar un plan, consume artefactos producidos por `plan_dope`, pero esa ejecución queda **fuera del core v1**.

---

## Leyes locales

### 1. Primacía humana de la fuente de verdad

El artefacto humano canónico es `plan.md`.

- Markdown es la fuente humana de verdad.
- YAML es un derivado para validación, interoperabilidad y consumo externo.
- JSON puede existir como metadata o índice interno, pero **nunca** como autoridad semántica del plan.

Si existe conflicto entre `plan.md` y cualquier derivado, **manda `plan.md`**.

### 2. Separación estricta entre gobierno y operación

La constitución gobierna el sistema.  
La arquitectura opera el sistema.

No se permite mezclar en un mismo artefacto:

- leyes del sistema;
- estructura operativa;
- comandos;
- estados de transición.

### 3. Tres pipelines core y nada más

El core v1 de `plan_dope` queda limitado a:

- `authoring`
- `validation`
- `review`

`checkpoint` no es un cuarto dominio autónomo: es un **artefacto de handoff** producido por el core al cerrar o transferir contexto.
Su materialización canónica en v1 se hace usando la **skill existente `checkpoint-card`**, no mediante un sistema de checkpoint propio de `plan_dope`.

La ejecución queda fuera del core.

### 4. Compatibilidad `_ctx` obligatoria

La convención de proyecto compatible en v1 es `_ctx/`, no `ctx/`.

- `_ctx/plans/` es la base por defecto de artefactos por proyecto.
- cualquier variación futura deberá declararse explícitamente como configuración;
- `ctx/` sin underscore no es canónico en v1.

### 5. Multi-proyecto con resolución explícita

`plan_dope` puede operar en múltiples proyectos, pero la resolución del target debe ser inequívoca:

- `cwd` funciona como default;
- `--project <path>` funciona como override explícito;
- el override explícito tiene prioridad sobre el contexto implícito.

### 6. Arquitectura proporcional

`plan_dope` v1 será **semi-extensible**:

- con puertos internos claros;
- sin sistema formal de plugins todavía.

No se admite sobreingeniería ornamental para “preparar el futuro”.

### 7. Alcance técnico, no generalista

El dominio de v1 son **planes técnicos de desarrollo**:

- feature work,
- bugfixes,
- refactors,
- mejoras de arquitectura técnica.

No se modela en v1 planificación generalista, personal, comercial o estratégica no técnica.

### 8. Cero comandos fantasma

Todo comando documentado debe corresponder a una responsabilidad real del core v1.

No se permite:

- documentar comandos para ejecución si el core no ejecuta;
- documentar comandos que dependan de un sistema de plugins inexistente;
- prometer sincronización bidireccional no soportada.

### 9. Derivación auditable

Toda derivación Markdown → YAML debe ser:

- determinística;
- rastreable;
- re-generable;
- auditable.

El sistema debe poder explicar qué artefacto derivó de cuál y bajo qué contrato.

---

## Decisiones base v1

- Runtime: **TypeScript + Node.js**
- Dominio: **planes técnicos de desarrollo**
- Scope funcional: **generar + validar + revisar**
- Superficies: **Markdown + YAML**
- Fuente de verdad: **Markdown**
- Derivado canónico para validación/interoperabilidad: **YAML**
- Modelo de proyecto: **multi-proyecto**
- Resolución de proyecto: **`cwd` por default + `--project` como override**
- Estado: **híbrido**
  - metadata global del CLI;
  - artefactos por proyecto;
- Base de artefactos por proyecto: **configurable**, con default **`_ctx/plans/`**
- Pipelines core: **`authoring`, `validation`, `review`**
- Handoff: **`checkpoint`**
- Método canónico de handoff: **skill `checkpoint-card`**
- Ejecución: **fuera del core v1, como consumidor externo**
- Extensibilidad: **semi-extensible**
- UX: **subcomandos explícitos + wizard interactivo sobre el mismo core**

---

## Anti-patrones

- Tratar YAML o JSON como fuente de verdad del plan.
- Mezclar constitución y arquitectura en un mismo documento.
- Reintroducir `ctx/` cuando la compatibilidad objetivo es `_ctx/`.
- Incluir ejecución dentro del core v1.
- Documentar `execute` como comando core.
- Convertir `checkpoint` en un subsistema separado del handoff.
- Reinventar localmente el mecanismo de `checkpoint` en vez de delegar a `checkpoint-card`.
- Diseñar el CLI como planificador generalista en v1.
- Duplicar lógica entre wizard y subcomandos.
- Implementar sincronización bidireccional Markdown ↔ YAML.
- Agregar un sistema formal de plugins antes de estabilizar los puertos internos.
