# plan_dope — Architecture v1

> Este documento está gobernado por `CONSTITUTION.md`.  
> Si hay conflicto entre ambos artefactos, **manda la constitución**.

## Pipeline operativo

La arquitectura fusionada de v1 tiene **tres pipelines core** y **un artefacto de handoff**:

1. **Authoring**
   - Entrada: requerimiento o intención humana.
   - Salida: `plan.md`.
   - Autoridad: humana.

2. **Validation**
   - Entrada: `plan.md`.
   - Salidas: `plan.yaml` + reporte de validación.
   - Función: derivar y verificar estructura.

3. **Review**
   - Entrada: `plan.md` + `plan.yaml` + reporte de validación.
   - Salidas: reporte de review + decisión operativa.
   - Función: evaluar riesgos, gaps y consistencia técnica.

4. **Checkpoint** *(artefacto, no pipeline autónomo)*
   - Entrada: plan en estado `REVIEWED` + `review-report.md`.
   - Salida: artefacto de handoff consumible por humanos u otros sistemas.
   - Método: delegación al skill **`checkpoint-card`**.

### Resolución explícita de contradicciones

- **Markdown vs JSON/YAML como verdad**
  - Resuelto así: `plan.md` es la verdad humana; `plan.yaml` es derivado; JSON queda relegado a metadata/indexación, no a semántica del plan.

- **Core con ejecución vs core sin ejecución**
  - Resuelto así: la ejecución queda fuera del core v1. `plan_dope` entrega planes y handoffs; otro consumidor externo puede ejecutar.

- **Alcance técnico vs alcance generalista**
  - Resuelto así: la arquitectura v1 modela solo planes técnicos de desarrollo.

### Límite operacional

El core v1 **no** hace:

- ejecución de tareas;
- scheduling de delivery;
- CI/CD;
- resolución de runtime externo.

Solo produce artefactos operables por un consumidor externo.

---

## Estructura de carpetas

La arquitectura v1 usa un modelo híbrido:

### Estado global del CLI

```text
~/.plan_dope/
├── config/
│   └── config.yml
└── cache/
    └── derived/
```

Uso:

- `config/`: configuración global del CLI;
- `cache/`: datos regenerables, nunca autoridad semántica.

En v1 **no existe un registro global obligatorio de proyectos**. El estado global se limita a configuración y caché regenerable.

### Artefactos por proyecto

```text
<target-repo>/
└── _ctx/
    ├── plans/
    │   └── <plan-id>/
    │       ├── plan.md
    │       ├── plan.yaml
    │       ├── validation-report.yaml
    │       └── review-report.md
    └── review_runs/
        └── <run-id>/
            ├── input-ref.yaml
            ├── findings.yaml
            └── summary.md
    └── checkpoints/
        └── YYYY-MM-DD/
            └── checkpoint_HHMMSS_<name>.md
```

### Resolución explícita de contradicciones

- **`_ctx/` vs `ctx/`**
  - Resuelto así: la arquitectura v1 usa `_ctx/` como convención canónica por compatibilidad con el ecosistema actual.
  - `ctx/` queda fuera de contrato en v1.

### Regla de ubicación

- Default por proyecto: `_ctx/plans/`
- Override persistente opcional vía configuración global del CLI
- Override explícito por flag solo para el comando actual

Precedencia:

1. flag explícito
2. configuración global del CLI
3. default `_ctx/plans/`

En v1 **no se define un archivo de configuración por proyecto**. Si un proyecto necesita una ruta distinta, debe resolverse por flag explícito o por configuración global.

### Resolución del proyecto target

La resolución del proyecto target en v1 sigue esta regla cerrada:

1. si existe `--project <path>`, ese path manda;
2. si no existe `--project`, se usa `cwd`;
3. el path resuelto debe identificar un repo válido;
4. si no identifica un repo válido con confianza, el comando falla en cerrado con error explícito.

### Repo válido en v1

Para `plan_dope`, un repo válido es el path resuelto que cumple simultáneamente:

- existe;
- es un directorio;
- puede usarse como raíz del proyecto target;
- permite leer o crear `_ctx/` dentro de esa raíz.

Regla mínima de confianza:

- con `--project`, el path explícito define la raíz target;
- sin `--project`, `cwd` solo vale si identifica con confianza la raíz del proyecto;
- si `cwd` es ambiguo, el usuario debe pasar `--project`.

Error mínimo esperado:

> `Target project could not be resolved. Pass --project <path> or run the command from a valid project root.`

---

## Contratos de artefactos

### 1. `plan.md`

Artefacto humano canónico.

Contiene:

- propósito del plan;
- alcance técnico;
- estructura del plan;
- fases o bloques de trabajo;
- supuestos y riesgos;
- criterios de validación;
- contexto suficiente para review.

Contrato:

- editable por humanos;
- legible sin tooling adicional;
- fuente única de verdad semántica.

### 2. `plan.yaml`

Derivado estructurado desde `plan.md`.

Contiene:

- metadata del plan;
- estructura formal de secciones;
- campos necesarios para validación;
- shape estable para interoperabilidad.

Contrato:

- no se edita manualmente;
- se regenera desde `plan.md`;
- si contradice a `plan.md`, se considera inválido y se vuelve a derivar.
- debe registrar al menos provenance mínima del documento fuente:
  - ruta relativa de `plan.md`,
  - hash o fingerprint del `plan.md` vigente,
  - timestamp de derivación.

Shape mínimo esperado en v1:

- `plan_id`
- `source_md_path`
- `source_md_fingerprint`
- `derived_at`
- `scope`
- `phases`
- `risks`
- `validation_criteria`

### 3. `validation-report.yaml`

Artefacto de verificación estructurada.

Contiene:

- resultado de derivación;
- validez estructural;
- errores;
- warnings;
- trazas mínimas de qué se validó.

Contrato:

- describe el estado del plan derivado;
- no redefine el contenido del plan.
- debe registrar el fingerprint del `plan.yaml` validado.
- si `plan.md` cambia después de la validación, deja de ser un reporte vigente y pasa a histórico.

Shape mínimo esperado en v1:

- `plan_id`
- `plan_yaml_fingerprint`
- `validated_at`
- `status`
- `errors`
- `warnings`

### 4. `review-report.md`

Artefacto humano de review.

Contiene:

- hallazgos;
- contradicciones detectadas;
- riesgos;
- veredicto operativo.

Contrato:

- es legible por humanos;
- usa `plan.md` y `plan.yaml` como inputs;
- no reemplaza al plan.
- debe declarar el fingerprint del `plan.md` revisado o una referencia inequívoca a la revisión realizada.
- si `plan.md` cambia después del review, deja de ser un review vigente y pasa a histórico.

Shape mínimo esperado en v1:

- `run_id`
- `plan_id`
- `plan_md_fingerprint`
- `reviewed_at`
- `verdict`
- `findings`
- `notes`

Secciones mínimas esperadas en v1:

- resumen ejecutivo;
- veredicto;
- findings agrupados por severidad;
- contradicciones detectadas;
- próximos pasos;
- referencia explícita al `run-id`.

#### Autoridad del dominio review

En v1, la autoridad del review queda separada así:

- `review-report.md` es la **superficie canónica vigente** del review asociada al plan actual;
- `_ctx/review_runs/<run-id>/` es el **historial inmutable** de cada corrida de review.

Contrato:

- el estado del plan se decide contra el veredicto vigente representado en `review-report.md`;
- `review_runs/` conserva evidencia y detalle de ejecución, pero no redefine por sí mismo el estado vigente del plan;
- `review-report.md` debe referenciar inequívocamente el `run-id` del que proviene.

### 4.1 `_ctx/review_runs/<run-id>/`

Artefactos de historial del pipeline de review.

Contienen:

- referencia de entrada revisada;
- findings estructurados;
- resumen de la corrida.

Contrato:

- son evidencia histórica e inmutable del review;
- no reemplazan a `review-report.md` como superficie vigente del plan;
- sirven para trazabilidad, auditoría y reconstrucción del review aplicado.

### 5. Veredicto de review

El review usa una taxonomy explícita y cerrada:

- `PASS`
- `PASS_WITH_NOTES`
- `FAIL`

Contrato:

- los veredictos pertenecen al **review**, no al **estado del plan**;
- `PASS` y `PASS_WITH_NOTES` habilitan la transición del plan a `REVIEWED`;
- `FAIL` devuelve el plan a `DRAFT`;
- no existe un estado separado de `APPROVED` en v1.

### 6. Mapeo veredicto → transición de estado

| Veredicto de review | Estado resultante del plan | Efecto |
|---|---|---|
| `PASS` | `REVIEWED` | el plan puede emitir handoff |
| `PASS_WITH_NOTES` | `REVIEWED` | el plan puede emitir handoff con observaciones |
| `FAIL` | `DRAFT` | el plan debe corregirse y volver a derivarse/validarse/revisarse |

### 7. Checkpoint card

El checkpoint de v1 se materializa usando la skill existente **`checkpoint-card`**.

Artefacto de handoff.

Contiene:

- `handoff_reason`;
- estado actual del plan;
- decisión o corte operativo;
- contexto mínimo para retomar;
- punteros a artefactos relevantes.

Contrato:

- sirve como transferencia de contexto;
- no ejecuta nada;
- no redefine ni la constitución ni el plan.
- solo puede emitirse desde un plan en estado `REVIEWED`;
- se persiste en `_ctx/checkpoints/YYYY-MM-DD/checkpoint_HHMMSS_<name>.md`;
- no vive dentro de `_ctx/plans/<plan-id>/`;
- debe pasar el método de validación/lint propio de `checkpoint-card` antes de considerarse válido;
- si su fingerprint de origen no coincide con el `plan.md` vigente, queda como histórico y no como handoff actual.

#### `handoff_reason`

Campo explícito y cerrado:

- `pause`
- `transfer`
- `completion`

No se permiten motivos libres en v1.

#### Payload mínimo hacia `checkpoint-card`

`plan_dope` debe entregar a `checkpoint-card`, como mínimo:

- `name`
- `current_plan`
- `completed_tasks`
- `pending_tasks`
- `pending_errors`
- `next_agent_prompt`
- `validation_report`

Y puede incluir, si ya existe en los artefactos del plan:

- `delegation_context`

Contrato:

- `current_plan` debe referir al plan vigente;
- `completed_tasks` y `pending_tasks` refieren al estado del pipeline de planificación/handoff, no a ejecución técnica fuera del core v1;
- `next_agent_prompt` debe construirse contra el plan y review vigentes, no contra artefactos históricos;
- el payload debe poder reconstruirse solo a partir de artefactos del core v1, sin depender de memoria implícita de sesión.

#### Semántica de `validation_report`

El campo `validation_report` que consume `checkpoint-card` **no** es el `validation-report.yaml` del plan.

En v1:

- `validation-report.yaml` sigue siendo el artefacto canónico de validación del plan;
- `validation_report` dentro del payload hacia `checkpoint-card` refiere al resultado del pre-flight/lint del propio método `checkpoint-card`;
- si el handoff necesita incorporar contexto de validación del plan, ese contexto debe viajar como referencia o resumen derivado dentro de `current_plan`, `pending_errors`, `next_agent_prompt` o `delegation_context`, pero no reemplazando la semántica propia de `validation_report`.

### Regla anti-drift

El sistema solo admite este orden de autoridad:

`plan.md` → `plan.yaml` → `validation-report.yaml` / `review-report.md` → `checkpoint card`

No existe autoridad inversa.

### Regla de invalidación

Si cambia `plan.md` después de existir artefactos derivados:

- `plan.yaml` deja de ser el derivado vigente;
- `validation-report.yaml` deja de ser el reporte vigente;
- `review-report.md` deja de ser el review vigente;
- cualquier checkpoint existente deja de ser el handoff vigente y queda histórico;
- el estado del plan vuelve a `DRAFT`.

Mientras no se regenere y revalide, no puede emitirse un handoff actual.

La invalidación no implica borrar artefactos previos.  
Los artefactos previos se conservan como evidencia histórica de una versión anterior del plan.

---

## Comandos

Los comandos core documentados para v1 son:

### `plan create`

Responsabilidad:

- iniciar authoring;
- crear el esqueleto de `plan.md`.

### `plan derive`

Responsabilidad:

- derivar `plan.yaml` desde `plan.md`.

### `plan validate`

Responsabilidad:

- validar `plan.yaml`;
- producir `validation-report.yaml`.

### `plan review`

Responsabilidad:

- revisar el plan usando `plan.md` + `plan.yaml` + `validation-report.yaml`;
- producir `review-report.md`.

### `plan checkpoint`

Responsabilidad:

- delegar al skill `checkpoint-card` para producir el handoff canónico.

### `plan wizard`

Responsabilidad:

- orquestar interactivamente `create`, `derive`, `validate`, `review` y `checkpoint`;
- reutilizando el mismo core.

### Comandos explícitamente fuera de contrato en v1

- `plan execute`
- `plan run`
- `plan apply`

### Regla de cero comandos fantasma

Todo comando listado arriba corresponde a una responsabilidad real del core.  
Nada fuera de esa lista debe aparecer documentado como parte del MVP.

---

## Transiciones

Estados operativos del plan en v1:

- `DRAFT`
- `DERIVED`
- `VALIDATED`
- `REVIEWED`
- `HANDOFF_READY`

Transiciones permitidas:

```text
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

Transiciones de retroceso:

- si falla `derive`, vuelve a `DRAFT`;
- si falla `validate`, vuelve a `DRAFT` o `DERIVED` según el tipo de error;
- si `review` devuelve `FAIL`, vuelve a `DRAFT`;
- si cambia `plan.md` luego de cualquier derivado, vuelve a `DRAFT`.

### Resolución explícita de contradicciones

- No existe transición a `EXECUTING` dentro del core.
- `HANDOFF_READY` significa “listo para ser consumido externamente”, no “en ejecución”.
- No existe estado `APPROVED` ni `PAUSED` dentro del core v1.
- El checkpoint no consume estados inexistentes; consume un plan ya `REVIEWED`.

---

## Riesgos de drift

### 1. Drift semántico entre `plan.md` y `plan.yaml`

Riesgo:

- que el YAML capture menos, más o distinto de lo que el Markdown realmente dice.

Mitigación:

- derivación determinística;
- validación contra contratos explícitos;
- invalidar derivados cuando cambia `plan.md`.

### 2. Drift de pathing entre `_ctx/` y otras convenciones

Riesgo:

- que aparezcan `ctx/`, `docs/plans/` o rutas paralelas.

Mitigación:

- canon único en v1: `_ctx/`;
- precedencia de configuración explícita;
- documentación alineada al mismo contrato.

### 3. Drift entre wizard y subcomandos

Riesgo:

- que el wizard haga más o menos que los subcomandos.

Mitigación:

- el wizard solo orquesta;
- la lógica vive en el core de subcomandos.

### 4. Drift entre review y validación

Riesgo:

- que review empiece a revalidar estructura o que validation empiece a emitir criterio arquitectónico.

Mitigación:

- validation verifica estructura y contrato;
- review evalúa calidad, riesgos y coherencia técnica.

### 5. Drift por ejecución externa

Riesgo:

- que consumidores externos traten artefactos de handoff como si fueran instrucciones ejecutables completas.

Mitigación:

- dejar explícito que el **checkpoint card canónico** transfiere contexto;
- la ejecución no pertenece al core ni a sus estados.

### 6. Drift por checkpoint ad hoc

Riesgo:

- que el ejecutor o el propio CLI generen un checkpoint local alternativo y rompan el contrato de handoff.

Mitigación:

- fijar `checkpoint-card` como método canónico;
- prohibir formatos de checkpoint paralelos en v1.

---

## Decisiones cerradas

- Markdown es la fuente humana de verdad.
- YAML es derivado para validación e interoperabilidad.
- `_ctx/` es la convención compatible en v1.
- El core v1 incluye `authoring`, `validation` y `review`.
- `checkpoint` es artefacto de handoff.
- El método canónico del handoff es la skill `checkpoint-card`.
- La ejecución queda fuera del core v1.
- El alcance del MVP es técnico, no generalista.
- El sistema es multi-proyecto con estado híbrido.
- Los comandos del MVP son solo: `create`, `derive`, `validate`, `review`, `checkpoint`, `wizard`.

## Decisiones pendientes

- shape extendido del contrato YAML por encima del mínimo obligatorio;
- límites entre configuración global y configuración por proyecto.

## Riesgos residuales

- pérdida semántica durante la derivación Markdown → YAML;
- proliferación de convenciones paralelas de carpetas si el override de rutas no se gobierna bien;
- presión futura para reintroducir ejecución dentro del core;
- expansión prematura a un dominio generalista antes de estabilizar el dominio técnico.
