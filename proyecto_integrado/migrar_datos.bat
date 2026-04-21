@echo off
chcp 65001 >nul
title Ford Guerrero - Migracion de base de datos

set "BASE=%~dp0"
set "BACKEND=%BASE%backend"
set "VENV=%BACKEND%\.venv\Scripts\activate.bat"

echo ============================================
echo    FORD GUERRERO - Migracion de datos
echo ============================================
echo.

:: ── Verificar entorno virtual ─────────────────────────────────────────────
if not exist "%VENV%" goto NO_VENV
goto VENV_OK

:NO_VENV
echo [ERROR] No se encontro el entorno virtual en:
echo         %BACKEND%\.venv
echo.
echo         Ejecuta primero arrancar.bat para crearlo automaticamente.
pause
exit /b 1

:VENV_OK

cd /d "%BACKEND%"
call "%VENV%"

:: ── Verificar / crear .env ────────────────────────────────────────────────
if not exist "%BACKEND%\.env" goto CREAR_ENV
goto ENV_OK

:CREAR_ENV
echo [INFO] No se encontro el archivo .env. Generando uno para desarrollo...
python -c "from django.core.management.utils import get_random_secret_key; k=get_random_secret_key(); content='SECRET_KEY='+k+'\nDEBUG=True\nALLOWED_HOSTS=127.0.0.1,localhost\nCORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n'; open('.env','w',encoding='utf-8').write(content); print('[OK] .env generado.')"
if errorlevel 1 goto ERR_ENV
goto ENV_OK
:ERR_ENV
echo [ERROR] No se pudo generar el .env. Asegurate de tener Python en el PATH.
pause
exit /b 1

:ENV_OK

:: ── 1. Generar migraciones (makemigrations) ───────────────────────────────
echo [1/4] Generando migraciones pendientes...
python manage.py makemigrations
if errorlevel 1 goto ERR_MAKEMIGRATIONS
goto OK_MAKEMIGRATIONS
:ERR_MAKEMIGRATIONS
echo [ERROR] Fallo makemigrations.
pause
exit /b 1
:OK_MAKEMIGRATIONS
echo [OK] makemigrations completado.
echo.

:: ── 2. Aplicar migraciones (migrate) ─────────────────────────────────────
echo [2/4] Aplicando migraciones a la base de datos...
python manage.py migrate --run-syncdb
if errorlevel 1 goto ERR_MIGRATE
goto OK_MIGRATE
:ERR_MIGRATE
echo [ERROR] Fallo migrate.
pause
exit /b 1
:OK_MIGRATE
echo [OK] migrate completado.
echo.

:: ── 3. Seed: usuario administrador ───────────────────────────────────────
echo [3/4] Creando usuario administrador (admin@ford.com)...
python manage.py seed_admin
if errorlevel 1 echo [AVISO] seed_admin termino con advertencias (puede que ya exista el usuario).
echo [OK] seed_admin completado.
echo.

:: ── 4. Seed: catalogo de autos Ford ──────────────────────────────────────
echo [4/4] Poblando catalogo de vehiculos Ford Mexico 2025...
echo       (Esto puede tardar unos minutos si descarga imagenes)
python manage.py seed_autos
if errorlevel 1 echo [AVISO] seed_autos termino con advertencias.
echo [OK] seed_autos completado.
echo.

echo ============================================
echo  Migracion de datos FINALIZADA con exito.
echo  Base de datos: %BACKEND%\db.sqlite3
echo  Admin:         http://127.0.0.1:8000/admin/
echo  Email:         admin@ford.com
echo  Password:      admin123
echo ============================================
echo.
pause
