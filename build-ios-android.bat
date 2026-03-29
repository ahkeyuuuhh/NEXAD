@echo off
REM Build iOS IPA and Android APK for NEXAD
REM This script automates the build process for both platforms

echo.
echo 🚀 NEXAD - iOS ^& Android Build Script
echo ======================================
echo.

REM Check if we're in the right directory
if not exist "nexad-app" (
    echo ❌ Error: nexad-app directory not found!
    echo Please run this script from the project root directory.
    exit /b 1
)

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: EAS CLI is not installed!
    echo Install it with: npm install -g eas-cli
    exit /b 1
)

REM Navigate to app directory
cd nexad-app

echo 📱 Current app configuration:
echo    Version: 1.0.7
echo    iOS Bundle ID: com.university.nexad
echo    Android Package: com.university.nexad
echo    App Icon: ./assets/appIcon.jpg (same for both platforms)
echo.

REM Ask which platform to build
echo Which platform would you like to build?
echo 1) iOS only
echo 2) Android only
echo 3) Both platforms
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo 🍎 Building iOS IPA...
    echo Choose iOS build type:
    echo 1) Production (App Store)
    echo 2) Preview (Internal/Ad Hoc)
    set /p ios_choice="Enter your choice (1-2): "
    
    if "!ios_choice!"=="1" (
        echo Building iOS for App Store...
        eas build --platform ios --profile production
    ) else (
        echo Building iOS for internal distribution...
        eas build --platform ios --profile preview
    )
) else if "%choice%"=="2" (
    echo.
    echo 🤖 Building Android APK...
    eas build --platform android --profile production
) else if "%choice%"=="3" (
    echo.
    echo 🍎 Building iOS IPA...
    echo Choose iOS build type:
    echo 1) Production (App Store)
    echo 2) Preview (Internal/Ad Hoc)
    set /p ios_choice="Enter your choice (1-2): "
    
    if "!ios_choice!"=="1" (
        echo Building iOS for App Store...
        start /B eas build --platform ios --profile production --non-interactive
    ) else (
        echo Building iOS for internal distribution...
        start /B eas build --platform ios --profile preview --non-interactive
    )
    
    echo.
    echo 🤖 Building Android APK...
    eas build --platform android --profile production --non-interactive
) else (
    echo ❌ Invalid choice!
    exit /b 1
)

echo.
echo ✅ Build process initiated!
echo.
echo 📊 Next steps:
echo 1. Monitor your builds at: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
echo 2. Once complete, copy the artifact download URLs
echo 3. Update nexad-website/index.html with the new URLs
echo 4. Run the update-website-links.bat script to help with the update
echo.
echo 💡 Tip: Builds typically take 10-20 minutes to complete

cd ..
