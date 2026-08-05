# EMOTEC — Contrato de datos de actividades

> **Fuente de verdad de las cadenas exactas.** Migraciones, catálogos de la base y pantallas
> deben coincidir **carácter a carácter**: una FK que falla lo hace en runtime, en el móvil, sin
> mensaje útil. Antes de escribir un `code` en cualquier sitio, se copia de aquí.
>
> Convención: `code` en minúsculas, sin tildes, con guion bajo. El `label` (con tildes y
> mayúsculas) es solo para mostrar y vive en la base, no en el código.

---

## 1. `activity_catalog` — 15 actividades

| # | `code` | `block` | `session_mode` | Pantalla |
|---|---|---|---|---|
| 1 | `respiracion_478` | regulacion | guiada | `respiracion.tsx` |
| 2 | `respiracion_cuadrada` | regulacion | guiada | `respiracion.tsx` |
| 3 | `respiracion_coherencia` | regulacion | guiada | `respiracion.tsx` |
| 4 | `respiracion_relajante` | regulacion | guiada | `respiracion.tsx` |
| 5 | `relajacion_muscular` | regulacion | guiada | `relajacion.tsx` |
| 6 | `anclaje_54321` | regulacion | guiada | `anclaje.tsx` |
| 7 | `termometro_emocional` | conciencia | evento | `termometro.tsx` ⟵ **nuevo** |
| 8 | `rueda_emociones` | conciencia | evento | `rueda.tsx` ⟵ **nuevo** |
| 9 | `situaciones_interactivas` | afrontamiento | guiada | `situaciones.tsx` ⟵ **nuevo** |
| 10 | `detective_emociones` | afrontamiento | guiada | `detective.tsx` ⟵ **nuevo** |
| 11 | `tres_cosas_buenas` | reflexion | evento | `gratitud.tsx` |
| 12 | `diario_breve` | reflexion | evento | `diario.tsx` |
| 13 | `evento_impacto` | reflexion | evento | `evento.tsx` |
| 14 | `caja_preocupaciones` | organizacion | diaria | `caja.tsx` ⟵ **nuevo** |
| 15 | `descarga_academica` | organizacion | diaria | `descarga.tsx` |

**5 códigos nuevos** a insertar en la migración 0030. Los otros 10 ya existen (0017, 0021,
0024, 0026, 0027) y solo reciben `block` y `session_mode`.

### `block` — 5 valores
`regulacion` · `conciencia` · `afrontamiento` · `reflexion` · `organizacion`

Agrupa por propósito, no por mecánica. Es lo que el tutor verá agregado (solo conteos).

### `session_mode` — 3 valores

| modo | cómo se escribe la sesión | por qué |
|---|---|---|
| `guiada` | INSERT `en_curso` al empezar + UPDATE al cerrar | el abandono es información real |
| `evento` | un solo INSERT `completada` | en un formulario, "abrió y no guardó" = curiosidad |
| `diaria` | un INSERT por estudiante/actividad/día | son gestores persistentes: 15 toques ≠ 15 sesiones |

### `professional_review_status` — 3 valores
`pendiente` · `revisada` · `aprobada` — del documento de catálogo §9.1. Todas arrancan en
`pendiente`; el responsable ético las aprueba antes del piloto.

---

## 2. `life_area_catalog` — 7 áreas

Unifica los dos vocabularios que hoy no cruzan: `emotional_entries.context_tag` (5 valores,
masculinos: `academico`…) y `event_entries.area` (7 valores, femeninos: `academica`…).

| `code` | `label` | Migración desde `context_tag` |
|---|---|---|
| `academica` | Académica | `academico` → `academica` |
| `social` | Social | igual |
| `familiar` | Familiar | igual |
| `personal` | Personal | — (no existía en context_tag) |
| `salud` | Salud | igual |
| `economia` | Economía | — (no existía en context_tag) |
| `otra` | Otra | `otro` → `otra` |

**Se adopta la forma femenina** (concuerda con "área"). La columna pasa a llamarse `life_area`
en ambas tablas, con FK al catálogo.

---

## 3. `emotion_catalog` — 8 primarias + 26 secundarias

Hoy la rueda guarda el **label** (`'Alegria'`) mientras el contexto guarda la **key**
(`'academico'`) — dos convenciones en la misma fila. Se normaliza todo a `code`.

`valence` habilita el indicador `emo_valence_dist`. Las secundarias heredan la valencia de su
primaria.

| `code` | `label` | `valence` | `parent_code` |
|---|---|---|---|
| `alegria` | Alegría | agradable | — |
| `entusiasmo` / `gratitud` / `orgullo` / `esperanza` | Entusiasmo / Gratitud / Orgullo / Esperanza | agradable | `alegria` |
| `tristeza` | Tristeza | desagradable | — |
| `desanimo` / `soledad` / `decepcion` / `nostalgia` | Desánimo / Soledad / Decepción / Nostalgia | desagradable | `tristeza` |
| `miedo` | Miedo | desagradable | — |
| `ansiedad` / `inseguridad` / `preocupacion` / `nerviosismo` | Ansiedad / Inseguridad / Preocupación / Nerviosismo | desagradable | `miedo` |
| `enojo` | Enojo | desagradable | — |
| `frustracion` / `irritacion` / `impotencia` / `fastidio` | Frustración / Irritación / Impotencia / Fastidio | desagradable | `enojo` |
| `calma` | Calma | agradable | — |
| `tranquilidad` / `alivio` / `serenidad` | Tranquilidad / Alivio / Serenidad | agradable | `calma` |
| `sorpresa` | Sorpresa | neutra | — |
| `asombro` / `confusion` / `desconcierto` | Asombro / Confusión / Desconcierto | neutra | `sorpresa` |
| `afecto` | Afecto | agradable | — |
| `carino` / `conexion` / `agradecimiento` | Cariño / Conexión / Agradecimiento | agradable | `afecto` |
| `verguenza` | Vergüenza | desagradable | — |
| `culpa` / `timidez` / `retraimiento` | Culpa / Timidez / Retraimiento | desagradable | `verguenza` |

`valence` — 3 valores: `agradable` · `desagradable` · `neutra`.

> **Nota de tono:** "agradable/desagradable" y no "positiva/negativa". Ninguna emoción es
> negativa; el enfado o el miedo son señales útiles. La app nunca muestra esta etiqueta al
> estudiante: es solo para agregar.

---

## 4. `coping_style_catalog` — 4 estilos

Ya se usan en el seed de `scenario_catalog` (migración 0022). Se les da tabla y FK.

| `code` | `label` |
|---|---|
| `accion` | Acción directa |
| `apoyo` | Buscar apoyo |
| `regulacion` | Regulación emocional |
| `pausa` | Pausa / esperar |

> **Privacidad:** la distribución de `coping_style` es un perfil de afrontamiento. Vive en
> `wellness_indicators.details` y **el tutor no la ve** — coherente con que
> `scenario_responses` no tenga policy de tutor (0022).

---

## 5. `activity_sessions.status` — 3 valores
`en_curso` · `completada` · `abandonada`

`duration_sec`: **segundos reales de una sesión guiada, o `NULL`** si la actividad no tiene
duración medible. **Nunca `0`** (hoy hay 3 semánticas conviviendo; se normaliza en 0028).

---

## 6. Frontera de privacidad (qué ve el tutor)

| Visible al tutor — columnas tipadas en `wellness_indicators` | Invisible — `details` jsonb |
|---|---|
| `activity_days`, `activity_adherence_pct` | `coping_dist` (perfil de afrontamiento) |
| `activity_completion_pct`, `activity_rating_avg` | `emo_valence_dist` |
| `emo_entries_count`, `emo_intensity_avg` | `life_area_dist` (dice *dónde* está el problema) |
| `block_regulacion_days` … `block_organizacion_days` (5) | `tareas`, `preocupaciones`, `pre_post`, `detective`, `evento` |

La frontera **ya existe y es barata de mantener**: el tutor no tiene policy sobre
`wellness_indicators` y solo accede por el RPC `tutor_student_summary`, que devuelve una lista
fija de columnas. Todo lo que esté en `details` es invisible por construcción, salvo que alguien
lo añada a mano a esa lista.
