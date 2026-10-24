# NEXO · Plan de la siguiente fase

Estado: **aprobado**. Fases A, B y C implementadas (2026-10-24); fase D pendiente (requiere Supabase conectado).
Todas las funciones respetan las reglas de `CLAUDE.md`: sin pagos, sin chat, sin reputación pública, sin criterios discriminatorios y sin exponer la disponibilidad del estudiante.

---

## 1. Mapa de negocios (estudiante)

**Dónde:** selector **"Lista | Mapa"** en *Buscar vacantes*. El mapa usa los mismos filtros que la lista (zona, horario, tipo, sueldo, solo compatibles).

**Qué ve el estudiante**
- Un marcador por negocio con vacantes activas, con color según su mejor compatibilidad: turquesa (compatible), ámbar (parcial) o gris (no compatible).
- Al tocar un marcador se abre una tarjeta inferior con nombre, giro, insignia de verificación, dirección, descripción y sus vacantes (sueldo, horario y compatibilidad). Cada vacante abre su detalle actual.
- **"Cerca de mí" (opcional):** con permiso de ubicación, el mapa se centra en el estudiante y muestra la distancia en línea recta ("a 1.2 km"). **La ubicación no se guarda ni se comparte.**
- **"Cómo llegar":** abre Google Maps o Apple Maps con la dirección. NEXO no calcula rutas.

**Ubicación del negocio:** en *Perfil del negocio*, un mapa donde el negocio coloca su pin. Se guardan `latitude` y `longitude`. Los negocios sin pin no aparecen en el mapa, pero sí en la lista.

**Tecnología (verificado en la documentación de Expo SDK 57)**
- Android e iOS: `react-native-maps`. Funciona en Expo Go para probar. Usa Google Maps en Android y Apple Maps en iOS; Google Maps en iOS requiere API key y recompilar la app.
- Web: Google Maps JavaScript API (`@vis.gl/react-google-maps`), en un archivo `.web.tsx` separado, porque `react-native-maps` no soporta web.
- Ubicación del estudiante: `expo-location`.
- Se descarta `expo-maps`: está en alfa, no funciona en Expo Go y no tiene web.

**Requisitos externos (los hace el dueño del proyecto)**
- Proyecto en Google Cloud con facturación activa.
- Una API key por plataforma, restringida: Android a su paquete, iOS a su bundle y web a su dominio.
- Las claves van en `.env` y `app.json`, nunca en el código.

---

## 2. Límite de carga semanal

- El estudiante define en su perfil las horas máximas por semana que puede trabajar.
- Al evaluar una vacante se suman las horas del turno nuevo y las que ya tiene comprometidas (vacantes aceptadas y servicios presenciales activos).
- Si se pasa del límite, aparece un aviso **"Supera tu límite semanal (X h)"** junto a la etiqueta de compatibilidad. La etiqueta en sí no cambia.
- Filtro nuevo en *Buscar*: "Dentro de mi límite".

## 3. Recordatorio de periodo académico

- Al registrar su disponibilidad, el estudiante indica el periodo y su **fecha de fin**.
- Cuando el periodo termina, recibe una notificación y ve un aviso en *Inicio* ("Actualiza tu disponibilidad para el nuevo periodo"), con enlace a *Disponibilidad*.
- Mientras no la actualice, sus vacantes muestran "Disponibilidad desactualizada".

## 4. Verificación básica de negocios

- Desde *Perfil del negocio* puede **solicitar verificación** subiendo un comprobante de domicilio del negocio.
- Estados: `sin_solicitar` → `en_revision` → `verificado` | `rechazado` (con motivo).
- El comprobante va a un almacenamiento **privado** al que solo accede administración, y se borra al terminar la revisión.
- Solo administración aprueba o rechaza. Mientras no exista un panel de administración, se hace desde Supabase.
- Requiere `expo-document-picker` y Supabase Storage.

## 5. "Mi semana" (estudiante)

- Calendario de lunes a domingo con tres capas:
  - Bloques libres (turquesa).
  - Turnos de vacantes aceptadas (navy).
  - Servicios presenciales activos de Talento (coral).
- Resumen arriba: horas libres, horas comprometidas y horas restantes según su límite semanal.
- Es privado: solo lo ve el estudiante.

## 6. Alertas de vacantes compatibles

- Cuando un negocio publica una vacante, se notifica a los estudiantes para quienes es **100% compatible** y que tengan activadas las alertas.
- Interruptor en el perfil: "Avisarme de vacantes compatibles", desactivado por defecto.
- La notificación lleva al detalle de la vacante.

## 7. Vacantes guardadas

- Botón de guardar en la tarjeta y en el detalle de la vacante.
- Lista "Guardadas" en *Buscar*.
- Si una vacante guardada se pausa o se cierra, se marca como no disponible.
- Es privado: el negocio no sabe quién la guardó.

## 8. Agendar entrevista sin chat

- Cuando el negocio pasa una postulación a **Entrevista**, propone de 2 a 3 horarios (fecha, hora y lugar o "en línea").
- El estudiante elige uno o responde "Ninguno me funciona", lo que pide al negocio nuevos horarios.
- Cada opción muestra al estudiante si choca con su disponibilidad. Él ve sus propios datos; el negocio no los ve.
- Ambos reciben notificación con la entrevista confirmada. No hay mensajes libres.

## 9. Reportar una vacante o negocio

- Botón "Reportar" en el detalle de la vacante y del negocio.
- Motivos: información falsa, criterio discriminatorio, cobro o solicitud indebida, otro. Incluye una descripción breve.
- **Solo administración ve los reportes.** No hay contadores públicos ni efecto automático en la reputación.
- El usuario recibe la confirmación "Reporte recibido".

---

## Orden sugerido

| Fase | Funciones | Requiere |
|---|---|---|
| A ✅ | 2 límite semanal · 5 Mi semana · 3 recordatorio · 7 guardadas · 6 alertas | Solo código; sin dependencias nuevas |
| B ✅ | 8 entrevistas · 9 reportes | Solo código; la revisión de reportes la hace administración |
| C ✅ | 1 mapa + pin del negocio | `react-native-maps`, `expo-location`, `@vis.gl/react-google-maps` y API keys de Google |
| D | 4 verificación con comprobante | `expo-document-picker` y Supabase Storage (con Supabase conectado) |

## Fuera de este plan (pendientes previos)

- Conectar Supabase: cuentas reales y datos persistentes.
- Guardar los datos demo en el dispositivo, contadores en las barras y retirar postulación (prompt 3 anterior).
- Notificaciones push (requieren recompilar la app).
