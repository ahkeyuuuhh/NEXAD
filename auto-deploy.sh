#!/bin/bash

echo "========================================"
echo " AUTO-DEPLOY NEXAD REPLY SYSTEM"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Installing..."
    echo ""
    npm install -g supabase
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install Supabase CLI"
        echo "Please install Node.js first from: https://nodejs.org"
        exit 1
    fi
fi

echo "Supabase CLI found!"
echo ""

# Check if logged in
supabase projects list &> /dev/null
if [ $? -ne 0 ]; then
    echo "Not logged in. Opening login..."
    echo ""
    supabase login
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Login failed"
        exit 1
    fi
fi

echo "Logged in successfully!"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "Linking to project..."
    echo ""
    supabase link --project-ref klrfkhyvgtffsjpdioax
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to link project"
        exit 1
    fi
fi

echo "Project linked!"
echo ""

# Deploy the function
echo "Deploying send-contact-email function..."
echo ""
supabase functions deploy send-contact-email

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo " DEPLOYMENT SUCCESSFUL!"
    echo "========================================"
    echo ""
    echo "The reply system is now working!"
    echo ""
    echo "Next steps:"
    echo "1. Refresh your admin panel (Ctrl+F5)"
    echo "2. Click Reply on a contact"
    echo "3. Send a test message"
    echo "4. Check your email!"
    echo ""
else
    echo ""
    echo "========================================"
    echo " DEPLOYMENT FAILED"
    echo "========================================"
    echo ""
    echo "Please check the error above."
    echo ""
fi
