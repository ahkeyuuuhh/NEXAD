# 📧 Reply System Flow Diagram

## 🔄 Complete Email Reply Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER SUBMITS CONTACT                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Contact Form    │
                    │  (contact.html)  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Supabase DB    │
                    │ contacts table   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Admin Panel     │
                    │  Shows Contact   │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN CLICKS "REPLY" BUTTON                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Reply Modal     │
                    │  Opens (Form)    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Admin Types     │
                    │  Reply Message   │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ADMIN CLICKS "SEND REPLY"                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  JavaScript      │
                    │  sendReply()     │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────────┐  ┌──────────────────┐
          │  Save to DB      │  │  Call Supabase   │
          │ contact_replies  │  │  Edge Function   │
          └──────────────────┘  └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │ send-contact-    │
                    │         │ email/index.ts   │
                    │         └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │  Reads API Key   │
                    │         │ RESEND_API_KEY   │
                    │         └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │  Calls Resend    │
                    │         │  API             │
                    │         └──────────────────┘
                    │                   │
                    │                   ▼
                    │         ┌──────────────────┐
                    │         │  Resend Sends    │
                    │         │  Email           │
                    │         └──────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Update Contact  │
                    │  status='replied'│
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Show Success    │
                    │  Notification    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Refresh Contact │
                    │  List            │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CUSTOMER RECEIVES EMAIL IN INBOX                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Components

### 1. Frontend (Admin Panel)
- **File**: `nexad-website/admin.html`
- **Script**: `nexad-website/scripts/admin.js`
- **Styles**: `nexad-website/styles/admin.css`
- **Function**: `openReplyModal()` - Opens reply form
- **Function**: `sendReply()` - Sends reply to backend

### 2. Backend (Supabase Edge Function)
- **File**: `supabase/functions/send-contact-email/index.ts`
- **Purpose**: Handles email sending via Resend API
- **Environment Variable**: `RESEND_API_KEY`

### 3. Database (Supabase)
- **Table**: `contacts` - Stores contact submissions
- **Table**: `contact_replies` - Stores admin replies
- **Status Field**: Tracks reply status (unread/read/replied)

### 4. Email Service (Resend)
- **API**: https://api.resend.com/emails
- **Authentication**: Bearer token (API key)
- **Free Tier**: 100 emails/day

---

## 📊 Data Flow

### Contact Submission
```javascript
{
  id: "uuid",
  name: "John Doe",
  email: "john@example.com",
  message: "I need help with...",
  subject: "General Inquiry",
  status: "unread",
  created_at: "2024-03-23T10:00:00Z"
}
```

### Admin Reply
```javascript
{
  id: "uuid",
  contact_id: "contact-uuid",
  admin_email: "nexad.support@gmail.com",
  reply_message: "Thank you for contacting us...",
  created_at: "2024-03-23T10:30:00Z"
}
```

### Email Payload to Resend
```javascript
{
  from: "NEXAD Support <onboarding@resend.dev>",
  to: ["john@example.com"],
  subject: "Re: General Inquiry",
  html: "<html>...</html>",
  reply_to: "nexad.support@gmail.com"
}
```

---

## 🔐 Security & Authentication

### Admin Authentication
1. User clicks "Sign in with Google"
2. OAuth flow redirects to Google
3. Google returns access token
4. Supabase verifies token
5. Check if email is `nexad.support@gmail.com`
6. If yes → Show dashboard
7. If no → Deny access

### API Key Security
- Stored as Supabase secret (not in code)
- Only accessible by Edge Functions
- Never exposed to frontend
- Encrypted at rest

---

## ⚡ Performance

### Response Times
- Modal opens: **Instant** (< 50ms)
- Save to database: **~200ms**
- Send email: **~500-1000ms**
- Total time: **~1-2 seconds**

### Optimization
- Async operations (don't block UI)
- Real-time updates (no page refresh)
- Error handling (graceful failures)
- Loading states (user feedback)

---

## 🎨 User Experience

### Admin Sees:
1. Contact list with status badges
2. "Reply" button on each contact
3. Modal with reply form
4. Loading state while sending
5. Success notification
6. Updated contact status (green "Replied" badge)

### Customer Receives:
1. Professional HTML email
2. Admin's reply message
3. Their original message (for context)
4. NEXAD branding
5. Reply-to address for follow-ups

---

## 🔍 Error Handling

### Possible Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Database connection not available" | Not logged in | Log in to admin panel |
| "Email failed to send" | Missing API key | Add RESEND_API_KEY to Supabase |
| "Failed to send email: 401" | Invalid API key | Check API key in Resend |
| "Failed to send email: 429" | Rate limit exceeded | Wait or upgrade Resend plan |
| Modal doesn't open | JavaScript error | Check browser console |

---

## 📈 Monitoring

### Check Email Delivery
1. **Resend Dashboard**: See all sent emails
2. **Supabase Logs**: View function execution logs
3. **Database**: Query `contact_replies` table

### View Logs
```bash
# Real-time Edge Function logs
supabase functions logs send-contact-email --follow

# Recent logs
supabase functions logs send-contact-email
```

---

## 🚀 Deployment Checklist

- [ ] Resend account created
- [ ] API key generated
- [ ] API key added to Supabase secrets
- [ ] Edge Function deployed
- [ ] Admin panel accessible
- [ ] Test contact submitted
- [ ] Test reply sent
- [ ] Email received
- [ ] Status updated to "replied"

---

## 💡 Future Enhancements

### Possible Improvements
- [ ] Email templates (multiple types)
- [ ] File attachments support
- [ ] Email scheduling (send later)
- [ ] Canned responses (quick replies)
- [ ] Email tracking (opens, clicks)
- [ ] Bulk reply (multiple contacts)
- [ ] Email threading (conversation view)
- [ ] Auto-responses (acknowledgments)

---

## 📚 Related Files

- `RESEND_API_KEY_SETUP.md` - Detailed API key setup
- `ADMIN_REPLY_FORM_UPDATE.md` - What changed in this update
- `QUICK_API_KEY_SETUP.md` - 2-minute quick start
- `nexad-website/scripts/admin.js` - Frontend logic
- `supabase/functions/send-contact-email/index.ts` - Backend logic

---

**System is ready!** Just add your Resend API key and start replying to contacts. 🎉
