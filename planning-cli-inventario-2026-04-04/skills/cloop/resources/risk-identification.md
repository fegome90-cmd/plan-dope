# Identificación de Riesgos Comunes

## Categorías de Riesgos

### 1. Técnicos

- **Dependencias externas**: APIs, servicios, librerías
  - Mitigación: Fallbacks, versiones pinned, mocks en tests

- **Cambios breaking**: Migraciones, refactors grandes
  - Mitigación: Feature flags, releases graduales, rollback plan

- **Performance**: Latencia, memoria, CPU
  - Mitigación: Load testing, profiling, optimización incremental

### 2. De Integración

- **APIs externas**: Cambios no documentados, rate limits
  - Mitigación: Versiones específicas, caché, circuit breakers

- **Integración con sistemas legacy**
  - Mitigación: Wrappers, adaptadores, tests de integración extensos

### 3. De Datos

- **Migraciones de BD**: Pérdida de datos, downtime
  - Mitigación: Backups, migraciones reversibles, pruebas en staging

- **Datos corruptos o inconsistentes**
  - Mitigación: Validación fuerte, sanity checks, limpieza previa

### 4. De Timeline

- **Estimaciones incorrectas**
  - Mitigación: Buffer de 20-30%, priorización, scope reduction

- **Bloqueadores externos**
  - Mitigación: Identificar early, tener alternativas, comunicación proactiva

## Patrón de Documentación

Para cada riesgo:
1. **Descripción**: Qué puede salir mal
2. **Probabilidad**: Alta/Media/Baja
3. **Impacto**: Alto/Medio/Bajo
4. **Mitigación**: Acción específica para prevenir/mitigar
5. **Plan B**: Qué hacer si el riesgo se materializa

