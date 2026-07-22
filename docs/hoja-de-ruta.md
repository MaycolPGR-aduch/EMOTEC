# EMOTEC — Plan de construcción del MVP

> Versión 2.0 · Julio 2026
> Reemplaza a la v1.0, que asumía un stack con panel web separado y coordinación con el
> equipo técnico de la universidad. Este proyecto es interno y va desligado de esa área.

---

## Contexto real

| | |
|---|---|
| Equipo | 1 persona, tiempo parcial (~10–12 h/semana), primera vez en React Native |
| Plataforma | **Solo Android.** iOS no se contempla por ahora |
| Stack | Expo SDK 54 + Expo Router + Supabase |
| Entorno | Expo Go (sin Android Studio, sin compilaciones en la nube) |
| Plazo | Sin fecha fija; prima la solidez |

**Estimación honesta: 4 a 6 meses** hasta un MVP completo y probado. Las semanas de cada etapa
son referenciales — sirven para detectar desvíos, no como compromiso.

---

## Arquitectura

Dos piezas. Nada más.

```
App Expo (Android)  ──►  Supabase
  - Pantallas               - PostgreSQL (datos)
  - Estado                  - Auth (correo + contraseña)
  - Lógica de UI            - RLS (permisos)
                            - Edge Functions (reglas y reporte semanal)
```

No hay servidor propio. La app es solo cliente, y **RLS es la frontera de permisos**: quién
puede leer qué se decide dentro de PostgreSQL, no en el código de la app. Esto es
deliberado — el código de la app corre en el teléfono del usuario y no es confiable.

**Lo que vive en Edge Functions** (y no en la app): el cálculo de indicadores, la generación
del reporte semanal y la evaluación de reglas de alerta. Motivo: son decisiones que no pueden
depender de un cliente que el usuario controla.

---

## Alcance: las 10 funcionalidades del MVP

Tomadas literalmente de la sección 13 de la propuesta, más una de la sección 9.

| # | Funcionalidad | Origen |
|---|---|---|
| 1 | Registro e inicio de sesión | §13 |
| 2 | Consentimiento informado | §13 |
| 3 | Check-in diario | §13 |
| 4 | Termómetro emocional | §13 |
| 5 | Rueda de emociones | §13 |
| 6 | Respiración guiada | §13 |
| 7 | Puntos y racha | §13 |
| 8 | Reporte semanal | §13 |
| 9 | Panel simple del tutor | §13 |
| 10 | Alertas por reglas | §13 |
| 11 | Pantalla de recursos de ayuda | §9 (alerta crítica) |

**Fuera del MVP, confirmado:** notificaciones push, chat generativo, interpretación de
dibujos, diagnóstico automático, iOS, panel web, Python/ML.

---

## Etapas

### E0 · Conexión con Supabase — ✅ COMPLETO

- ✅ Proyecto en Supabase (São Paulo), migraciones aplicadas
- ✅ Cliente de Supabase con sesión persistente (`AsyncStorage`)
- ✅ `profiles` con rol; el trigger fuerza `estudiante` al registrarse
- ✅ Registro e inicio de sesión funcionando desde el teléfono

**Verificado:** cuenta creada en el dispositivo, perfil con `role=estudiante` (el trigger
funciona y la escalada de privilegios está cerrada). Sesión persiste al reabrir la app.

---

### E1 · Modelo de datos y permisos — *2 a 3 semanas*

**Escrito.** 17 migraciones en `supabase/migrations/` (0001–0017). El esquema del MVP
resultó más grande de lo estimado —**20 tablas, no 8**— porque las políticas RLS son un
sistema acoplado y conviene diseñarlo completo una sola vez.

- 10 enums + 20 tablas: identidad, consentimiento, datos del estudiante, derivados
  (solo `service_role`), operación
- 4 funciones `SECURITY DEFINER` que resuelven la recursión de RLS en `profiles`
- RLS con **negación por defecto** en las 20 tablas (migración 0010 = punto de corte)
- Políticas de estudiante y de tutor/admin; el tutor no tiene ninguna vía al texto libre
- Puerta de consentimiento `AS RESTRICTIVE`; auditoría por triggers; RPC del panel del tutor
- Seed con recursos de ayuda reales (teléfonos oficiales del MINSA)
- Revisado por dos pases estáticos: sin bloqueantes, 12/12 vectores de fuga cerrados

**✅ Aplicado y verificado contra la base real:**
- Anónimo bloqueado en tablas sensibles (`checkins`, `checkin_notes`, `profiles`, `alerts`),
  permitido en `help_resources` (HTTP 401 vs 200 vía API REST).
- Estructura: 20/20 tablas con RLS, 0 sin RLS, 0 funciones definer sin `search_path`.
- Puerta de consentimiento: un usuario real sin consentir NO puede insertar en `checkins`
  (rechazado por la política `consent_gate_insert`).

*(Se aplicó por el SQL Editor porque la red bloquea el puerto 5432; reconciliar el historial
de la CLI con `supabase migration repair` cuando 5432 esté disponible.)*

---

### E2 · Consentimiento — *1 a 2 semanas*

- Pantalla de consentimiento con versionado y revocación
- Bloqueo duro: sin consentimiento aceptado, no se guarda **nada**

**Hecho cuando:** un usuario sin consentimiento no puede crear ni un solo registro, verificado
contra la base de datos, no contra la interfaz.

---

### E3 · Check-in diario — ✅ COMPLETO

- ✅ Check-in: ánimo, estrés, sueño, energía, carga académica, percepción social (escala 1-5)
- ✅ Texto breve opcional (guardado en `checkin_notes`, tabla aparte)
- ✅ Un check-in por día (unique en la base); opción de rehacer el de hoy
- ✅ Historial propio
- ⏳ Termómetro emocional (`emotional_entries`) — se agrupa con la rueda en E5,
  porque comparten tabla y patrón

**Verificado:** check-in real guardado desde el teléfono con valores propios (no de prueba),
visible en el historial y confirmado en la base.

---

### E4 · Indicadores, puntos y racha — ✅ COMPLETO

- ✅ Edge Function `recompute` desplegada: calcula promedios semanales, puntos y
  racha con `service_role`. Verifica el JWT y el consentimiento antes de escribir.
- ✅ Puntos vía `points_ledger` idempotente; estado reconstruido de la suma.
- ✅ Pantalla "Mi progreso" y tarjeta de puntos/racha en el home.
- ✅ El check-in dispara el recálculo al guardar.

**Verificado:** tras un check-in, la app muestra puntos (10) y racha (1) calculados por el
servidor. Un intento de falsificar `gamification_state` como `authenticated` da
`permission denied` → los puntos no son falsificables desde el cliente. La función rechaza
llamadas sin usuario (401).

---

### E5 · Actividades de bienestar — ✅ COMPLETO

- ✅ Termómetro emocional: intensidad 0-10 + contexto (`emotional_entries`, kind='termometro')
- ✅ Rueda de emociones: primaria, secundaria, intensidad, contexto (kind='rueda')
- ✅ Respiración guiada: círculo animado (inhala/retén/exhala/pausa) desde el
  catálogo, con valoración; registra `activity_sessions`
- ✅ Hub de actividades enlazado desde el home

**Verificado:** las tres pantallas funcionan en el dispositivo.

> **Decisión (jul 2026):** el catálogo se siente corto, pero se amplía **después de E7**,
> no antes. Motivo: lo que diferencia a EMOTEC de una app de bienestar genérica son las
> alertas y el panel del tutor (E7), no la cantidad de actividades. Además, ampliar después
> permite elegir actividades que alimenten indicadores ya en uso. Ver backlog al final.

---

### E6 · Reporte semanal — *2 semanas*

- Edge Function que genera el reporte desde plantillas
- Lenguaje no clínico, sin diagnósticos
- Versionado de plantillas y reglas

**Hecho cuando:** puedes señalar qué indicador originó cada frase del reporte (§13:
"explicable").

---

### E7 · Alertas, panel del tutor y recursos de ayuda — *3 a 4 semanas*

La etapa más delicada: es donde los datos de un estudiante se vuelven visibles para otra persona.

- Motor de reglas con los 4 niveles (informativa, preventiva, prioritaria, crítica)
- Cada alerta guarda la evidencia mínima y la versión de la regla
- Panel del tutor dentro de la misma app, según rol: solo asignados, solo resúmenes
- Registro de seguimiento y cierre
- Auditoría de accesos
- **Pantalla de recursos de ayuda con teléfonos reales** para el nivel crítico

**Hecho cuando:** cada alerta muestra la regla que la originó, y un tutor no puede acceder a
un estudiante no asignado.

---

### E8 · APK y pruebas — *1 a 2 semanas*

- Build de producción con EAS (aquí sí, una sola vez)
- Instalación en dispositivos reales
- Repaso de retención, exportación y revocación de consentimiento

---

## ⚠️ Pendientes obligatorios ANTES del piloto

Cosas que se relajaron para poder desarrollar y **deben revertirse** antes de que entren
estudiantes reales:

| Pendiente | Por qué importa |
|---|---|
| **Reactivar "Confirm email"** (Authentication → Providers → Email) | Se desactivó para crear cuentas de prueba. Apagada, cualquiera puede registrarse con el correo de otra persona — inaceptable con datos de salud |
| **Eliminar cuentas de prueba** (`maycoladmin@`, `+tutor@`, etc.) y sus datos | No deben convivir con datos reales |
| **Revisar el texto de consentimiento v1.0** con el responsable ético | Hoy es un borrador funcional escrito para poder desarrollar |
| **Revisar los umbrales de las reglas de alerta** con el responsable ético | Los sembrados son valores de arranque, no clínicamente validados |
| **Confirmar residencia de datos** (São Paulo) con protección de datos | Ley 29733: los datos de bienestar son sensibles |
| **Reconciliar historial de migraciones** (`supabase migration repair`) | Se aplicaron por el SQL Editor; la CLI no las tiene registradas |

---

## Decisiones ya tomadas

| Decisión | Valor | Por qué |
|---|---|---|
| Panel del tutor | Dentro de la misma app, por rol | Un panel web sería un segundo proyecto |
| Permisos | RLS como frontera principal | Sin API propia, la app no es confiable |
| Auth | Correo + contraseña | Sin SSO institucional (proyecto interno) |
| Vinculación tutor–estudiante | Asignación manual | El MVP no necesita gestión de inscripciones |
| Notificaciones | Fuera del MVP | No están en la §13; nos deja en Expo Go |
| SDK | 54 | Es lo que soporta el Expo Go del teléfono |

---

## Backlog priorizado — ampliación del catálogo de actividades

Aprobado por el usuario, **a construir después de E7**. Cada una debe alimentar un
indicador o ayudar al acompañamiento; si no, no entra.

| Actividad | Origen | Dato aprovechable | Costo |
|---|---|---|---|
| **Diario breve** | §7 de la propuesta | Temas y emociones declaradas. Texto **privado**: el tutor nunca lo ve (tabla aparte, como `checkin_notes`) | Medio: tabla + RLS + puerta de consentimiento |
| **Situaciones interactivas** | §7 de la propuesta | **Preferencias de afrontamiento**. La única actividad que enseña estrategias, no solo registra estado | Alto: catálogo de escenarios + opciones + respuestas |
| **Descarga mental académica** | Nueva | Conecta con el indicador de *carga académica* | Medio |
| **Más respiración + relajación/anclaje 5-4-3-2-1** | Nueva | Uso y valoración de actividad | **Bajo**: técnicas nuevas son filas en `activity_catalog` (cero código); relajación y anclaje reutilizan el motor de fases |

> **Nota técnica:** `activity_kind` es un enum (`respiracion`, `rueda`, `psicoeducativa`).
> Agregar un tipo nuevo exige su propia migración aislada (`ALTER TYPE ... ADD VALUE` no
> corre en la misma transacción) y **no se puede borrar un valor**. Elegir la taxonomía con
> cuidado antes de tocarlo.

---

## Regla para cuando aparezca una idea nueva

De la propia propuesta:

> ¿Ayuda al estudiante a comprender su bienestar, o ayuda a una persona autorizada a
> acompañarlo de forma más segura? Si no cumple ninguna de las dos, no pertenece al MVP.
