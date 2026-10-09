# NEXO

Plataforma de empleo de medio tiempo que conecta a estudiantes universitarios activos —de cualquier carrera, semestre e institución— con pequeños negocios que necesitan cubrir turnos. Su diferenciador es la **compatibilidad real** entre los bloques de disponibilidad del estudiante y el horario de la vacante.

> **Estado:** prototipo visual funcional con datos de demostración ficticios. Supabase está preparado (cliente + esquema SQL con RLS), pero la app aún no se conecta a él.

## Stack

Expo SDK 57 · React Native · TypeScript · Expo Router · NativeWind 4 (Tailwind 3) · React Hook Form + Zod · Lucide · Supabase

## Ejecutar localmente

Requisitos: Node 20+ y la app **Expo Go** en tu teléfono (opcional).

```bash
npm install
npx expo start          # escanea el QR con Expo Go (Android/iOS)
npx expo start --web    # abre en el navegador
npm run typecheck       # verificación de TypeScript
```

Si cambias `tailwind.config.js`, reinicia con caché limpia: `npx expo start --clear`.

> **Nota sobre OneDrive:** si la carpeta del proyecto está sincronizada con OneDrive, es posible que Metro no detecte cambios en los archivos. Si al editar no ves los cambios, reinicia `npx expo start`, o mueve el proyecto fuera de OneDrive.

### Cuentas de demostración

En la pantalla de inicio de sesión elige el rol; cualquier contraseña funciona.

| Rol        | Correo                        |
| ---------- | ----------------------------- |
| Estudiante | `carlos@demo.nexo`            |
| Negocio    | `contacto@pizzeriaroma.demo`  |

También puedes registrarte con un correo nuevo para ver el flujo desde cero. Los datos viven en memoria y se reinician al recargar la app.

## Estructura

```
src/
  app/                      Rutas (Expo Router)
    index.tsx               Bienvenida
    login.tsx, registro.tsx
    estudiante/             Tabs: inicio, vacantes, postulaciones, perfil
      disponibilidad.tsx    Editor de bloques semanales
      vacante/[id].tsx      Detalle + postularse
    negocio/                Tabs: inicio, vacantes, postulaciones, perfil
      publicar-vacante.tsx  Crear/editar (?id=)
  components/
    ui/                     Button, Input, Card, Badge, EmptyState, LoadingState, Chip, Avatar, ProgressRing
    Screen.tsx              Cabecera azul marino + hoja redondeada
    VacancyCard, StatusBadges, Pickers (días/hora), TagInput, …
  hooks/                    useStudentVacancies, useBusinessApplicants
  lib/
    compatibility.ts        Reglas de compatibilidad (sin IA)
    schemas.ts              Validación Zod (incluye bloqueo de criterios discriminatorios)
    supabase.ts             Cliente, activo solo si existen variables de entorno
  store/AppStore.tsx        Estado en memoria; acciones async listas para cambiar a Supabase
  data/mock.ts              Datos ficticios
supabase/schema.sql         Tablas, funciones y políticas RLS
```

## Reglas de compatibilidad

Para cada día laboral de la vacante se calcula qué proporción del turno cubren los bloques del estudiante (los bloques contiguos se fusionan):

- **Compatible:** cubre el turno completo todos los días.
- **Parcialmente compatible:** cubre al menos una parte.
- **No compatible:** sin coincidencias.

## Privacidad

- No se solicita kardex, calificaciones, fotografía ni horario académico completo.
- Los bloques de disponibilidad solo los ve su dueño. El negocio ve la etiqueta de compatibilidad, que en Supabase calcula la función `application_compatibility` del lado del servidor.
- Un negocio solo puede leer perfiles de estudiantes que se postularon a sus vacantes. El correo del estudiante se muestra a partir de que su postulación pasa a "Entrevista".
- Los requisitos de una vacante se validan contra términos discriminatorios (edad, género, apariencia, religión, origen, estado civil…).
- Esta versión no incluye pagos, contratos, chat, mapas ni reputación pública.

## Conectar Supabase (siguiente paso)

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor.
2. Copia `.env.example` como `.env` y llena `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Reemplaza las acciones de `src/store/AppStore.tsx` por consultas a `supabase`. Las pantallas no necesitan cambios.
