# Plantillas de Planes

## Template: Feature Backend

```json
{
  "id": "<generated>",
  "task": "Implementar feature X",
  "status": "DRAFT",
  "phases": [
    {
      "name": "Preparación",
      "steps": [
        "Crear migración de BD",
        "Definir modelos/schemas",
        "Setup tests"
      ],
      "dependencies": []
    },
    {
      "name": "Implementación",
      "steps": [
        "Crear repositorio",
        "Crear servicio",
        "Crear controlador",
        "Crear rutas"
      ],
      "dependencies": ["Preparación"]
    },
    {
      "name": "Validación",
      "steps": [
        "Tests unitarios",
        "Tests integración",
        "Validar endpoints"
      ],
      "dependencies": ["Implementación"]
    }
  ],
  "risks": [
    {
      "description": "Migración puede romper datos existentes",
      "mitigation": "Crear backup, probar en staging primero"
    }
  ],
  "metrics": {
    "expected_tokens": 15000,
    "estimated_latency_s": 3600
  }
}
```

## Template: Refactoring

**Diferencias clave**:
- Fase de análisis de impacto
- Tests de regresión obligatorios
- Plan de rollback

## Template: Bug Fix

**Diferencias clave**:
- Fase de reproducción
- Root cause analysis
- Test de regresión específico

