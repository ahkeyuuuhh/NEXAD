@echo off
setlocal enabledelayedexpansion

REM Update NEXAD website download links
REM This script helps update the iOS and Android download links on the website

echo.
echo 🔗 NEXAD - Update Website Download Links
echo =========================================
echo.

REM Check if we're in the right directory
if not exist "nexad-website" (
    echo ❌ Error: nexad-website directory not found!
    echo Please run this script from the project root directory.
    exit /b 1
)

echo 📝 Please provide the new download URLs from Expo:
echo.
echo Get them from: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds
echo.

REM Get Android APK URL
set /p android_url="🤖 Enter the new Android APK URL: "
if "!android_url!"=="" (
    echo ❌ Android URL cannot be empty!
    exit /b 1
)

REM Get iOS IPA URL
set /p ios_url="🍎 Enter the new iOS IPA URL: "
if "!ios_url!"=="" (
    echo ❌ iOS URL cannot be empty!
    exit /b 1
)

echo.
echo 📋 URLs to be updated:
echo    Android: !android_url!
echo    iOS: !ios_url!
echo.
set /p confirm="Continue with update? (y/n): "

if /i not "!confirm!"=="y" (
    echo ❌ Update cancelled.
    exit /b 0
)

REM Backup the original file
copy nexad-website\index.html nexad-website\index.html.backup >nul
echo ✅ Backup created: nexad-website\index.html.backup

REM Create a temporary PowerShell script to do the replacement
echo $content = Get-Content 'nexad-website\index.html' -Raw > temp_update.ps1
echo $content = $content -replace 'href="https://expo\.dev/artifacts/eas/[^"]*\.apk"', 'href="!android_url!"' >> temp_update.ps1
echo $content = $content -replace 'href="https://expo\.dev/artifacts/eas/[^"]*\.ipa"', 'href="!ios_url!"' >> temp_update.ps1
echo $content ^| Set-Content 'nexad-website\index.html' -NoNewline >> temp_update.ps1

REM Execute the PowerShell script
powershell -ExecutionPolicy Bypass -File temp_update.ps1

REM Clean up
del temp_update.ps1

echo ✅ Website links updated successfully!
echo.
echo 📊 Next steps:
echo 1. Review the changes in nexad-website\index.html
echo 2. Test the download links locally
echo 3. Commit and push the changes:
echo    cd nexad-website
echo    git add index.html
echo    git commit -m "Update iOS and Android download links"
echo    git push
echo.
echo 💡 If something went wrong, restore from backup:
echo    copy nexad-website\index.html.backup nexad-website\index.html

endlocal
