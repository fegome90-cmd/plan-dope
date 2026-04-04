# Informe de Alineación — ARCHITECTURE-MVP.md

## Fecha
2026-04-04

## Autoridad consultada
1. `CONSTITUTION.md` (ley suprema)
2. `ARCHITECTURE-v1.md` (arquitectura vigente)

## Resultado
`ARCHITECTURE-MVP.md` fue reescrito como resumen operativo alineado. Ya no compite con `ARCHITECTURE-v1.md`.

---

## Contradicciones encontradas

### 1. `EXECUTE` como pipeline core
**Antes**: El archivo mostraba `EXECUTE` como cuarta fase del pipeline, con diagrama de flujo GENERATE → REVIEW → EXECUTE → CHECKPOINT.
**Constitución**: Ley 3 — solo `authoring`, `validation`, `review`. Ejecución fuera del core.
**Acción**: Eliminado. El pipeline ahora es authoring → validation → review, con checkpoint como artefacto de handoff.

### 2. Comandos fantasma de ejecución
**Antes**: `plan execute`, `plan approve`, `plan pause`, `plan resume`, `plan status`, `plan edit`, `plan list`, `plan show`, `checkpoint save`, `checkpoint list`, `checkpoint show` (13 comandos).
**Constitución**: Ley 8 — cero comandos fantasma.
**v1**: Solo `create`, `derive`, `validate`, `review`, `checkpoint`, `wizard`.
**Acción**: Eliminados los 7 comandos que no existen en v1. Reemplazados por los 6 comandos canónicos.

### 3. Estados obsoletos
**Antes**: `DRAFT`, `REVIEWING`, `APPROVED`, `EXECUTING`, `PAUSED`, `BLOCKED`, `COMPLETED`, `ARCHIVED` (8 estados).
**v1**: `DRAFT`, `DERIVED`, `VALIDATED`, `REVIEWED`, `HANDOFF_READY` (5 estados).
**Acción**: Eliminados 7 estados inexistentes. Reemplazados por los 5 estados canónicos.

### 4. Veredictos obsoletos
**Antes**: `BLOCK`, `CAUTION`, `READY`, `READY_WITH_NOTES`.
**v1**: `PASS`, `PASS_WITH_NOTES`, `FAIL`.
**Acción**: Eliminados los 4 veredictos inventados. Reemplazados por los 3 veredictos canónicos.

### 5. Artefactos no canónicos
**Antes**: `plan.json`, `plan.lock.json`, `review-ref.json`, `state.json`, `batch-log.md`.
**Constitución**: Ley 1 — `plan.md` manda, YAML deriva, JSON nunca como autoridad semántica.
**v1**: Artefactos canónicos son `plan.md`, `plan.yaml`, `validation-report.yaml`, `review-report.md`.
**Acción**: Eliminados todos los artefactos JSON inventados. Reemplazados por los contratos de v1.

### 6. Ruta `ctx/` sin underscore
**Antes**: Usaba `ctx/` como convención.
**Constitución**: Ley 4 — `_ctx/` es la convención compatible en v1.
**Acción**: Corregido a `_ctx/` en toda la estructura.

### 7. Checkpoint como subsistema propio
**Antes**: Definía su propio formato de checkpoint, contratos propios, reglas propias.
**Constitución**: Anti-patrón — prohibido reinventar checkpoint en vez de delegar a `checkpoint-card`.
**v1**: Delegación a skill `checkpoint-card` con payload mínimo definido.
**Acción**: Eliminado formato propio. Reemplazado por delegación a `checkpoint-card` con el payload mínimo de v1.

### 8. `handoff_reason` libre
**Antes**: No existía el concepto de `handoff_reason`.
**v1**: Campo explícito y cerrado: `pause`, `transfer`, `completion`.
**Acción**: Agregado el contrato de `handoff_reason`.

### 9. Pipeline diagram con EXECUTE
**Antes**: Diagrama ASCII de 4 fases incluyendo EXECUTE.
**Acción**: Reemplazado por tabla de pipelines core (authoring, validation, review) + checkpoint como artefacto.

### 10. Estado global del CLI ausente
**Antes**: No mencionaba `~/.plan_dope/`.
**v1**: Modelo híbrido con estado global (`~/.plan_dope/config/`, `~/.plan_dope/cache/`) + artefactos por proyecto.
**Acción**: Agregada la estructura de estado global.

### 11. Resolución de proyecto target ausente
**Antes**: No mencionaba `--project <path>`.
**Constitución**: Ley 5 — multi-proyecto con resolución explícita.
**v1**: Regla cerrada con `--project` > `cwd` > error explícito.
**Acción**: Agregada la sección de resolución del proyecto target.

### 12. Regla de invalidación incompleta
**Antes**: Solo mencionaba invalidación de `plan.lock.json` por hash.
**v1**: Invalidación cascada completa — todos los derivados pierden vigencia, el plan vuelve a `DRAFT`, artefactos previos se conservan como histórico.
**Acción**: Reemplazada por la regla de invalidación completa de v1.

### 13. Orden de autoridad invertido
**Antes**: `plan.json` como fuente, `plan.md` como derivado.
**Constitución**: Ley 1 — `plan.md` manda siempre.
**v1**: Orden `plan.md` → `plan.yaml` → `validation-report.yaml` / `review-report.md` → `checkpoint card`.
**Acción**: Corregido el orden de autoridad.

---

## Qué se eliminó

| Elemento | Razón |
|----------|-------|
| Pipeline EXECUTE | fuera del core v1 (Constitución Ley 3) |
| `plan execute`, `plan approve`, `plan pause`, `plan resume`, `plan status`, `plan edit`, `plan list`, `plan show`, `checkpoint save`, `checkpoint list`, `checkpoint show` | comandos fantasma (Constitución Ley 8) |
| Estados `REVIEWING`, `APPROVED`, `EXECUTING`, `PAUSED`, `BLOCKED`, `COMPLETED`, `ARCHIVED` | no existen en v1 |
| Veredictos `BLOCK`, `CAUTION`, `READY`, `READY_WITH_NOTES` | no existen en v1 |
| `plan.json` | JSON nunca como autoridad semántica (Constitución Ley 1) |
| `plan.lock.json` | artefacto inventado, no existe en v1 |
| `review-ref.json` | reemplazado por `review-report.md` como superficie vigente |
| `state.json` | estado de ejecución fuera del core |
| `batch-log.md` | log de ejecución fuera del core |
| Formato propio de checkpoint | anti-patrón: delegar a `checkpoint-card` |
| Ruta `ctx/` sin underscore | Constitución Ley 4 |
| `plan abort` | comando fantasma |
| `--force` para saltar review | anti-patrón |
| Diagrama de máquina de estados con ejecución | no aplica al core v1 |
| Apéndice de extensibilidad post-MVP | fuera de scope de un resumen operativo |
| Sección 11 (revisión punto por punto v2 vs real) | documento de trabajo, no parte del MVP |

## Qué se reemplazó

| Antes | Después |
|-------|---------|
| 13 comandos inventados | 6 comandos canónicos |
| 8 estados inventados | 5 estados de v1 |
| 4 veredictos inventados | 3 veredictos de v1 |
| 5 artefactos JSON inventados | 4 artefactos canónicos (md, yaml, yaml, md) |
| `ctx/` | `_ctx/` |
| Checkpoint propio | Delegación a `checkpoint-card` |
| Orden de autoridad invertido | `plan.md` → `plan.yaml` → reports → checkpoint |
| Pipeline con EXECUTE | authoring + validation + review + checkpoint artefacto |
| 500+ líneas de especificación | ~130 líneas de resumen operativo |

---

## Por qué la nueva versión ya no compite con ARCHITECTURE-v1.md

1. **Es un subconjunto, no un paralelo**: El archivo ahora contiene solo lo esencial del MVP — estados, comandos, transiciones, contratos — sin redefinir nada que ya esté en v1.

2. **Declara su subordinación explícita**: La primera línea dice que la autoridad real está en `CONSTITUTION.md` y `ARCHITECTURE-v1.md`. No hay ambigüedad.

3. **No introduce conceptos nuevos**: Todo lo que aparece en el archivo viene directamente de los dos documentos de autoridad. No hay invención local.

4. **Es un resumen operativo, no una especificación**: El propósito de este archivo es que un desarrollador pueda consultar rápidamente qué estados existen, qué comandos hay, qué transiciones son válidas — sin tener que leer 600 líneas de `ARCHITECTURE-v1.md`.

5. **No maquilla contradicciones**: Si algo no existe en v1, no aparece acá. Punto.

6. **Reduce drift semántico al mínimo**: Al ser un subconjunto directo de v1, cualquier cambio en v1 se refleja automáticamente en este archivo. No hay superficie para divergencia.
