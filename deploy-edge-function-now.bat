@echo off
echo ========================================
echo DEPLOYING EDGE FUNCTION TO SUPABASE
echo ========================================
echo.

echo Checking if Supabase CLI is installed...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Supabase CLI is not installed!
    echo.
    echo You need to deploy manually via Supabase Dashboard:
    echo.
    echo 1. Go to: https://supabase.com/dashboard
    echo 2. Select your NEXAD project
    echo 3. Click "Edge Functions" in sidebar
    echo 4. Click on "send-contact-email"
    echo 5. Click "Edit" or "Deploy"
    echo 6. Delete all code in the editor
    echo 7. Copy ALL code from: supabase/functions/send-contact-email/index.ts
    echo 8. Paste into editor
    echo 9. Click "Deploy"
    echo.
    echo Press any key to open the deployment guide...
    pause >nul
    start DEPLOY_VIA_DASHBOARD.md
    exit /b 1
)

echo.
echo Supabase CLI found! Deploying...
echo.

cd /d "%~dp0"

echo Deploying send-contact-email function...
supabase functions deploy send-contact-email

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo DEPLOYMENT SUCCESSFUL!
    echo ========================================
    echo.
    echo The Edge Function has been deployed.
    echo Admin replies will now work for all email addresses.
    echo.
    echo Test it:
    echo 1. Go to Admin Dashboard
    echo 2. Reply to any contact
    echo 3. Should work without errors
    echo.
) else (
    echo.
    echo ========================================
    echo DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Please deploy manually via Supabase Dashboard.
    echo Opening deployment guide...
    echo.
    start DEPLOY_VIA_DASHBOARD.md
)

echo.
pause
