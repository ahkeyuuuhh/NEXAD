#!/bin/bash

# Skill-Based Matching Feature - OTA Deployment Script
# This script deploys the new feature to the existing APK via OTA update

set -e  # Exit on error

echo "🚀 NEXAD Skill-Based Matching - OTA Deployment"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -d "nexad-app" ]; then
    echo "❌ Error: nexad-app directory not found"
    echo "Please run this script from the project root"
    exit 1
fi

cd nexad-app

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "📝 Please edit nexad-app/.env and add your Lightcast API credentials:"
    echo "   EXPO_PUBLIC_LIGHTCAST_CLIENT_ID=your_client_id_here"
    echo "   EXPO_PUBLIC_LIGHTCAST_CLIENT_SECRET=your_client_secret_here"
    echo ""
    echo "Get credentials from: https://auth.emsicloud.com/"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔍 Running pre-deployment checks..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "⚠️  EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Verify EAS login
echo "Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to EAS:"
    eas login
fi

echo ""
echo "✅ Pre-deployment checks passed!"
echo ""

# Ask which channel to deploy to
echo "Select deployment channel:"
echo "1) Preview (recommended for testing)"
echo "2) Production (live users)"
read -p "Enter choice (1 or 2): " channel_choice

if [ "$channel_choice" = "1" ]; then
    CHANNEL="preview"
    echo ""
    echo "📤 Deploying to PREVIEW channel..."
elif [ "$channel_choice" = "2" ]; then
    CHANNEL="production"
    echo ""
    echo "⚠️  WARNING: Deploying to PRODUCTION!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
    echo ""
    echo "📤 Deploying to PRODUCTION channel..."
else
    echo "Invalid choice. Exiting."
    exit 1
fi

# Deploy the update
echo ""
echo "Building and uploading update..."
echo ""

if [ "$CHANNEL" = "preview" ]; then
    npm run update:preview
else
    npm run update:production
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📱 The update will be available to users on the next app launch."
echo ""
echo "🔗 Current APK: https://expo.dev/artifacts/eas/jy8mSzY1mcXU3dk5Xkxfb.apk"
echo ""
echo "📋 Next steps:"
echo "1. Test the update on your device"
echo "2. Close and reopen the app to download the update"
echo "3. Navigate to 'Find Teachers' as a student"
echo "4. Verify the 'Recommended for You' section appears"
echo ""
echo "📚 Documentation:"
echo "- Implementation details: SKILL_BASED_MATCHING_IMPLEMENTATION.md"
echo "- Deployment guide: DEPLOY_SKILL_MATCHING.md"
echo ""
echo "🎉 Done!"
