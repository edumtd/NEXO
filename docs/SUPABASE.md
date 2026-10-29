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
| `004_panel_admin.sql` | Panel de administración: tabla `admins`, `is_admin()`, estado de los reportes, bitácora `admin_actions` y funciones de moderación |
| `005_verificacion.sql` | Verificación de negocios (comprobante en Storage privado) y de estudiantes (código al correo institucional). Requiere los pasos de "Verificación" |

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

### Recuperar contraseña

La app envía el enlace con `resetPasswordForEmail` y lo recibe en la pantalla `/restablecer`. Supabase solo redirige a direcciones permitidas; si la dirección no está en la lista, manda a la *Site URL* y el enlace no funciona.

En **Authentication → URL Configuration → Redirect URLs** agrega:

| Dónde se abre la app | URL |
|---|---|
| Web en desarrollo (`npx expo start --web`) | `http://localhost:8081/restablecer` |
| Expo Go en el teléfono | `exp://**` |
| Build propio (Android/iOS) | `nexo://restablecer` |
| Web publicada | `https://TU-DOMINIO/restablecer` |

- La plantilla **Reset Password** (Authentication → Emails) funciona sin cambios.
- El servicio de correo integrado de Supabase solo entrega a los correos de los miembros del proyecto y tiene un límite muy bajo de envíos por hora. Para usuarios reales configura un SMTP propio en **Authentication → Emails → SMTP Settings**.
- El enlace se debe abrir en el mismo dispositivo donde está la app.

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

## Administradores

No existe un rol "admin" en el registro: nadie puede volverse administrador desde la app ni desde la API. Se hace solo desde el **SQL Editor** (requiere la migración 004).

1. Registra la cuenta en la app con el correo que será de administración (por ejemplo, como negocio "Administración NEXO").
2. En el SQL Editor, cambiando el correo:
   ```sql
   insert into admins (user_id) select id from auth.users where email = admin@tu-dominio.com;
   delete from profiles where id = (select id from auth.users where email = admin@tu-dominio.com);
   ```
   La primera línea la hace administradora; la segunda borra su perfil de negocio o estudiante, para que no aparezca en el mapa, en Talento ni en vacantes.
3. Inicia sesión en la app web (pantalla de 768 px o más): entra directo a `/admin/reportes`.

- **Quitar el acceso:** `delete from admins where user_id = (select id from auth.users where email = …);`. La cuenta queda sin perfil y ya no puede entrar; bórrala en **Authentication → Users** si no se usará.
- Una cuenta de administración no puede ser también estudiante o negocio: usa otro correo para eso.
- Suspender cuentas no está en el panel: se hace en **Authentication → Users → Ban user**.

## Verificación

Requiere la migración 005. Activa las extensiones `pg_net` y `pgcrypto`; si el SQL Editor no lo permite, actívalas en **Database → Extensions** y vuelve a ejecutarla.

### Negocios (comprobante de domicilio)

No necesita configuración extra: la migración crea el bucket privado `verificaciones` (PDF, JPG o PNG de hasta 5 MB).

- El negocio sube el comprobante desde su perfil. Solo administración lo puede ver, desde **Panel → Verificaciones**, con un enlace que dura 60 segundos.
- Al aprobar o rechazar, el archivo se borra del bucket. Tras un rechazo, el negocio puede volver a intentarlo en 7 días.
- Si alguna vez el panel avisa que no pudo borrar el archivo, bórralo a mano en **Storage → verificaciones**.

### Estudiantes (código al correo institucional)

El código se envía desde la base de datos (`pg_net`) con la API de **Brevo** (plan gratuito: 300 correos al día). El correo de Supabase no sirve, porque solo envía a los miembros del proyecto.

1. Crea una cuenta en <https://www.brevo.com>.
2. En **Senders, Domains & Dedicated IPs → Senders**, agrega el correo remitente (por ejemplo tu Gmail) y confírmalo desde el correo que te llega.
3. En **SMTP & API → API Keys**, genera una clave.
4. En el SQL Editor, guarda la clave y el remitente en el Vault (nunca en `.env` ni en el código):
   ```sql
   select vault.create_secret(TU_API_KEY_DE_BREVO, brevo_api_key);
   select vault.create_secret(tu-remitente@gmail.com, brevo_sender_email);
   ```
   Para cambiarlas después: `select vault.update_secret((select id from vault.secrets where name = brevo_api_key), NUEVA_CLAVE);`
5. Dominios institucionales aceptados:
   - Cualquier correo que termine en **`.edu.mx`** se acepta sin configurar nada.
   - Agrega otros dominios en la tabla `student_email_domains`. Cada dominio acepta también sus subdominios:
     ```sql
     insert into student_email_domains (domain) values (alumno.buap.mx);
     ```

Qué se guarda: solo **que el estudiante se verificó y cuándo**, más una huella irreversible del correo (para que el mismo correo no verifique dos cuentas). El código vale 10 minutos, con 5 intentos y 3 envíos por hora. Con un remitente de Gmail, los primeros correos pueden llegar a spam; para usuarios reales conviene un dominio propio verificado en Brevo.

## Cargar datos a mano

- **Cuentas**: créalas desde la app (registro) o en **Authentication → Users → Add user**. Si las creas en el panel, agrega en *User metadata* el JSON `{"role":"negocio","full_name":"Nombre"}` (o `estudiante`); sin eso el trigger rechaza el alta.
- **Resto de tablas**: desde **Table Editor** o con peticiones a la API REST de Supabase usando la sesión de cada usuario, para que la RLS se aplique.
