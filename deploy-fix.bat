@echo off
echo ========================================
echo  DEPLOYING CORS FIX TO SUPABASE
echo ========================================
echo.

echo Checking Supabase CLI...
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    echo Or visit: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo.
echo Deploying send-contact-email function...
echo.

supabase functions deploy send-contact-email

if errorlevel 1 (
    echo.
    echo ========================================
    echo  DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Possible issues:
    echo 1. Not logged in - Run: supabase login
    echo 2. Project not linked - Run: supabase link --project-ref klrfkhyvgtffsjpdioax
    echo 3. Network error - Check your internet connection
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo The CORS fix has been deployed.
echo.
echo Next steps:
echo 1. Refresh your admin panel (Ctrl+F5)
echo 2. Click Reply on a contact
echo 3. Send a test message
echo 4. It should work now!
echo.
pause
