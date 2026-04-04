---
name: tmux-plan-auditor-bak
description: Ejecuta una revisión de planes en paralelo usando tmux con 4 agentes especializados (lógica, calidad/simplificación, silent failures, testing estático/cobertura) y produce un handoff JSON v2 para el agente padre. Usa esta skill siempre que el usuario pida auditar planes técnicos con salida estructurada, deduplicación de parches y confirmación explícita antes de aplicar cambios.
location: /Users/felipe_gonzalez/.pi/agent/skills/tmux-plan-auditor/SKILL.md
---

# tmux Plan Auditor (JSON handoff v2)

Esta skill corre 4 agentes en tmux y genera salida `.json` optimizada para handoff entre agentes.

## Parámetros de auditoría (4 frentes)

1. **Lógica del plan** - Ambigüedades, alcance, criterios
2. **Calidad / simplificación de código** - Refactors, smells, cambios estructurales
3. **Silent failures** - Observabilidad, manejo de errores, degradación
4. **Testing estático y cobertura** - Quality gates, validación

## Inputs

- `PLAN_PATH` (requerido)
- `-w | --workflow` (opcional): `feature`, `bugfix`, `refactor`, `security`
- `SESSION_NAME` (opcional, default `plan-audit`)
- `RUN_ID` (opcional)

## Configuración

Variables de entorno:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `AUDITOR_AGENT_TIMEOUT` | `300` | Timeout por agente en segundos |
| `AUDITOR_AUTO_CLEANUP` | `true` | Cerrar sesión tmux tras éxito |

Reglas personalizadas:

Crea `.pi/auditor-rules.yaml` en tu proyecto para sobreescribir reglas por defecto.

## Ejecución

```bash
bash /Users/felipe_gonzalez/.pi/agent/skills/tmux-plan-auditor/scripts/run_tmux_plan_audit.sh <PLAN_PATH> [--workflow bugfix]
```

## Salida esperada

En `_ctx/review_runs/<RUN_ID>/`:
- `agent-logic.json` - Hallazgos del agente de lógica
- `agent-code-quality.json` - Hallazgos de calidad
- `agent-silent-failure.json` - Hallazgos de silent failures
- `agent-testing-static.json` - Hallazgos de testing + resultados de comandos
- `handoff.json` - **Principal** (v2)
- `patch-confirmation-template.json` - Plantilla para decisiones del usuario
- `summary.md` - Resumen legible

## Contrato de `handoff.json` (v2)

```json
{
  "schema_version": "2.0",
  "execution_summary": {
    "total_duration_ms": 4500,
    "agents_completed": 4,
    "agents_failed": 0,
    "agents_timeout": 0,
    "session_cleaned_up": true
  },
  "findings": [...],
  "deduplicated_patch_candidates": [...],
  "decision_rules": {
    "allowed_user_decisions": ["approved", "rejected", "deferred"]
  }
}
```

## Regla de handoff al agente padre

El agente padre debe:
1. Leer `handoff.json`.
2. Presentar **solo** `deduplicated_patch_candidates` al usuario.
3. Capturar decisiones en `patch-confirmation-template.json`.
4. Aplicar únicamente parches con `user_decision = approved`.
5. Reportar qué parches fueron rechazados o diferidos.

## Comandos de inspección

```bash
# Ver sesión tmux activa
tmux attach -t plan-audit

# Ver último handoff
cat _ctx/review_runs/*/handoff.json | tail -1

# Ver reglas por defecto
cat /Users/felipe_gonzalez/.pi/agent/skills/tmux-plan-auditor/resources/rules/default.yaml
```
