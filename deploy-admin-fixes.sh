#!/bin/bash

echo "========================================"
echo "NEXAD Admin Panel - Deploy Fixes"
echo "========================================"
echo ""
echo "This script will deploy the admin panel fixes:"
echo "1. Contact deletion UI update"
echo "2. Reply modal with original message"
echo "3. Resend API email sending"
echo ""
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI is not installed!"
    echo ""
    echo "Please install it first:"
    echo "npm install -g supabase"
    echo ""
    exit 1
fi

echo "[1/4] Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "You need to login to Supabase first."
    echo ""
    supabase login
    if [ $? -ne 0 ]; then
        echo "Login failed!"
        exit 1
    fi
fi
echo "✓ Logged in to Supabase"
echo ""

echo "[2/4] Checking project link..."
if ! supabase status &> /dev/null; then
    echo "Linking to Supabase project..."
    supabase link --project-ref klrfkhyvgtffsjpdioax
    if [ $? -ne 0 ]; then
        echo "Failed to link project!"
        exit 1
    fi
fi
echo "✓ Project linked"
echo ""

echo "[3/4] Checking Resend API key..."
echo ""
echo "IMPORTANT: Make sure you have set the RESEND_API_KEY secret!"
echo ""
echo "To set it, run:"
echo "supabase secrets set RESEND_API_KEY=your_api_key_here"
echo ""
echo "Or set it in the Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/klrfkhyvgtffsjpdioax/settings/functions"
echo ""
read -p "Have you set the RESEND_API_KEY? (y/n): " continue
if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
    echo ""
    echo "Please set the RESEND_API_KEY first, then run this script again."
    exit 0
fi
echo ""

echo "[4/4] Deploying Edge Function..."
supabase functions deploy send-contact-email
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to deploy Edge Function!"
    echo ""
    echo "Please check:"
    echo "1. You are logged in to Supabase"
    echo "2. The project is linked correctly"
    echo "3. You have permissions to deploy functions"
    echo ""
    exit 1
fi
echo ""

echo "========================================"
echo "✓ Deployment Complete!"
echo "========================================"
echo ""
echo "All fixes have been deployed:"
echo "✓ Contact deletion now updates UI immediately"
echo "✓ Reply modal shows original user message"
echo "✓ Email sending configured with Resend API"
echo ""
echo "Next steps:"
echo "1. Test contact deletion in admin panel"
echo "2. Test reply functionality"
echo "3. Verify email delivery"
echo ""
echo "Admin Panel: http://localhost:8080/admin.html"
echo ""
