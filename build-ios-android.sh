#!/bin/bash

# Build iOS IPA and Android APK for NEXAD
# This script automates the build process for both platforms

set -e  # Exit on error

echo "🚀 NEXAD - iOS & Android Build Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "nexad-app" ]; then
    echo "❌ Error: nexad-app directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ Error: EAS CLI is not installed!"
    echo "Install it with: npm install -g eas-cli"
    exit 1
fi

# Navigate to app directory
cd nexad-app

echo "📱 Current app configuration:"
echo "   Version: 1.0.7"
echo "   iOS Bundle ID: com.university.nexad"
echo "   Android Package: com.university.nexad"
echo "   App Icon: ./assets/appIcon.jpg (same for both platforms)"
echo ""

# Ask which platform to build
echo "Which platform would you like to build?"
echo "1) iOS only"
echo "2) Android only"
echo "3) Both platforms"
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🍎 Building iOS IPA..."
        echo "Choose iOS build type:"
        echo "1) Production (App Store)"
        echo "2) Preview (Internal/Ad Hoc)"
        read -p "Enter your choice (1-2): " ios_choice
        
        if [ "$ios_choice" = "1" ]; then
            echo "Building iOS for App Store..."
            eas build --platform ios --profile production
        else
            echo "Building iOS for internal distribution..."
            eas build --platform ios --profile preview
        fi
        ;;
    2)
        echo ""
        echo "🤖 Building Android APK..."
        eas build --platform android --profile production
        ;;
    3)
        echo ""
        echo "🍎 Building iOS IPA..."
        echo "Choose iOS build type:"
        echo "1) Production (App Store)"
        echo "2) Preview (Internal/Ad Hoc)"
        read -p "Enter your choice (1-2): " ios_choice
        
        if [ "$ios_choice" = "1" ]; then
            echo "Building iOS for App Store..."
            eas build --platform ios --profile production --non-interactive &
            IOS_PID=$!
        else
            echo "Building iOS for internal distribution..."
            eas build --platform ios --profile preview --non-interactive &
            IOS_PID=$!
        fi
        
        echo ""
        echo "🤖 Building Android APK..."
        eas build --platform android --profile production --non-interactive &
        ANDROID_PID=$!
        
        echo ""
        echo "⏳ Waiting for builds to complete..."
        wait $IOS_PID
        wait $ANDROID_PID
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✅ Build process initiated!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor your builds at: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds"
echo "2. Once complete, copy the artifact download URLs"
echo "3. Update nexad-website/index.html with the new URLs"
echo "4. Run the update-website-links.sh script to help with the update"
echo ""
echo "💡 Tip: Builds typically take 10-20 minutes to complete"
