---
id: plan-save-workflow
version: 0.1.0
type: workflow
summary: 'Workflow para guardar plan aprobado: genera tríada dev-docs (plan.md, context.md, tasks.md) y snapshot MemTech L1.'
audience: engineers
when_to_use: Cuando un plan está aprobado y necesitas generar la documentación de desarrollo (dev-docs) para comenzar la ejecución.
provides: Generación automática de tríada, integración con sistema de planes, preparación de contexto para ejecución.
resources:
  - resources/workflow-steps.md
  - resources/memtech-integration.md
scripts:
  - name: save-workflow
    run: skills plan save <plan-id> --approve
    note: 'Ejecuta el workflow completo: aprobación + generación de tríada.'
limits: 'Requiere plan previamente creado con al menos una fase definida.'
---

## Objetivo

Automatizar el proceso de guardado de plan aprobado, generando la tríada de dev-docs necesaria para la ejecución y preparando el contexto (snapshot MemTech L1) para mantener coherencia durante el desarrollo.

**Cuándo usar**: Después de crear y aprobar un plan, antes de comenzar la ejecución.

**Cuándo NO usar**: Si el plan está en DRAFT o PENDING_APPROVAL, aprueba primero.

**Qué problema resuelve**: Elimina pasos manuales repetitivos, asegura consistencia entre plan y dev-docs, prepara contexto estructurado para el agente.

## Procedimiento (resumen)

1. **Validar Plan**: Verificar que el plan existe y está en estado aprobable (DRAFT o PENDING_APPROVAL).

2. **Aprobar Plan**: Si está pendiente, cambiar estado a APPROVED con timestamp y aprobador.

3. **Generar Tríada**:
   - `plan.md`: Plan completo en formato markdown legible
   - `context.md`: Contexto del proyecto, archivos relevantes, dependencias
   - `tasks.md`: Checklist vivo derivado de fases del plan

4. **Crear Directorio de Tarea**: En `dev/active/<task-name>/` con toda la tríada.

5. **Preparar Snapshot MemTech L1**: Estructura datos del plan para snapshot (TODO: implementar integración).

6. **Validar Generación**: Verificar que todos los archivos se crearon correctamente.

## Checklist

- [ ] Plan existe y es válido
- [ ] Plan aprobado (status: APPROVED)
- [ ] Tríada generada (plan.md, context.md, tasks.md)
- [ ] Directorio `dev/active/<task-name>/` creado
- [ ] Metadata en `task.json` con referencia al plan
- [ ] Snapshot MemTech L1 preparado (estructura lista para integración)

## Workflow Detallado

### Paso 1: Validación de Plan

```bash
# Verificar que plan existe
plan = loadPlan(planId)

# Validar estructura
validation = validatePlan(plan)
if not validation.valid:
  error("Plan validation failed")
```

### Paso 2: Aprobación

```bash
# Si plan no está aprobado
if plan.status != 'APPROVED':
  plan.status = 'APPROVED'
  plan.approvedBy = getCurrentUser()
  plan.approvedAt = now()
  savePlan(plan)
```

### Paso 3: Generación de Tríada

```bash
# Generar markdowns
generatePlanMarkdown(plan) → dev/active/<task>/plan.md
generateContextMarkdown(taskName, plan) → dev/active/<task>/context.md
generateTasksMarkdown(taskName, plan) → dev/active/<task>/tasks.md
```

### Paso 4: Metadata

```json
{
  "name": "<task-name>",
  "planId": "<plan-id>",
  "planPath": "dev/plans/<plan-id>.json",
  "created": "<iso-timestamp>",
  "updated": "<iso-timestamp>",
  "status": "active"
}
```

### Paso 5: Snapshot MemTech L1 (Estructura)

```json
{
  "type": "plan_snapshot",
  "plan_id": "<plan-id>",
  "task": "<task-description>",
  "phases": [...],
  "approved_at": "<iso-timestamp>",
  "status": "APPROVED"
}
```

## Ejemplos

### ✅ Correcto

**Input**: `skills plan save abc123 --approve`

**Output**:
```
✅ Plan approved: abc123
✅ Generated plan.md
✅ Generated context.md
✅ Generated tasks.md
✅ Dev-docs triada created: dev/active/implement-feature-x/
```

### ❌ Incorrecto

**Input**: `skills plan save invalid-id`

**Output**: Error "Plan not found" o "Plan validation failed"

## Recursos Adicionales

- `./resources/workflow-steps.md` - Pasos detallados del workflow
- `./resources/memtech-integration.md` - Integración con MemTech (cuando esté implementada)

