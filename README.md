# NEXO

Plataforma que conecta a estudiantes universitarios activos y egresados —de cualquier carrera e institución— con pequeños negocios. Funciona en Android, iOS y web, y tiene dos flujos:

- **Vacantes de medio tiempo:** el negocio publica y el estudiante se postula.
- **Talento:** el estudiante publica un servicio (diseño, redes sociales, inventarios…) y el negocio le envía una solicitud.

Su diferenciador es la **compatibilidad real** entre los bloques libres del estudiante y el horario de cada vacante, calculada sin IA y sin exponer nunca la disponibilidad del estudiante al negocio.

> **Estado:** conectado a Supabase. Cuentas, perfiles, vacantes, postulaciones, disponibilidad, Talento, notificaciones, vacantes guardadas, entrevistas, reportes y panel de administración se leen y escriben en la base de datos. No hay datos semilla: las tablas empiezan vacías.

## Stack

Expo SDK 58 (React Native 0.88) · TypeScript · Expo Router · NativeWind 4 (Tailwind 3) · React Hook Form + Zod · Lucide · Supabase (Auth, Postgres con RLS, Storage, Vault, pg_net) · Brevo (correo de verificación) · react-native-maps y Google Maps JS · expo-location · expo-document-picker

## Funciones

### Estudiante
- Registro como estudiante activo o egresado; perfil con carrera, zona y habilidades.
- **Verificación opcional** con un código enviado al correo institucional; el negocio ve la insignia "Estudiante verificado" (NEXO no guarda ese correo).
- **Disponibilidad semanal** por bloques, periodo académico y fecha de fin (recordatorio para actualizarla).
- **Buscar vacantes** en lista o **mapa**: búsqueda sin acentos, filtros (zona, giro, horario, tipo de empleo, fecha de inicio, sueldo mínimo, solo compatibles, negocios verificados) y orden (recientes, mejor pagadas, más compatibles, más cercanas). Los filtros se recuerdan.
- **Límite de horas semanales** y vista **Mi semana** con sus compromisos.
- Postulación, seguimiento del estado y **entrevistas sin chat**: el negocio propone 2–3 horarios y el estudiante elige uno o pide otros.
- **Vacantes guardadas**, alertas de vacantes compatibles y **reportes** de vacantes o negocios.
- **Talento:** publicar servicios con tarifa de referencia, recibir solicitudes y llevar el seguimiento (aceptar, avances, cambio de fecha, entrega).

### Negocio
- Perfil con ubicación en el mapa; publicar, editar, pausar y cerrar vacantes.
- **Verificación básica** subiendo un comprobante de domicilio, revisado por administración.
- **Postulantes** ordenados por compatibilidad (calculada en el servidor) y propuesta de entrevistas.
- **Talento:** buscar servicios con filtros y orden por tarifa, enviar solicitudes y confirmar entregas.

### Para todos
- Notificaciones interactivas que llevan a la pantalla correspondiente.
- **Recuperar contraseña** por correo.
- En web con pantalla ancha, barra lateral en lugar de la barra inferior.

### Administración
- Bandeja de reportes con estado y nota interna, acciones de moderación (pausar o cerrar vacantes, pausar servicios, retirar verificación) y bitácora de acciones.
- Revisión de comprobantes de domicilio para verificar negocios.
- Funciona en computadora (barra lateral) y en celular (barra inferior).
- Los administradores no se crean desde la app: se dan de alta solo desde el SQL Editor de Supabase (ver [docs/SUPABASE.md](docs/SUPABASE.md)).

## Ejecutar localmente

Requisitos: Node 22.13+ (o 24.3+), un proyecto de Supabase y, opcionalmente, **Expo Go** en tu teléfono.

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` como `.env` y llena las variables (nunca subas `.env` a GitHub):
   - `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (obligatorias).
   - `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` y `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID` para el mapa en web (opcionales).
   - `GOOGLE_MAPS_ANDROID_KEY` solo para builds propios de Android.
3. Prepara la base de datos siguiendo [docs/SUPABASE.md](docs/SUPABASE.md).
4. Arranca la app:
   ```bash
   npx expo start          # escanea el QR con Expo Go (Android/iOS)
   npx expo start --web    # abre en el navegador
   ```

Otros comandos:

```bash
npm run typecheck                # verificación de TypeScript
npx expo-doctor                  # diagnóstico de dependencias y configuración
npx expo export --platform web   # build web en dist/
```

Si cambias `tailwind.config.js`, reinicia con caché limpia: `npx expo start --clear`.

> **Nota sobre OneDrive:** si la carpeta está sincronizada con OneDrive, Metro a veces no detecta cambios. Si no ves un cambio, reinicia `npx expo start`.

## Base de datos

- [`supabase/schema.sql`](supabase/schema.sql) crea todo desde cero: tablas, políticas RLS, funciones y triggers. En un proyecto nuevo basta con ejecutarlo en el SQL Editor.
- Si tu proyecto ya tenía una versión anterior del esquema, ejecuta en orden las migraciones de [`supabase/migraciones/`](supabase/migraciones/):

| Migración | Qué agrega |
|---|---|
| `001_etapas_2_3.sql` | Funciones del servidor para compatibilidad y contacto sin exponer la disponibilidad |
| `002_perfil_estudiante_privado.sql` | El negocio solo recibe el perfil público del estudiante |
| `003_etapa_4.sql` | Evita el aviso duplicado al proponer una entrevista |
| `004_panel_admin.sql` | Panel de administración: administradores, estado de reportes y bitácora |
| `005_verificacion.sql` | Verificación de negocios y de estudiantes |

La guía completa (crear el proyecto, autenticación, recuperar contraseña, administradores) está en [docs/SUPABASE.md](docs/SUPABASE.md).

## Estructura

```
src/
  app/                       Rutas (Expo Router)
    index.tsx                Bienvenida
    login.tsx, registro.tsx, recuperar.tsx, restablecer.tsx
    estudiante/              Inicio, vacantes, postulaciones, servicios, disponibilidad,
                             mi semana, notificaciones, perfil y detalles
    negocio/                 Panel, vacantes, talento, postulantes, notificaciones, perfil
    admin/                   Reportes, verificaciones y bitácora (web y celular)
  components/
    ui/                      Button, Input, Card, Badge, Chip, Avatar, EmptyState, LoadingState, ProgressRing
    Screen.tsx               Cabecera azul marino + hoja redondeada
    SideNav.tsx              Barra lateral en web ancha
    BusinessMap.*            Mapa nativo (react-native-maps) y web (Google Maps JS)
    VacancyCard, ServiceCard, StatusBadges, Interview, ReportForm, ErrorBanner, …
  hooks/                     Hooks por rol (privacidad), ubicación y filtros guardados
  lib/
    compatibility.ts         Reglas de compatibilidad y carga semanal (sin IA)
    schemas.ts               Validación Zod, incluye bloqueo de criterios discriminatorios
    db.ts                    Mapeo filas de Supabase ↔ tipos de la app y mensajes de error
    supabase.ts              Cliente de Supabase
  store/AppStore.tsx         Estado de la app: lee de Supabase y expone acciones async
  theme/navigation.ts        Fuente única de la navegación de cada rol
supabase/
  schema.sql                 Esquema completo
  migraciones/               Cambios para proyectos existentes
docs/
  SUPABASE.md                Guía de configuración de Supabase
  PLAN-SIGUIENTE-FASE.md     Plan de funciones por fases
```

## Reglas de compatibilidad

Para cada día laboral de la vacante se calcula qué proporción del turno cubren los bloques del estudiante (los bloques contiguos se fusionan):

- **Compatible:** cubre el turno completo todos los días.
- **Parcialmente compatible:** cubre al menos una parte.
- **No compatible:** sin coincidencias.

Superar el límite de horas semanales del estudiante se muestra como un aviso aparte; no cambia la etiqueta.

## Privacidad y reglas del producto

- No se solicita kardex, calificaciones, fotografía, edad, género, origen ni horario académico completo.
- Los bloques de disponibilidad solo los ve su dueño. Al negocio le llega la etiqueta de compatibilidad, calculada en el servidor.
- El correo del estudiante solo se comparte con el negocio cuando la postulación pasa a entrevista o es aceptada, o cuando el estudiante acepta una solicitud de Talento.
- La ubicación del estudiante solo se usa en el momento para el mapa y el orden por cercanía; nunca se guarda ni se envía.
- Los textos de vacantes y servicios se validan contra términos discriminatorios.
- Sin pagos, cobros a estudiantes, contratos, chat, calificaciones ni reputación pública. La tarifa de Talento es solo de referencia: el pago se acuerda fuera de NEXO.
- Los datos de demostración son ficticios y no mencionan instituciones reales.

## Avances

| Etapa | Contenido | Estado |
|---|---|---|
| Prototipo | Flujos de estudiante y negocio, compatibilidad y validaciones | ✅ |
| Talento | Servicios de estudiantes, solicitudes y seguimiento | ✅ |
| Navegación web | Barra lateral en pantallas anchas | ✅ |
| Notificaciones | Avisos interactivos para estudiantes y negocios | ✅ |
| Fase A | Límite semanal, Mi semana, periodo académico, guardadas y alertas | ✅ |
| Fase B | Entrevistas sin chat y reportes | ✅ |
| Fase C | Mapa de negocios y ubicación del negocio | ✅ |
| Supabase | Cuentas, datos y notificaciones en la base (etapas 1–4) | ✅ |
| Cuentas | Recuperar contraseña | ✅ |
| Búsqueda | Orden, filtros nuevos y búsqueda sin acentos | ✅ |
| Administración | Panel de reportes, verificaciones, moderación y bitácora (web y celular) | ✅ |
| Fase D | Verificación de negocios (comprobante) y estudiantes (correo institucional) | ✅ |

### Próximos pasos
- Cierre automático de vacantes cubiertas o inactivas.
- Notificaciones en tiempo real y notificaciones push.
- Aviso de privacidad, eliminación de cuenta y servicio de correo propio antes de publicar.
