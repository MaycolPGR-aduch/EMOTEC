# EMOTEC — Hoja de ruta de construcción

> Versión 1.0 · Julio 2026
> Reemplaza a la sección 14 de la *Propuesta EMOTEC*, que fue escrita asumiendo un equipo
> con roles diferenciados y el stack Flutter + FastAPI + Python. Este documento la adapta
> al equipo y al stack reales.

---

## Supuestos de esta ruta

| Supuesto | Valor |
|---|---|
| Equipo de desarrollo | 1 persona, tiempo parcial (~10–12 h/semana) |
| Stack | TypeScript en todo: Expo (móvil) + Next.js (panel y API) + PostgreSQL/Supabase |
| Contexto | Piloto institucional real, con estudiantes reales |
| Plazo | Sin fecha fija; prima la solidez sobre la velocidad |
| Población | Estudiantes universitarios mayores de 18 años |

**Nota honesta sobre los tiempos.** La propuesta original estimaba 15–22 semanas hasta el
piloto. Ese cálculo suponía varias personas trabajando en paralelo. Un desarrollador solo a
tiempo parcial avanza aproximadamente entre un medio y un tercio de esa velocidad, así que la
estimación realista está entre **7 y 9 meses**. Las semanas indicadas abajo son referenciales
y sirven para ordenar el trabajo y detectar desvíos, no como compromiso de entrega.

---

## El principio que ordena todo

**Dos carriles que corren en paralelo, no en secuencia.**

El carril institucional depende de respuestas de otras personas y esas respuestas tardan
semanas. El carril técnico depende solo de ti. Si los pones en serie, esperas sin construir;
si los pones en paralelo, las respuestas llegan cuando las necesitas.

**Dentro del carril técnico: rebanada vertical antes que capas horizontales.**

La tentación natural es construir por capas: primero toda la base de datos, luego toda la
API, luego toda la app. Es un error para un desarrollador solo, porque el sistema no funciona
hasta el final y no aprendes nada hasta que ya es caro cambiarlo. En su lugar, atraviesa el
sistema completo con la funcionalidad más delgada posible, y engórdala después.

---

## Carril A — Desbloqueo institucional

**Empieza hoy. No requiere código. Corre en paralelo con todo el carril B.**

Estas tres consultas tienen latencia de semanas y son las que pueden bloquear el piloto
cuando el software ya esté listo. Cuestan tres correos.

| # | Consulta | A quién | Por qué bloquea |
|---|---|---|---|
| A1 | ¿Podemos usar SSO institucional (`@uch.edu.pe`) para autenticar estudiantes? | Área de TI / Sistemas | Define el flujo de registro y resuelve la verificación de "es estudiante real" |
| A2 | ¿Quién es el profesional responsable del protocolo ético y de alertas? | Bienestar estudiantil / asesor | La propuesta lo exige como requisito crítico; sin él no hay piloto |
| A3 | ¿Es aceptable alojar datos sensibles fuera del país (São Paulo)? ¿Hay que registrar el banco de datos? | Responsable de protección de datos | Ley 29733; afecta al proveedor y al texto del consentimiento |

**Criterio de avance:** las tres respuestas por escrito antes del Hito 7. Si A1 llega tarde,
no importa: el Hito 2 usa autenticación por correo y el proveedor se cambia después sin
reescribir la app.

---

## Carril B — Construcción

### Hito 0 · Prueba de concepto del stack — *1 a 2 semanas*

Un pico técnico desechable para validar la decisión antes de escribirla en piedra.

- Monorepo (pnpm + Turborepo) con `apps/movil`, `apps/web`, `packages/shared`
- App Expo con una pantalla, Next.js con la API, Supabase conectado
- **Una** pantalla que escribe un dato y lo vuelve a leer

**Hecho cuando:** puedes escribir un número en el teléfono y verlo aparecer en la base de datos.
Nada más. Sin diseño, sin roles, sin validación.

**Por qué primero:** un ADR sobre un stack que nunca ejecutaste es una opinión. Después de este
hito es una decisión respaldada. Y si el stack falla, fallaste en dos semanas, no en tres meses.

---

### Hito 1 · ADR y cierre de decisiones — *1 semana*

Documento de decisión de arquitectura: stack elegido, alternativas descartadas y por qué.
La sección 16 de la propuesta exige aprobar "stack definitivo" antes de construir; esto lo
cumple, y ahora con evidencia del Hito 0.

**Hecho cuando:** tu asesor lo aprueba.

---

### Hito 2 · Modelo de datos y frontera de permisos — *2 a 3 semanas*

Solo las entidades que el MVP toca. Las 15 de la sección 11 son el destino, no el punto de
partida — modelar por adelantado lo que aún no usas garantiza modelarlo mal.

- Esquema Drizzle: `institutions`, `users`, `student_profiles`, `staff_profiles`, `consents`,
  `checkins`, `audit_logs`
- RLS activado con **negación por defecto** en todas las tablas (red de seguridad)
- Autorización en código, en un solo módulo
- Tests de permisos, incluido el que importa: *un tutor no puede leer a un estudiante no asignado*

**Hecho cuando:** los tests de permisos pasan y puedes explicar en una página quién ve qué.

---

### Hito 3 · Registro, consentimiento y primer check-in — *3 a 4 semanas*

Esto es, literalmente, el "resultado esperado del primer hito" de la propuesta.

- Registro e inicio de sesión
- Consentimiento informado con versionado y revocación
- Check-in diario que guarda respuestas estructuradas
- Historial propio visible para el estudiante

**Hecho cuando:** completas un check-in en menos de tres minutos, y sin consentimiento
aceptado el sistema no guarda absolutamente nada.

---

### Hito 4 · Indicadores y reporte semanal — *3 a 4 semanas*

- Motor de reglas en TypeScript: promedios, tendencias, comparación con el patrón personal
- Reporte semanal con lenguaje no clínico, generado desde plantillas
- Versionado de reglas y plantillas

**Hecho cuando:** los mismos datos producen siempre el mismo reporte (reproducible), y puedes
señalar qué indicador originó cada frase (explicable).

---

### Hito 5 · Actividades y gamificación — *3 a 4 semanas*

- Termómetro emocional, rueda de emociones, respiración guiada
- Puntos y rachas orientados a constancia, no a competencia

**Hecho cuando:** las tres actividades funcionan y alimentan los indicadores del Hito 4.

---

### Hito 6 · Panel del tutor y motor de alertas — *4 a 5 semanas*

El hito más delicado del proyecto: es donde los datos de un estudiante se vuelven visibles
para otra persona.

- Alertas por reglas con los cuatro niveles (informativa, preventiva, prioritaria, crítica)
- Evidencia mínima registrada + versión de la regla que la disparó
- Panel del tutor: solo estudiantes asignados, solo resúmenes
- Registro de seguimiento y cierre de alertas
- Auditoría de todo acceso a datos sensibles

**Hecho cuando:** cada alerta muestra la regla que la originó, y el protocolo ético (A2) está
aprobado por escrito. **No avances sin A2.**

---

### Hito 7 · Notificaciones, endurecimiento y calidad — *3 a 4 semanas*

- Expo Push para recordatorios y avisos
- Revisión de seguridad, retención y eliminación de datos
- Exportación y gestión del propio consentimiento

**Hecho cuando:** las tres respuestas del carril A están cerradas y aplicadas.

---

### Hito 8 · Piloto controlado — *4 a 6 semanas*

Grupo reducido, métricas de la sección 15, entrevistas y correcciones.

---

### Hito 9 · IA avanzada — *posterior al piloto*

Servicio Python separado (NLP validado, detección de anomalías), consumido por la API.
Solo si el piloto demuestra que las reglas se quedan cortas.

---

## Qué NO está en esta ruta, a propósito

| Excluido | Motivo |
|---|---|
| Python y modelos de ML | El MVP no los necesita; llegan en el Hito 9 con una razón concreta |
| iOS | Decisión pendiente. Android primero ahorra 99 USD/año y bastante fricción; Expo permite agregarlo después sin reescribir |
| Las 15 entidades del modelo de datos | Se agregan cuando una funcionalidad las necesite |
| Microservicios | La propuesta ya manda empezar con monolito modular |
| Chat generativo, interpretación de dibujos, diagnóstico | Excluidos por alcance y ética, no por tiempo |

---

## Regla para cuando aparezca una idea nueva

La propia propuesta ya la definió, y conviene tenerla a mano:

> ¿Ayuda al estudiante a comprender su bienestar, o ayuda a una persona autorizada a
> acompañarlo de forma más segura? Si no cumple ninguna de las dos, no pertenece al MVP.
