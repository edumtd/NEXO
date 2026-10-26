@AGENTS.md

# NEXO

App Expo (Android, iOS y web) que conecta a estudiantes universitarios activos y egresados, de cualquier institución, con pequeños negocios. Tiene dos flujos: **vacantes** de medio tiempo (el negocio publica y el estudiante se postula) y **Talento** (el estudiante publica un servicio y el negocio envía una solicitud). Toda la UI y los textos van en español.

Estado: conectado a Supabase (ver `docs/SUPABASE.md`, etapas 1–4 listas). Cuentas, perfiles, vacantes, postulaciones, disponibilidad, Talento (servicios, solicitudes, seguimiento), notificaciones, vacantes guardadas, entrevistas y reportes se leen y escriben en Supabase. Lo único local es el recordatorio de fin de periodo. No hay datos semilla: las tablas empiezan **vacías**. `src/data/mock.ts` ya no se usa.

## Comandos

```bash
npx expo start                 # Expo Go (QR) — Android/iOS
npx expo start --web           # navegador
npm run typecheck              # = tsc --noEmit; debe quedar sin errores
npx expo-doctor
npx expo export --platform web # build web en dist/ (ignorado por git)
```

ESLint no está configurado: `npx expo lint`, que pide AGENTS.md, todavía no aplica (por confirmar si se agrega).

Ya no hay cuentas demo: se inicia sesión con cuentas reales de Supabase (requiere `.env`). El perfil se crea solo al registrarse (trigger `handle_new_user`, que lee `role`, `full_name` y `academic_status` de los metadatos del signUp).

Validar el SQL en local antes de ejecutarlo en Supabase: `powershell -ExecutionPolicy Bypass -File supabaselocalprobar-esquema.ps1` (usa PostgreSQL 18 local y simula auth/roles con `supabase/local/supabase-shim.sql`).

## Arquitectura

- **Estado:** `src/store/AppStore.tsx` guarda en memoria lo que el usuario puede ver en Supabase (`fetchSnapshot`).
  - Cada acción migrada usa `mutate()`: escribe en Supabase y luego recarga todo (`refresh`). Devuelve `{ error? }` y, si falla, el error aparece en el aviso global (`ErrorBanner`). Las pantallas que navegan al guardar deben hacerlo solo si no hubo error.
  - Las notificaciones las crean **triggers del servidor**; el store ya no las fabrica (salvo el recordatorio local de periodo).
  - Al negocio, la compatibilidad y el correo de estudiantes le llegan ya calculados por funciones del servidor (`business_application_details`, `business_service_request_details`, `visible_public_students`); nunca recibe bloques de disponibilidad.
  - Los cambios de SQL para proyectos existentes van en `supabase/migraciones/NNN_*.sql` y también al final de `schema.sql`.
- **Hooks por rol:** existen por privacidad. Las pantallas los usan en lugar de leer `useApp()` directamente.
  - Estudiante: `useCurrentStudent` (incluye `savedVacancyIds`), `useStudentVacancies` (cada item trae `exceedsLimit`, `saved` y `available`), `useSavedVacancies`, `useStudentWeek` (carga semanal), `useMyServiceOffers`, `useStudentServiceRequests`.
  - Ambos hooks `useCurrent*` exponen `interviews` (propuestas de entrevista) filtradas a lo propio.
  - Negocio: `useCurrentBusiness`, `useBusinessApplicants`, `useMarketplaceOffers`, `useBusinessServiceRequests`.
  - El negocio solo recibe `PublicStudent` (sin correo ni disponibilidad), mediante `toPublicStudent` en `src/hooks/useServiceOffers.ts`.
- **Compatibilidad** (`src/lib/compatibility.ts`, sin IA):
  - `evaluateCompatibility` fusiona bloques contiguos y mide qué parte del turno cubre cada día.
  - Resultado: `compatible` (turno completo todos los días), `parcial` o `no_compatible`.
  - Las horas se guardan en **minutos desde 00:00** y los días como `DayIndex` (0 = lunes).
  - Carga semanal: `studentCommitments` (vacantes aceptadas y servicios presenciales activos), `committedWeeklyHours` y `exceedsWeeklyLimit`. Superar el límite es un aviso aparte (`LimitBadge`); no cambia las 3 etiquetas de compatibilidad.
- **Validación:** todos los formularios usan esquemas Zod en `src/lib/schemas.ts`.
  - `findDiscriminatoryTerm` bloquea requisitos y textos discriminatorios.
  - `toLines` convierte texto multilínea en listas.
- **Navegación:** `STUDENT_LINKS` y `BUSINESS_LINKS` en `src/theme/navigation.ts` son la fuente única.
  - Los dos `_layout.tsx` generan las pestañas a partir de esas listas.
  - En web con 768px o más, `useIsWideWeb()` activa `tabBarPosition: "left"` y el layout dibuja `<SideNav />` en lugar de la barra inferior.
  - `inTabBar: false` deja una ruta solo en la barra lateral. `*_HIDDEN_ROUTES` son rutas de detalle que no aparecen en ninguna barra.
  - Para ocultar una pestaña usa `HIDDEN_TAB_OPTIONS`, **nunca** `href: null`: desde Expo Router 58, `href: null` marca la pantalla como oculta y el router redirige a la primera pestaña al abrirla.
- **Supabase:**
  - Recuperar contraseña: `/recuperar` envía el enlace (`requestPasswordReset`) y `/restablecer` lo recibe (`startPasswordRecovery` lee los tokens del fragmento de la URL; en web los lee Supabase con `detectSessionInUrl`) y guarda la nueva con `updatePassword`. Requiere las Redirect URLs de `docs/SUPABASE.md`.
  - `src/lib/supabase.ts` crea el cliente solo si existen `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`). Nunca uses la clave service_role en la app.
  - Todo el mapeo filas ↔ tipos (snake_case ↔ camelCase) y los mensajes de error de Auth en español están en `src/lib/db.ts`. Las acciones migradas devuelven `{ error?: string }`: las pantallas deben mostrar ese error.
  - `authReady` (en `useApp()`) es false mientras se restaura la sesión; los layouts muestran LoadingState hasta entonces.
  - `supabase/schema.sql` tiene tablas, RLS y funciones `security definer` que calculan la compatibilidad y exponen el correo sin dar acceso a los bloques.
  - Para cambios de esquema, **agrega al final**; no reescribas lo existente.

## Panel de administración

- Rutas en `src/app/admin/` (solo web ≥768px; en pantallas angostas muestra "Abre el panel desde una computadora"). Navegación con `ADMIN_LINKS` y `<SideNav />`; nunca en `STUDENT_LINKS` ni `BUSINESS_LINKS`.
- El administrador no es un `user_role`: sale de la tabla `admins` (`is_admin()`), que solo se llena desde el SQL Editor (`docs/SUPABASE.md`). En la app la sesión queda con `role: "admin"` (`SessionRole`); `homeFor()` decide la pantalla de inicio de cada rol.
- Todo lo de administración pasa por RPC `security definer` que comprueban `is_admin()` (`admin_reports`, `admin_action_log`, `admin_update_report`, `admin_set_vacancy_status`, `admin_pause_offer`, `admin_revoke_verification`), expuestas con `useAdmin()` y las acciones `admin*` del store. Cada acción queda en `admin_actions` y notifica al afectado.
- El reportante solo puede leer columnas públicas de su reporte; la nota interna (`admin_note`) nunca le llega.

## Mapa

- `@/components/BusinessMap` tiene dos implementaciones que Metro elige por plataforma: `BusinessMap.native.tsx` (react-native-maps: Google Maps en Android, Apple Maps en iOS) y `BusinessMap.web.tsx` (Google Maps JS con `@vis.gl/react-google-maps`). `BusinessMap.tsx` solo existe para los tipos; las props compartidas están en `BusinessMap.types.ts`.
- Claves en `.env` (ver `.env.example`), nunca en el código: `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` (web; sin ella se muestra "Mapa no disponible") y `GOOGLE_MAPS_ANDROID_KEY` (builds propios de Android, vía `app.config.ts`). En Expo Go no hacen falta.
- La ubicación del estudiante se pide con `useCurrentLocation` ("Cerca de mí" en `VacancyMap` y el orden "Más cercanas" en Buscar vacantes) y solo vive en el estado local de ese componente; nunca va al store, al almacenamiento ni a Supabase.
- Filtros, búsqueda y orden de Buscar vacantes y Talento se recuerdan por usuario con `usePersistentState` (AsyncStorage). Ahí solo van preferencias: nunca la ubicación ni datos personales. El orden "Más cercanas" no se guarda. Distancias en línea recta (`src/lib/geo.ts`); "Cómo llegar" abre la app de mapas externa. NEXO no calcula rutas.

## Convenciones

- Estilos solo con NativeWind (`className`). Tokens en `tailwind.config.js`: `navy`, `turquoise`, `coral`, `surface`, `ink`.
- Los íconos de Lucide y el SVG no aceptan `className`: usa `src/theme/colors.ts`.
- Reutiliza `@/components/ui` (Button, Input, Card, Badge, Chip, Avatar, EmptyState, LoadingState, ProgressRing) y los badges de `src/components/StatusBadges.tsx`.
- Cada pantalla usa `<Screen>` (`src/components/Screen.tsx`): cabecera navy y hoja redondeada. Acepta `back`, `right`, `header` y `footer`; el contenido ya va centrado a `max-w-[720px]`.
- Formularios: `useForm` + `zodResolver` + `Controller`. Montos como string en el formulario y `Number()` al guardar.
  - `Button.onPress` no recibe el evento de toque, así que acepta `handleSubmit(onSubmit)` directo. En `onSubmitEditing` u otros handlers de React Native, envuélvelo: `() => handleSubmit(onSubmit)()` (desde RN 0.88 los tipos del evento no son compatibles).
- Las pestañas quedan montadas. Los formularios de crear/editar (`?id=`) se reinician con `useFocusEffect` cambiando la `key` (ver `src/app/negocio/publicar-vacante.tsx`).
- Imports con alias `@/` → `src/`.
- Avatares con iniciales, nunca fotos.

## Reglas de producto (no negociables)

- Sin pagos, cobros a estudiantes, contratos ni chat.
- Sin calificaciones, reseñas ni reputación pública.
- No prometer contratación.
- No pedir ni guardar kardex, calificaciones, horario académico completo, edad, género, fotografía ni origen.
- Sin criterios discriminatorios. Aplica `findDiscriminatoryTerm` a todo texto libre nuevo que publique un negocio o un estudiante.
- No mencionar instituciones reales ni una sola universidad. Los datos demo son ficticios.
- Los bloques de disponibilidad **nunca** se muestran al negocio; solo la etiqueta de compatibilidad. No muestres una vista previa de compatibilidad antes de enviar una solicitud: permitiría adivinar la disponibilidad.
- El correo del estudiante solo se muestra al negocio en vacantes con estado `entrevista` o `aceptada`, y en Talento desde `aceptada` (`SERVICE_CONTACT_VISIBLE`).
- La tarifa de Talento es solo de referencia; el pago se acuerda fuera de NEXO y la UI debe decirlo.

## Advertencias conocidas

- **OneDrive:** Metro a veces no detecta cambios en archivos. Si un cambio no aparece, reinicia `npx expo start`.
- Si cambias `tailwind.config.js`, arranca con `npx expo start --clear`. `darkMode: "class"` es obligatorio; sin él NativeWind lanza un error en web.
- No pases a `Card` clases del mismo tipo que se contradigan (por ejemplo `bg-white` y `bg-turquoise-50`): gana el orden del CSS, no el de las clases. Usa un `View` con clases explícitas.
- En web, un `Card` con `onPress` que contiene un `Button` anida `<button>` dentro de `<button>` y causa un error de hidratación. Usa un `Pressable` aparte como enlace.
- La barra inferior necesita altura explícita (`useTabBarOptions`); sin ella las etiquetas se recortan en web.
- `npx expo-doctor` puede fallar solo por versiones de parche nuevas de Expo. No es un error del código, y actualizarlas requiere aprobación.
- Los botones dentro de tarjetas presionables van como **hermanos** posicionados encima (ver el botón de guardar en `VacancyCard`), nunca como hijos.
- Al renderizar condicionalmente con un número (`arr.length && …`) usa un ternario: en React Native un `0` suelto rompe el render.

## Agregar una pantalla

1. Crea el archivo en `src/app/estudiante/` o `src/app/negocio/` y envuélvelo en `<Screen>`.
2. Si debe aparecer en la navegación, agrégala a `STUDENT_LINKS` o `BUSINESS_LINKS` en `src/theme/navigation.ts` (`inTabBar` según el caso). Si es de detalle, agrégala a `*_HIDDEN_ROUTES`. No edites los `_layout.tsx`.
3. Los datos nuevos van como tipo en `src/types/index.ts`, datos demo en `src/data/mock.ts` y acción async con verificación de rol en `AppStore.tsx`. Exponlos por un hook de rol, no con `useApp()` en la pantalla.
4. Para formularios, agrega el esquema a `src/lib/schemas.ts` y las etiquetas en español a `src/lib/constants.ts`.
5. Corre `npm run typecheck` y revisa la pantalla en web a 390px y a 1280px.
