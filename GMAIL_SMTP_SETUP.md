# 📧 Alternative: Gmail SMTP Setup (Simpler for Testing)

If you want to use Gmail SMTP instead of Resend, follow this guide.

---

## 🔧 Step 1: Enable Gmail App Password

### 1.1 Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Sign in with `nexad.support@gmail.com`
3. Find "2-Step Verification"
4. Click "Get Started" and follow the setup

### 1.2 Create App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device
4. Enter "NEXAD Contact System"
5. Click "Generate"
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
7. Save it securely

---

## 📝 Step 2: Update Edge Function for Gmail

Create a new file: `supabase/functions/send-contact-email-gmail/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const GMAIL_USER = 'nexad.support@gmail.com'
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') || ''

interface ContactEmailData {
  type: 'new_contact' | 'reply_to_customer'
  contact: {
    id: string
    name: string
    email: string
    message: string
    subject?: string
  }
  reply?: {
    message: string
  }
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const { type, contact, reply }: ContactEmailData = await req.json()

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    })

    if (type === 'new_contact') {
      // Send notification to admin
      await client.send({
        from: GMAIL_USER,
        to: GMAIL_USER,
        subject: `New Contact: ${contact.subject || 'General Inquiry'} - ${contact.name}`,
        content: `
          New contact form submission:
          
          From: ${contact.name}
          Email: ${contact.email}
          Subject: ${contact.subject || 'General Inquiry'}
          
          Message:
          ${contact.message}
          
          ---
          View in admin panel: https://yourdomain.com/admin.html
        `,
        html: generateAdminEmailHTML(contact),
      })
    } else if (type === 'reply_to_customer') {
      // Send reply to customer
      await client.send({
        from: GMAIL_USER,
        to: contact.email,
        subject: `Re: ${contact.subject || 'Your NEXAD Inquiry'}`,
        content: `
          Hi ${contact.name},
          
          Thank you for contacting NEXAD. Here's our response:
          
          ${reply!.message}
          
          ---
          Your original message:
          ${contact.message}
          
          Best regards,
          NEXAD Support Team
        `,
        html: generateCustomerReplyHTML(contact, reply!),
      })
    }

    await client.close()

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    )
  }
})

function generateAdminEmailHTML(contact: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #667eea; }
        .message-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔔 New Contact Form Submission</h2>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="label">From:</span> ${contact.name}
          </div>
          <div class="info-row">
            <span class="label">Email:</span> ${contact.email}
          </div>
          ${contact.subject ? `<div class="info-row"><span class="label">Subject:</span> ${contact.subject}</div>` : ''}
          <div class="info-row">
            <span class="label">Received:</span> ${new Date().toLocaleString()}
          </div>
          
          <div class="message-box">
            <strong>Message:</strong><br>
            ${contact.message.replace(/\n/g, '<br>')}
          </div>
          
          <a href="https://yourdomain.com/admin.html" class="button">View in Admin Panel</a>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateCustomerReplyHTML(contact: any, reply: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .reply-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .original-message { background: #f0f0f0; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📧 Reply from NEXAD Support</h2>
        </div>
        <div class="content">
          <p>Hi ${contact.name},</p>
          <p>Thank you for contacting NEXAD. Here's our response to your inquiry:</p>
          
          <div class="reply-box">
            ${reply.message.replace(/\n/g, '<br>')}
          </div>
          
          <div class="original-message">
            <strong>Your original message:</strong><br>
            ${contact.message.replace(/\n/g, '<br>')}
          </div>
          
          <p>If you have any further questions, feel free to reply to this email.</p>
          
          <p>Best regards,<br>NEXAD Support Team</p>
        </div>
        <div class="footer">
          <p>This email was sent from NEXAD Support (nexad.support@gmail.com)</p>
        </div>
      </div>
    </body>
    </html>
  `
}
```

---

## 🚀 Step 3: Deploy Gmail Function

```bash
# Set Gmail app password
supabase secrets set GMAIL_APP_PASSWORD="your 16 character password"

# Deploy the function
supabase functions deploy send-contact-email-gmail
```

---

## 🔧 Step 4: Update Contact.js

In `nexad-website/scripts/contact.js`, change the function name:

```javascript
// Line ~220: Change function name
const emailResponse = await supabase.functions.invoke('send-contact-email-gmail', {
    body: {
        type: 'new_contact',
        contact: {
            id: data.id,
            name: contactData.name,
            email: contactData.email,
            message: contactData.message,
            subject: contactData.subject
        }
    }
});
```

---

## 🔧 Step 5: Update Admin.js

In `nexad-website/scripts/admin.js`, change the function name:

```javascript
// Line ~XXX: Change function name in sendReply function
const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contact-email-gmail', {
    body: {
        type: 'reply_to_customer',
        contact: {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            message: contact.message,
            subject: contact.subject
        },
        reply: {
            message: replyMessage
        }
    }
});
```

---

## ✅ Advantages of Gmail SMTP

- ✅ No need for external email service
- ✅ Use your existing Gmail account
- ✅ Free (up to 500 emails/day)
- ✅ Familiar interface
- ✅ Reliable delivery

---

## ⚠️ Limitations

- ⚠️ Limited to 500 emails/day
- ⚠️ Slower than dedicated email services
- ⚠️ May trigger spam filters more easily
- ⚠️ Requires 2FA and app password setup

---

## 🧪 Testing

Same testing steps as in REALTIME_SYSTEM_SETUP.md, but:
- Emails will come from `nexad.support@gmail.com`
- Check Gmail sent folder to verify emails were sent
- Check spam folder if emails don't arrive

---

## 💡 Recommendation

- **For Testing**: Use Gmail SMTP (this guide)
- **For Production**: Use Resend (REALTIME_SYSTEM_SETUP.md)

Resend is more reliable, faster, and has better deliverability for production use.
