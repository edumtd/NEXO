@AGENTS.md

# NEXO

App Expo (Android, iOS y web) que conecta a estudiantes universitarios activos y egresados, de cualquier institución, con pequeños negocios. Tiene dos flujos: **vacantes** de medio tiempo (el negocio publica y el estudiante se postula) y **Talento** (el estudiante publica un servicio y el negocio envía una solicitud). Toda la UI y los textos van en español.

Estado: prototipo con datos ficticios en memoria. Supabase está preparado pero **no conectado**.

## Comandos

```bash
npx expo start                 # Expo Go (QR) — Android/iOS
npx expo start --web           # navegador
npm run typecheck              # = tsc --noEmit; debe quedar sin errores
npx expo-doctor
npx expo export --platform web # build web en dist/ (ignorado por git)
```

ESLint no está configurado: `npx expo lint`, que pide AGENTS.md, todavía no aplica (por confirmar si se agrega).

Cuentas demo (cualquier contraseña): estudiante `carlos@demo.nexo`, negocio `contacto@pizzeriaroma.demo`.

## Arquitectura

- **Estado:** `src/store/AppStore.tsx` es un contexto en memoria, inicializado con `src/data/mock.ts`.
  - Todas las acciones son `async` a propósito: al conectar Supabase solo cambia este archivo, no las pantallas.
  - Cada acción valida rol y propiedad (`session.role` y `session.userId`), igual que lo hará la RLS.
- **Hooks por rol:** existen por privacidad. Las pantallas los usan en lugar de leer `useApp()` directamente.
  - Estudiante: `useCurrentStudent`, `useStudentVacancies`, `useMyServiceOffers`, `useStudentServiceRequests`.
  - Negocio: `useCurrentBusiness`, `useBusinessApplicants`, `useMarketplaceOffers`, `useBusinessServiceRequests`.
  - El negocio solo recibe `PublicStudent` (sin correo ni disponibilidad), mediante `toPublicStudent` en `src/hooks/useServiceOffers.ts`.
- **Compatibilidad** (`src/lib/compatibility.ts`, sin IA):
  - `evaluateCompatibility` fusiona bloques contiguos y mide qué parte del turno cubre cada día.
  - Resultado: `compatible` (turno completo todos los días), `parcial` o `no_compatible`.
  - Las horas se guardan en **minutos desde 00:00** y los días como `DayIndex` (0 = lunes).
- **Validación:** todos los formularios usan esquemas Zod en `src/lib/schemas.ts`.
  - `findDiscriminatoryTerm` bloquea requisitos y textos discriminatorios.
  - `toLines` convierte texto multilínea en listas.
- **Navegación:** `STUDENT_LINKS` y `BUSINESS_LINKS` en `src/theme/navigation.ts` son la fuente única.
  - Los dos `_layout.tsx` generan las pestañas a partir de esas listas.
  - En web con 768px o más, `useIsWideWeb()` activa `tabBarPosition: "left"` y el layout dibuja `<SideNav />` en lugar de la barra inferior.
  - `inTabBar: false` deja una ruta solo en la barra lateral. `*_HIDDEN_ROUTES` son rutas de detalle que no aparecen en ninguna barra.
- **Supabase:**
  - `src/lib/supabase.ts` crea el cliente solo si existen `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ver `.env.example`). Nada lo importa todavía.
  - `supabase/schema.sql` tiene tablas, RLS y funciones `security definer` que calculan la compatibilidad y exponen el correo sin dar acceso a los bloques.
  - Para cambios de esquema, **agrega al final**; no reescribas lo existente.

## Convenciones

- Estilos solo con NativeWind (`className`). Tokens en `tailwind.config.js`: `navy`, `turquoise`, `coral`, `surface`, `ink`.
- Los íconos de Lucide y el SVG no aceptan `className`: usa `src/theme/colors.ts`.
- Reutiliza `@/components/ui` (Button, Input, Card, Badge, Chip, Avatar, EmptyState, LoadingState, ProgressRing) y los badges de `src/components/StatusBadges.tsx`.
- Cada pantalla usa `<Screen>` (`src/components/Screen.tsx`): cabecera navy y hoja redondeada. Acepta `back`, `right`, `header` y `footer`; el contenido ya va centrado a `max-w-[720px]`.
- Formularios: `useForm` + `zodResolver` + `Controller`. Montos como string en el formulario y `Number()` al guardar.
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
- El correo del estudiante solo se muestra al negocio en vacantes con estado `entrevista` o `aceptada`, y en Talento con `aceptada` o `completada`.
- La tarifa de Talento es solo de referencia; el pago se acuerda fuera de NEXO y la UI debe decirlo.

## Advertencias conocidas

- **OneDrive:** Metro a veces no detecta cambios en archivos. Si un cambio no aparece, reinicia `npx expo start`.
- Si cambias `tailwind.config.js`, arranca con `npx expo start --clear`. `darkMode: "class"` es obligatorio; sin él NativeWind lanza un error en web.
- No pases a `Card` clases del mismo tipo que se contradigan (por ejemplo `bg-white` y `bg-turquoise-50`): gana el orden del CSS, no el de las clases. Usa un `View` con clases explícitas.
- En web, un `Card` con `onPress` que contiene un `Button` anida `<button>` dentro de `<button>` y causa un error de hidratación. Usa un `Pressable` aparte como enlace.
- La barra inferior necesita altura explícita (`useTabBarOptions`); sin ella las etiquetas se recortan en web.
- `npx expo-doctor` puede fallar solo por versiones de parche nuevas de Expo. No es un error del código, y actualizarlas requiere aprobación.
- Al renderizar condicionalmente con un número (`arr.length && …`) usa un ternario: en React Native un `0` suelto rompe el render.

## Agregar una pantalla

1. Crea el archivo en `src/app/estudiante/` o `src/app/negocio/` y envuélvelo en `<Screen>`.
2. Si debe aparecer en la navegación, agrégala a `STUDENT_LINKS` o `BUSINESS_LINKS` en `src/theme/navigation.ts` (`inTabBar` según el caso). Si es de detalle, agrégala a `*_HIDDEN_ROUTES`. No edites los `_layout.tsx`.
3. Los datos nuevos van como tipo en `src/types/index.ts`, datos demo en `src/data/mock.ts` y acción async con verificación de rol en `AppStore.tsx`. Exponlos por un hook de rol, no con `useApp()` en la pantalla.
4. Para formularios, agrega el esquema a `src/lib/schemas.ts` y las etiquetas en español a `src/lib/constants.ts`.
5. Corre `npm run typecheck` y revisa la pantalla en web a 390px y a 1280px.
