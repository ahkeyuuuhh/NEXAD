# 🔧 HOW TO VERIFY DOMAIN IN RESEND - PERMANENT FIX

## THE PROBLEM

Resend API is in **TESTING MODE**:
- ❌ Can only send to: zitacristel@gmail.com
- ❌ Cannot send to: any other email address
- ❌ Returns 403 error for unverified recipients

## THE SOLUTION

Verify a domain in Resend so you can send to ANY email address.

---

## STEP-BY-STEP GUIDE

### Step 1: Go to Resend Dashboard
1. Open: **https://resend.com/login**
2. Log in with your Resend account
3. Go to: **https://resend.com/domains**

### Step 2: Add Your Domain
1. Click **"Add Domain"** button
2. Enter your domain name (e.g., `nexad.com` or `yourdomain.com`)
3. Click **"Add"**

### Step 3: Add DNS Records
Resend will show you DNS records to add. You need to add these to your domain registrar:

**Example DNS Records:**
```
Type: TXT
Name: resend._domainkey
Value: [long string provided by Resend]

Type: TXT  
Name: @
Value: v=spf1 include:resend.com ~all
```

### Step 4: Add DNS Records to Your Domain
Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

1. Log in to your domain registrar
2. Find DNS settings
3. Add the TXT records provided by Resend
4. Save changes

### Step 5: Verify Domain in Resend
1. Go back to Resend dashboard
2. Click **"Verify"** button
3. Wait for verification (can take 5-60 minutes)
4. Once verified, you'll see a green checkmark ✅

### Step 6: Update Edge Function
After domain is verified, update the Edge Function:

Open: `supabase/functions/send-contact-email/index.ts`

Find this line (appears twice):
```typescript
from: 'Acme <onboarding@resend.dev>',
```

Change to:
```typescript
from: 'NEXAD Support <support@yourdomain.com>',
```

Replace `yourdomain.com` with your verified domain.

### Step 7: Deploy Updated Edge Function
Deploy via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard
2. Select your NEXAD project
3. Click "Edge Functions" → "send-contact-email"
4. Click "Edit"
5. Update the `from` address
6. Click "Deploy"

### Step 8: Test
1. Go to Admin Dashboard
2. Reply to ANY contact (any email address)
3. Should work perfectly! ✅

---

## ALTERNATIVE: USE A SUBDOMAIN

If you don't have a domain, you can use a subdomain:

1. Buy a cheap domain ($10/year)
2. Add subdomain: `mail.yourdomain.com`
3. Verify in Resend
4. Use: `support@mail.yourdomain.com`

---

## OPTION 2: USE FREE RESEND DOMAIN (TEMPORARY)

If you don't want to verify a domain yet, you can use Resend's free domain:

**Keep using:** `onboarding@resend.dev`

**But add verified recipients:**
1. Go to: https://resend.com/settings/emails
2. Add email addresses you want to send to
3. Verify each email address
4. You can then send to those specific addresses

---

## RECOMMENDED APPROACH

**For Production (Recommended):**
- Verify your own domain
- Use: `support@nexad.com` or `noreply@nexad.com`
- Can send to ANY email address
- Professional appearance

**For Testing (Quick Fix):**
- Add verified email addresses in Resend
- Can send to specific addresses only
- Good for testing

---

## AFTER DOMAIN VERIFICATION

Once your domain is verified:
- ✅ Send emails to ANY address
- ✅ No more 403 errors
- ✅ Professional email sender
- ✅ Better deliverability

---

## NEED HELP?

If you don't have a domain:
1. Buy one from: Namecheap, GoDaddy, or Cloudflare
2. Cost: $10-15/year
3. Takes 5 minutes to set up

If you have a domain but need help with DNS:
- Contact your domain registrar support
- They can help add the DNS records

---

## CURRENT STATUS

⚠️ **Resend**: Testing mode (can only send to zitacristel@gmail.com)
✅ **Reply System**: Working (saves to database)
❌ **Email Notifications**: Only works for verified addresses

## AFTER DOMAIN VERIFICATION

✅ **Resend**: Production mode (can send to ANY address)
✅ **Reply System**: Working
✅ **Email Notifications**: Works for ALL addresses

---

**Verifying a domain is the ONLY way to send emails to any address with Resend.**

