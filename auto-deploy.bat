@echo off
echo ========================================
echo  AUTO-DEPLOY NEXAD REPLY SYSTEM
echo ========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Supabase CLI not found. Installing...
    echo.
    npm install -g supabase
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install Supabase CLI
        echo Please install Node.js first from: https://nodejs.org
        pause
        exit /b 1
    )
)

echo Supabase CLI found!
echo.

REM Check if logged in
supabase projects list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Not logged in. Opening login...
    echo.
    supabase login
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Login failed
        pause
        exit /b 1
    )
)

echo Logged in successfully!
echo.

REM Check if project is linked
if not exist ".supabase\config.toml" (
    echo Linking to project...
    echo.
    supabase link --project-ref klrfkhyvgtffsjpdioax
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to link project
        pause
        exit /b 1
    )
)

echo Project linked!
echo.

REM Deploy the function
echo Deploying send-contact-email function...
echo.
supabase functions deploy send-contact-email

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo The reply system is now working!
    echo.
    echo Next steps:
    echo 1. Refresh your admin panel (Ctrl+F5)
    echo 2. Click Reply on a contact
    echo 3. Send a test message
    echo 4. Check your email!
    echo.
) else (
    echo.
    echo ========================================
    echo  DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Please check the error above.
    echo.
)

pause
