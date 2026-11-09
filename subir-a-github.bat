@echo off
title Subir Cross-Diary a GitHub (walterdotblend)
cd /d "%~dp0"
echo ======================================================================
echo    SUBIENDO CROSS-DIARY A GITHUB (walterdotblend/cross-diary)
echo ======================================================================
echo.
echo Ejecutando git push -u origin main...
echo (Si se abre una ventana en tu navegador, autoriza a walterdotblend)
echo.
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================================
    echo  [OK] EXITOSO: Todos los cambios, logos y landing page estan en GitHub!
    echo  Visita tu pagina web en:
    echo  https://walterdotblend.github.io/cross-diary/
    echo ======================================================================
) else (
    echo ======================================================================
    echo  [AVISO] Si te pidio usuario/contrasena o token de GitHub:
    echo  Asegurate de autorizar la conexion con tu cuenta walterdotblend.
    echo ======================================================================
)
echo.
pause
