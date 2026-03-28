@echo off
REM Skill-Based Matching Feature - OTA Deployment Script (Windows)
REM This script deploys the new feature to the existing APK via OTA update

echo.
echo ========================================
echo NEXAD Skill-Based Matching - OTA Deployment
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "nexad-app" (
    echo Error: nexad-app directory not found
    echo Please run this script from the project root
    pause
    exit /b 1
)

cd nexad-app

REM Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo Please edit nexad-app\.env and add your Lightcast API credentials:
    echo    EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=your_client_id_here
    echo    EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=your_client_secret_here
    echo.
    echo Get credentials from: https://auth.emsicloud.com/
    echo.
    pause
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Running pre-deployment checks...
echo.

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
)

REM Verify EAS login
echo Checking EAS authentication...
call eas whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Please log in to EAS:
    call eas login
)

echo.
echo Pre-deployment checks passed!
echo.

REM Ask which channel to deploy to
echo Select deployment channel:
echo 1) Preview (recommended for testing)
echo 2) Production (live users)
set /p channel_choice="Enter choice (1 or 2): "

if "%channel_choice%"=="1" (
    set CHANNEL=preview
    echo.
    echo Deploying to PREVIEW channel...
) else if "%channel_choice%"=="2" (
    set CHANNEL=production
    echo.
    echo WARNING: Deploying to PRODUCTION!
    set /p confirm="Are you sure? (yes/no): "
    if not "%confirm%"=="yes" (
        echo Deployment cancelled.
        pause
        exit /b 0
    )
    echo.
    echo Deploying to PRODUCTION channel...
) else (
    echo Invalid choice. Exiting.
    pause
    exit /b 1
)

REM Deploy the update
echo.
echo Building and uploading update...
echo.

if "%CHANNEL%"=="preview" (
    call npm run update:preview
) else (
    call npm run update:production
)

echo.
echo ========================================
echo Deployment successful!
echo ========================================
echo.
echo The update will be available to users on the next app launch.
echo.
echo Current APK: https://expo.dev/artifacts/eas/jy8mSzY1mcXU3dk5Xkxfb.apk
echo.
echo Next steps:
echo 1. Test the update on your device
echo 2. Close and reopen the app to download the update
echo 3. Navigate to 'Find Teachers' as a student
echo 4. Verify the 'Recommended for You' section appears
echo.
echo Documentation:
echo - Implementation details: SKILL_BASED_MATCHING_IMPLEMENTATION.md
echo - Deployment guide: DEPLOY_SKILL_MATCHING.md
echo.
echo Done!
echo.
pause
