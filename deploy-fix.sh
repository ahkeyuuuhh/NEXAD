#!/bin/bash

echo "========================================"
echo " DEPLOYING CORS FIX TO SUPABASE"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "Supabase CLI found: $(supabase --version)"
echo ""
echo "Deploying send-contact-email function..."
echo ""

# Deploy the function
supabase functions deploy send-contact-email

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo " DEPLOYMENT SUCCESSFUL!"
    echo "========================================"
    echo ""
    echo "The CORS fix has been deployed."
    echo ""
    echo "Next steps:"
    echo "1. Refresh your admin panel (Ctrl+F5)"
    echo "2. Click Reply on a contact"
    echo "3. Send a test message"
    echo "4. It should work now!"
    echo ""
else
    echo ""
    echo "========================================"
    echo " DEPLOYMENT FAILED"
    echo "========================================"
    echo ""
    echo "Possible issues:"
    echo "1. Not logged in - Run: supabase login"
    echo "2. Project not linked - Run: supabase link --project-ref klrfkhyvgtffsjpdioax"
    echo "3. Network error - Check your internet connection"
    echo ""
    exit 1
fi
