# Metodología CLOOP - Referencia

## Resumen

CLOOP es una metodología iterativa con metacognición que implementa arquitecturas científicamente validadas.

**Fases**:
1. **C**larify - Objetivo SMART, hipótesis, criterios de éxito
2. **L**ayout - Arquitectura mínima, contratos, métricas
3. **O**perate - Ejecución con checklist de tareas
4. **O**bserve - Recolección de métricas y evidencia
5. **R**eflect - Metacognición, análisis de errores, ajustes

## Clarify: Objetivo SMART

**S**pecific: Qué exactamente se va a hacer
**M**easurable: Cómo se medirá el éxito
**A**chievable: Factible con recursos disponibles
**R**elevant: Alineado con objetivos superiores
**T**ime-bound: Tiempo límite claro

### Hipótesis

Identificar suposiciones clave que se validarán:
- ¿Qué asumimos que funcionará?
- ¿Qué necesitamos validar primero?

### Criterios de Éxito

Métricas cuantificables:
- Performance: latencia < X ms
- Cobertura: tests ≥ Y%
- Calidad: errores TypeScript = 0

## Layout: MVP Ejecutable

### Arquitectura Mínima

Componentes esenciales sin "nice-to-have":
- ¿Qué es lo mínimo necesario para validar?
- ¿Cómo se integra con sistemas existentes?

### Interfaces y Contratos

APIs, schemas, tipos:
- Interfaces TypeScript
- JSON Schemas
- Contratos de servicios

## Operate: Plan de Ejecución

### Fases

Descomponer en fases secuenciales:
- Fase 1: Preparación (setup, dependencias)
- Fase 2: Implementación core
- Fase 3: Validación y pruebas

### Checklist Concreta

Tareas verificables:
- [ ] Tarea 1 (medible, con DoD)
- [ ] Tarea 2 (medible, con DoD)

## Observe: Métricas y Evidencia

### Métricas Esperadas

Tabla con métricas y umbrales:
| Métrica | Umbral | Medición |
|---------|--------|----------|
| Latencia | < 100ms | Promedio de requests |
| Cobertura | ≥ 80% | Jest coverage report |

### Evidencia

Qué recolectar:
- Screenshots de funcionalidad
- Logs de ejecución
- Reports de tests

## Reflect: Metacognición

### Riesgos y Mitigaciones

Identificar posibles problemas:
- Riesgo: Dependencia externa puede fallar
- Mitigación: Fallback local, retry con exponential backoff

### Señales Stop/Go

Cuándo detener o continuar:
- STOP: Error rate > 10%
- GO: Tests pasando, latencia < umbral

### Lecciones Aprendidas

Documentar al finalizar:
- Qué funcionó bien
- Qué no funcionó
- Qué mejorar en próxima iteración

