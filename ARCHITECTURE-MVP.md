# plan_dope — MVP Operativo

> Este documento es un **resumen operativo** del MVP vigente.  
> La autoridad real está en `CONSTITUTION.md` y `ARCHITECTURE-v1.md`.  
> Si hay conflicto, manda la constitución, luego la arquitectura v1.

---

## Qué es el MVP

`plan_dope` v1 genera, valida y revisa **planes técnicos de desarrollo**.  
No ejecuta trabajo técnico. No administra delivery. Produce planes legibles, validables y transferibles.

**Runtime**: TypeScript + Node.js  
**Alcance**: planes técnicos (features, bugfixes, refactors)  
**Superficies**: Markdown + YAML  
**Fuente de verdad**: `plan.md`  
**Derivado**: `plan.yaml`  
**Convención de carpetas**: `_ctx/`  
**Modelo**: multi-proyecto con `cwd` default + `--project <path>` override

---

## Pipelines core

Solo tres, más un artefacto de handoff:

| Pipeline | Entrada | Salida |
|----------|---------|--------|
| `authoring` | intención humana | `plan.md` |
| `validation` | `plan.md` | `plan.yaml` + `validation-report.yaml` |
| `review` | `plan.md` + `plan.yaml` + `validation-report.yaml` | `review-report.md` |
| `checkpoint` *(artefacto)* | plan `REVIEWED` + `review-report.md` | checkpoint card vía skill `checkpoint-card` |

La ejecución queda **fuera del core v1**. Un consumidor externo puede ejecutar un plan, pero eso no es responsabilidad de `plan_dope`.

---

## Estructura de artefactos por proyecto

```
<target-repo>/
└── _ctx/
    ├── plans/
    │   └── <plan-id>/
    │       ├── plan.md               # fuente humana de verdad
    │       ├── plan.yaml             # derivado para validación
    │       ├── validation-report.yaml
    │       └── review-report.md
    ├── review_runs/
    │   └── <run-id>/
    │       ├── input-ref.yaml
    │       ├── findings.yaml
    │       └── summary.md
    └── checkpoints/
        └── YYYY-MM-DD/
            └── checkpoint_HHMMSS_<name>.md
```

Estado global del CLI (configuración y caché regenerable):

```
~/.plan_dope/
├── config/
│   └── config.yml
└── cache/
    └── derived/
```

---

## Estados del plan

| Estado | Significado |
|--------|-------------|
| `DRAFT` | plan en construcción |
| `DERIVED` | `plan.yaml` generado desde `plan.md` |
| `VALIDATED` | `plan.yaml` validado, reporte producido |
| `REVIEWED` | review completado con veredicto positivo |
| `HANDOFF_READY` | checkpoint emitido, listo para consumo externo |

### Transiciones

```
DRAFT
  └─(plan derive)────────▶ DERIVED

DERIVED
  └─(plan validate)──────▶ VALIDATED

VALIDATED
  └─(plan review: PASS | PASS_WITH_NOTES)────────▶ REVIEWED
  └─(plan review: FAIL)──────────────────────────▶ DRAFT

REVIEWED
  └─(plan checkpoint: pause | transfer | completion)────▶ HANDOFF_READY
```

Retrocesos:

- si falla `derive` → `DRAFT`
- si falla `validate` → `DRAFT` o `DERIVED` según error
- si `review` devuelve `FAIL` → `DRAFT`
- si cambia `plan.md` → `DRAFT` (invalidación total)

---

## Veredictos de review

| Veredicto | Estado resultante |
|-----------|------------------|
| `PASS` | `REVIEWED` |
| `PASS_WITH_NOTES` | `REVIEWED` |
| `FAIL` | `DRAFT` |

Los veredictos pertenecen al review, no al estado del plan.

---

## Orden de autoridad (anti-drift)

```
plan.md → plan.yaml → validation-report.yaml / review-report.md → checkpoint card
```

No existe autoridad inversa.

### Regla de invalidación

Si cambia `plan.md` después de existir derivados:

- `plan.yaml` deja de ser vigente
- `validation-report.yaml` deja de ser vigente
- `review-report.md` deja de ser vigente
- cualquier checkpoint existente pasa a histórico
- el plan vuelve a `DRAFT`

Los artefactos previos se conservan como evidencia histórica, no se borran.

---

## Comandos

| Comando | Responsabilidad |
|---------|----------------|
| `plan create` | iniciar authoring, crear esqueleto de `plan.md` |
| `plan derive` | derivar `plan.yaml` desde `plan.md` |
| `plan validate` | validar `plan.yaml`, producir `validation-report.yaml` |
| `plan review` | revisar plan, producir `review-report.md` |
| `plan checkpoint` | delegar a `checkpoint-card` para producir handoff |
| `plan wizard` | orquestar interactivamente create → derive → validate → review → checkpoint |

### Fuera de contrato en v1

- `plan execute`
- `plan run`
- `plan apply`
- `plan approve`
- `plan pause`
- `plan resume`

---

## Resolución del proyecto target

1. `--project <path>` manda
2. si no existe, se usa `cwd`
3. el path resuelto debe identificar un repo válido
4. si no identifica un repo válido, el comando falla con error explícito

---

## Checkpoint

El checkpoint se materializa usando la skill existente **`checkpoint-card`**. No se reinventa.

- solo se emite desde un plan `REVIEWED`
- `handoff_reason` cerrado: `pause`, `transfer`, `completion`
- payload mínimo: `name`, `current_plan`, `completed_tasks`, `pending_tasks`, `pending_errors`, `next_agent_prompt`, `validation_report`
- se persiste en `_ctx/checkpoints/YYYY-MM-DD/`
- pasa el validate/lint propio de `checkpoint-card` antes de considerarse válido

---

## Lo que el core v1 NO hace

- ejecución de tareas
- scheduling de delivery
- CI/CD
- resolución de runtime externo
- sincronización bidireccional Markdown ↔ YAML
- planificación generalista no técnica

---

## Decisiones cerradas

| Decisión | Valor |
|----------|-------|
| Fuente de verdad | `plan.md` |
| Derivado | `plan.yaml` |
| Convención de carpetas | `_ctx/` |
| Pipelines core | `authoring`, `validation`, `review` |
| Handoff | `checkpoint` vía `checkpoint-card` |
| Ejecución | fuera del core v1 |
| Alcance | técnico, no generalista |
| Modelo | multi-proyecto, estado híbrido |
| Comandos | `create`, `derive`, `validate`, `review`, `checkpoint`, `wizard` |

## Riesgos residuales

- pérdida semántica en derivación Markdown → YAML
- proliferación de convenciones paralelas de carpetas
- presión futura para reintroducir ejecución dentro del core
- expansión prematura a dominio generalista
