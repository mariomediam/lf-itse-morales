@echo off
setlocal

REM ============================================================
REM Generar build del frontend usando Docker y extraer /app/dist
REM ============================================================



REM 0. Eliminar carpeta dist si ya existe
if exist "frontend\dist" (
    echo Eliminando carpeta frontend\dist existente...
    rmdir /s /q "frontend\dist"
)

REM Eliminar contenedor temporal anterior si quedo creado
docker rm -f temp-extract >nul 2>&1

echo.
echo [1/3] Compilando frontend con Docker...
docker build -f frontend/Dockerfile.prod --target builder -t frontend-builder ./frontend


if errorlevel 1 (
    echo.
    echo ERROR: Fallo la compilacion del frontend.
    pause
    exit /b 1
)

echo.
echo [2/3] Creando contenedor temporal...
docker create --name temp-extract frontend-builder

if errorlevel 1 (
    echo.
    echo ERROR: No se pudo crear el contenedor temporal.
    pause
    exit /b 1
)

echo.
echo Extrayendo carpeta dist...
docker cp temp-extract:/app/dist ./frontend/dist


if errorlevel 1 (
    echo.
    echo ERROR: No se pudo copiar la carpeta dist.
    docker rm -f temp-extract >nul 2>&1
    pause
    exit /b 1
)

echo.
echo [3/3] Limpiando contenedor temporal...
docker rm temp-extract

echo.
echo ============================================================
echo BUILD GENERADO CORRECTAMENTE
echo ============================================================
echo.

pause
endlocal
