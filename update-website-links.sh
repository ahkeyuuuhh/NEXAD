#!/bin/bash

# Update NEXAD website download links
# This script helps update the iOS and Android download links on the website

set -e

echo "🔗 NEXAD - Update Website Download Links"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "nexad-website" ]; then
    echo "❌ Error: nexad-website directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📝 Please provide the new download URLs from Expo:"
echo ""
echo "Get them from: https://expo.dev/accounts/ahkeyuuuhh/projects/nexad/builds"
echo ""

# Get Android APK URL
read -p "🤖 Enter the new Android APK URL: " android_url
if [ -z "$android_url" ]; then
    echo "❌ Android URL cannot be empty!"
    exit 1
fi

# Get iOS IPA URL
read -p "🍎 Enter the new iOS IPA URL: " ios_url
if [ -z "$ios_url" ]; then
    echo "❌ iOS URL cannot be empty!"
    exit 1
fi

echo ""
echo "📋 URLs to be updated:"
echo "   Android: $android_url"
echo "   iOS: $ios_url"
echo ""
read -p "Continue with update? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Update cancelled."
    exit 0
fi

# Backup the original file
cp nexad-website/index.html nexad-website/index.html.backup
echo "✅ Backup created: nexad-website/index.html.backup"

# Read the current Android URL from the file
current_android_url=$(grep -o 'href="https://expo.dev/artifacts/eas/[^"]*\.apk"' nexad-website/index.html | head -1 | sed 's/href="//;s/"//')

if [ -z "$current_android_url" ]; then
    echo "⚠️  Warning: Could not find current Android URL in index.html"
    echo "You may need to update the file manually."
else
    # Update Android URL
    sed -i.tmp "s|$current_android_url|$android_url|g" nexad-website/index.html
    rm -f nexad-website/index.html.tmp
    echo "✅ Android APK URL updated"
fi

# Check if iOS download button exists
if grep -q "ios-btn" nexad-website/index.html; then
    echo "✅ iOS download button already exists"
    # Try to update existing iOS URL
    current_ios_url=$(grep -o 'href="https://expo.dev/artifacts/eas/[^"]*\.ipa"' nexad-website/index.html | head -1 | sed 's/href="//;s/"//')
    if [ ! -z "$current_ios_url" ]; then
        sed -i.tmp "s|$current_ios_url|$ios_url|g" nexad-website/index.html
        rm -f nexad-website/index.html.tmp
        echo "✅ iOS IPA URL updated"
    fi
else
    echo "⚠️  iOS download button not found in index.html"
    echo "You'll need to add it manually. See BUILD_IOS_AND_UPDATE_WEBSITE.md for the HTML template."
fi

echo ""
echo "✅ Website links updated successfully!"
echo ""
echo "📊 Next steps:"
echo "1. Review the changes in nexad-website/index.html"
echo "2. Test the download links locally"
echo "3. Commit and push the changes:"
echo "   cd nexad-website"
echo "   git add index.html"
echo "   git commit -m 'Update iOS and Android download links'"
echo "   git push"
echo ""
echo "💡 If something went wrong, restore from backup:"
echo "   cp nexad-website/index.html.backup nexad-website/index.html"
