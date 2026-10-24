# Valida supabase/schema.sql en tu PostgreSQL local antes de ejecutarlo en Supabase.
# Crea (y reemplaza) la base desechable "nexo_schema_test"; no toca ninguna otra base.
#
# Requisito: la contraseña del usuario postgres en %APPDATA%\postgresql\pgpass.conf con la línea
#   localhost:5432:*:postgres:TU_CONTRASEÑA
# Uso (desde la raíz del proyecto):
#   powershell -ExecutionPolicy Bypass -File supabase\local\probar-esquema.ps1

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$db = "nexo_schema_test"
$common = @("-U", "postgres", "-h", "localhost", "-w", "-v", "ON_ERROR_STOP=1", "-q")

function Run($label, $arguments) {
  Write-Host "== $label" -ForegroundColor Cyan
  & $psql @common @arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló: $label" }
}

Run "Recrear base de prueba" @("-d", "postgres", "-c", "drop database if exists $db;", "-c", "create database $db;")
Run "Simular Supabase (auth, roles)" @("-d", $db, "-f", "$root\supabase\local\supabase-shim.sql")
# -1 = una sola transacción, igual que cuando se pega el archivo completo en el SQL Editor de Supabase.
Run "Cargar schema.sql (una transacción)" @("-d", $db, "-1", "-f", "$root\supabase\schema.sql")
Run "Pruebas de la Etapa 1" @("-d", $db, "-f", "$root\supabase\local\test-etapa1.sql")
Write-Host "Listo: el esquema carga y las pruebas pasaron." -ForegroundColor Green
