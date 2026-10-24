# NEXO · Conectar Supabase

Guía para crear el proyecto y conectar la app. Las tablas quedan **vacías**: los datos se cargan después, a mano desde el panel o con peticiones.

## Estado de la migración

| Etapa | Qué pasa a Supabase | Estado |
|---|---|---|
| 1 | Cuentas (registro, inicio y cierre de sesión), perfiles de estudiante y negocio | ✅ Código listo |
| 2 | Vacantes, postulaciones, disponibilidad y compatibilidad | ✅ Código listo (requiere migraciones 001 y 002) |
| 3 | Talento, seguimiento de servicios y notificaciones | ✅ Código listo (requiere migraciones 001 y 002) |
| 4 | Vacantes guardadas, entrevistas y reportes (alertas, límite semanal y mapa ya se guardaban en el perfil) | ✅ Código listo (requiere migración 003) |

Todo se guarda en Supabase. Lo único local es el recordatorio de fin de periodo, que la app genera al abrir.

Los reportes solo los lee administración: en el panel, **Table Editor → reports** (o con la clave service_role desde un servidor propio).

## Migraciones

Si tu proyecto ya tenía `schema.sql`, ejecuta cada archivo de `supabase/migraciones/` **una sola vez**, en orden, en el SQL Editor:

| Archivo | Qué agrega |
|---|---|
| `001_etapas_2_3.sql` | Lecturas que faltaban (vacantes a las que te postulaste, servicios a los que enviaste solicitud) y funciones del servidor que calculan compatibilidad y contacto sin exponer la disponibilidad |
| `002_perfil_estudiante_privado.sql` | Quita la lectura directa del perfil completo del estudiante por el negocio; solo recibe el perfil público |
| `003_etapa_4.sql` | Evita el aviso duplicado al proponer una entrevista (las tablas de la Etapa 4 ya venían en `schema.sql`) |

En una instalación nueva no hace falta: `schema.sql` ya incluye todas las migraciones.

## 1. Crear el proyecto

1. Entra a <https://supabase.com>, crea una cuenta y un **New project** (el plan gratuito basta para desarrollo).
2. Elige una región cercana y guarda la contraseña de la base de datos en un lugar seguro. No la necesita la app.
3. Espera a que el proyecto termine de crearse.

## 2. Crear el esquema

1. En el panel: **SQL Editor → New query**.
2. Pega el contenido completo de `supabase/schema.sql` y pulsa **Run**. En una base nueva se puede ejecutar todo de una vez.
3. Revisa que no haya errores. En **Table Editor** deben aparecer `profiles`, `student_profiles`, `business_profiles`, `vacancies`, etc., todas vacías.

> Antes de este paso conviene validar el archivo localmente: `powershell -ExecutionPolicy Bypass -File supabase\local\probar-esquema.ps1` (ver el encabezado del script).

## 3. Configurar la autenticación

En **Authentication → Sign In / Providers → Email**:

- **Confirm email**: para desarrollo se recomienda **desactivarlo**, así el registro entra directo. Si lo dejas activo, la app muestra "Revisa tu correo" y la persona inicia sesión después de confirmar.
- La contraseña mínima de la app es de 8 caracteres en el registro.

## 4. Conectar la app

1. Copia `.env.example` como `.env` en la raíz del proyecto.
2. En **Project Settings → API** copia:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** (o *publishable*) key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. **Nunca** pongas en `.env` ni en el código la clave **service_role** (o *secret*): salta toda la seguridad (RLS). Solo se usa desde el panel o desde servidores propios.
4. Reinicia: `npx expo start --clear`.

`.env` está en `.gitignore`: no se sube a GitHub.

## 5. Probar

1. Abre la app, toca **Crear cuenta** y registra un estudiante.
2. En el panel, **Table Editor → student_profiles**: debe aparecer la fila creada automáticamente.
3. Completa el perfil en la app y verifica que los cambios se guardan en la tabla.
4. Cierra sesión, vuelve a entrar y recarga la página: la sesión se restaura sola.
5. Repite con una cuenta de negocio.

## Cargar datos a mano

- **Cuentas**: créalas desde la app (registro) o en **Authentication → Users → Add user**. Si las creas en el panel, agrega en *User metadata* el JSON `{"role":"negocio","full_name":"Nombre"}` (o `estudiante`); sin eso el trigger rechaza el alta.
- **Resto de tablas**: desde **Table Editor** o con peticiones a la API REST de Supabase usando la sesión de cada usuario, para que la RLS se aplique.
