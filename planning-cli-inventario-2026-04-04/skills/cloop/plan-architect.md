---
id: plan-architect
version: 0.1.0
type: generator
summary: Genera planes estructurados siguiendo metodología CLOOP (Clarify → Layout → Operate → Observe → Reflect) para tareas de desarrollo.
audience: engineers, architects
when_to_use: Cuando necesites crear un plan estructurado para una tarea, feature o proyecto. Usa cuando el usuario ejecuta "/plan <tarea>" o requiere planificación formal.
provides: Meta-prompt CLOOP, generación de plan con fases estructuradas, identificación de riesgos y métricas.
resources:
  - resources/cloop-methodology.md
  - resources/plan-templates.md
  - resources/risk-identification.md
scripts:
  - name: generate-plan
    run: skills plan create "<task>"
    note: Genera un plan básico desde descripción de tarea.
limits: Genera estructura base; requiere edición manual para fases específicas y riesgos detallados.
---

## Objetivo

Generar planes de desarrollo estructurados que siguen la metodología CLOOP, asegurando que cada tarea tenga un objetivo SMART claro, hipótesis identificadas, criterios de éxito medibles, arquitectura mínima, y plan de ejecución con gates de validación.

**Cuándo usar**: Cuando el usuario solicita planificar una tarea compleja, feature o proyecto.

**Cuándo NO usar**: Para tareas triviales que no requieren planificación estructurada (< 15 minutos de trabajo).

**Qué problema resuelve**: Evita "coding sin plan", asegura adherencia a metodología CLOOP, facilita seguimiento y validación de progreso.

## Procedimiento (resumen)

1. **Clarify**: Extraer objetivo SMART desde descripción de tarea. Identificar hipótesis implícitas y criterios de éxito.

2. **Layout**: Proponer arquitectura mínima ejecutable (MVP), definir interfaces/contratos necesarios, listar métricas a recolectar.

3. **Operate**: Descomponer en fases con pasos concretos, identificar dependencias entre fases, definir checklist de validación.

4. **Observe**: Especificar métricas esperadas con umbrales, definir evidencia a recolectar (logs, tests, KPIs).

5. **Reflect**: Identificar riesgos potenciales con mitigaciones, definir señales de stop/go, documentar lecciones previas relevantes.

6. **Materializar**: Generar Plan JSON con estructura completa, guardarlo en `dev/plans/<plan-id>.json`, crear markdown para revisión.

## Checklist

- [ ] Objetivo SMART completo (Specific, Measurable, Achievable, Relevant, Time-bound)
- [ ] Al menos una hipótesis identificada
- [ ] Criterios de éxito cuantificables definidos
- [ ] Arquitectura mínima descrita con componentes clave
- [ ] Al menos 2 fases con pasos concretos
- [ ] Riesgos identificados con mitigaciones
- [ ] Métricas definidas con umbrales

## Meta-prompt CLOOP

Al generar un plan, sigue esta estructura:

```
## CLOOP: Clarify

### Objetivo SMART
- Specific: [tarea específica]
- Measurable: [cómo medir éxito]
- Achievable: [factibilidad]
- Relevant: [relevancia]
- Time-bound: [tiempo estimado]

### Hipótesis Principales
- H1: [hipótesis identificada]
- H2: [si aplica]

### Criterios de Éxito Cuantificables
- [Métrica 1]: ≥ [umbral]
- [Métrica 2]: < [umbral]

## CLOOP: Layout

### Arquitectura Mínima
[Componentes clave necesarios]

### Interfaces y Contratos
[APIs, schemas, tipos necesarios]

### Métricas a Recolectar
[Lista de métricas]

## CLOOP: Operate

### Fases y Pasos
- Fase 1: [nombre]
  - Paso 1.1: [descripción]
  - Paso 1.2: [descripción]
- Fase 2: [nombre]
  - Paso 2.1: [descripción]

### Dependencias
[Fase X depende de Fase Y]

## CLOOP: Observe

### Métricas Esperadas
[Métrica: Umbral esperado]

### Evidencia
[Qué evidencia recolectar]

## CLOOP: Reflect

### Riesgos
- Riesgo 1: [descripción]
  - Mitigación: [acción]

### Señales Stop/Go
- STOP: [condición]
- GO: [condición]
```

## Ejemplos

### ✅ Correcto

**Input**: "crear endpoint /api/users que permita CRUD de usuarios"

**Output**: Plan con:
- Objetivo SMART: "Implementar API RESTful para gestión de usuarios con operaciones CRUD..."
- Fases: 1) Modelo y migración, 2) Endpoints, 3) Validación y tests
- Métricas: Tiempo < 2h, Cobertura tests ≥ 80%
- Riesgos: Validación de entrada, manejo de errores

### ❌ Incorrecto

**Input**: "crear endpoint /api/users"

**Output**: Plan vago sin métricas, sin fases claras, sin riesgos identificados.

## Recursos Adicionales

- `./resources/cloop-methodology.md` - Guía completa de metodología CLOOP
- `./resources/plan-templates.md` - Plantillas para diferentes tipos de planes
- `./resources/risk-identification.md` - Guía para identificar riesgos comunes

