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

### E0 · Conexión con Supabase — *1 a 2 semanas*

- Proyecto en Supabase (región y credenciales)
- Cliente de Supabase en la app, sesión persistente
- Tabla `profiles` con rol (`estudiante` / `tutor` / `admin`)
- Registro e inicio de sesión funcionando

**Hecho cuando:** te registras desde el teléfono, cierras la app, la reabres y sigues dentro.

*Esta etapa es la rebanada vertical: atraviesa app → red → auth → base de datos. Si algo del
stack está mal elegido, se descubre aquí y no en el mes cuatro.*

---

### E1 · Modelo de datos y permisos — *2 semanas*

- Esquema: `profiles`, `consents`, `checkins`, `emotional_entries`, `activity_sessions`,
  `alerts`, `followups`, `audit_logs`
- RLS con **negación por defecto** en todas las tablas
- Políticas: el estudiante solo ve lo suyo; el tutor solo ve a sus asignados
- Pruebas de permisos

**Hecho cuando:** con el usuario A intentas leer datos del usuario B y la base te lo niega.

*Solo se modelan las entidades que el MVP toca. Las 15 de la §11 son el destino, no el punto
de partida.*

---

### E2 · Consentimiento — *1 a 2 semanas*

- Pantalla de consentimiento con versionado y revocación
- Bloqueo duro: sin consentimiento aceptado, no se guarda **nada**

**Hecho cuando:** un usuario sin consentimiento no puede crear ni un solo registro, verificado
contra la base de datos, no contra la interfaz.

---

### E3 · Check-in diario y termómetro — *2 a 3 semanas*

- Check-in: ánimo, estrés, sueño, energía, carga académica, percepción social
- Termómetro emocional
- Texto breve opcional
- Historial propio

**Hecho cuando:** completas un check-in en menos de 3 minutos (criterio de la §13) y aparece
en el historial.

---

### E4 · Indicadores, puntos y racha — *2 semanas*

- Cálculo de indicadores diarios y semanales
- Puntos y racha orientados a constancia, no a competencia
- Gráfico de evolución personal

**Hecho cuando:** los mismos datos producen siempre los mismos indicadores (reproducible).

---

### E5 · Rueda de emociones y respiración — *2 semanas*

- Rueda de emociones: primaria, secundaria, intensidad, contexto
- Respiración guiada con animación

**Hecho cuando:** ambas registran su sesión y alimentan los indicadores de E4.

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

## Regla para cuando aparezca una idea nueva

De la propia propuesta:

> ¿Ayuda al estudiante a comprender su bienestar, o ayuda a una persona autorizada a
> acompañarlo de forma más segura? Si no cumple ninguna de las dos, no pertenece al MVP.
