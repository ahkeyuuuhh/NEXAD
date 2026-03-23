# 🏗️ NEXAD Real-time Contact System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEXAD Contact System                          │
│                  Real-time Architecture                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐                                    ┌──────────────┐
│   CUSTOMER   │                                    │    ADMIN     │
│              │                                    │              │
│ contact.html │                                    │  admin.html  │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │ 1. Submit Form                                    │ 8. View Dashboard
       │                                                   │
       ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  2. PostgreSQL Database                                │    │
│  │                                                         │    │
│  │  ┌──────────────┐         ┌──────────────────┐        │    │
│  │  │   contacts   │         │ contact_replies  │        │    │
│  │  │              │         │                  │        │    │
│  │  │ • id         │◄────────┤ • contact_id     │        │    │
│  │  │ • name       │         │ • admin_email    │        │    │
│  │  │ • email      │         │ • reply_message  │        │    │
│  │  │ • message    │         │ • sent_at        │        │    │
│  │  │ • status     │         └──────────────────┘        │    │
│  │  │ • created_at │                                     │    │
│  │  └──────────────┘                                     │    │
│  │                                                         │    │
│  │  Row Level Security (RLS):                            │    │
│  │  • Anyone can INSERT contacts                         │    │
│  │  • Only admin can SELECT/UPDATE/DELETE                │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          │ 3. Trigger                           │
│                          ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  4. Realtime Subscription                              │    │
│  │                                                         │    │
│  │  • Listens to INSERT/UPDATE/DELETE                     │    │
│  │  • Broadcasts changes to subscribed clients            │    │
│  │  • WebSocket connection                                │    │
│  │  • Instant updates (< 100ms latency)                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          │ 9. Real-time Event                   │
│                          ▼                                      │
│                    Admin Dashboard                              │
│                    (Instant Update)                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  5. Edge Function: send-contact-email                  │    │
│  │                                                         │    │
│  │  Triggered by: Application                             │    │
│  │  Purpose: Send emails                                  │    │
│  │                                                         │    │
│  │  Functions:                                            │    │
│  │  • notify_admin_new_contact()                          │    │
│  │  • send_reply_to_customer()                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ 6. HTTP Request
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SERVICE                                 │
│                  (Resend or Gmail SMTP)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Email Templates                                       │    │
│  │                                                         │    │
│  │  1. Admin Notification:                                │    │
│  │     • New contact alert                                │    │
│  │     • Contact details                                  │    │
│  │     • Link to admin panel                              │    │
│  │                                                         │    │
│  │  2. Customer Reply:                                    │    │
│  │     • Admin's reply message                            │    │
│  │     • Original message context                         │    │
│  │     • Professional formatting                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────┬───────────────────────┬───────────────────────┘
                   │                       │
                   │ 7. Send Email         │ 10. Send Email
                   ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │  Admin's Gmail   │    │ Customer's Email │
         │                  │    │                  │
         │ nexad.support@   │    │ customer@        │
         │ gmail.com        │    │ example.com      │
         └──────────────────┘    └──────────────────┘
```

---

## Data Flow Diagrams

### 1. Contact Submission Flow

```
Customer                 Frontend              Supabase DB          Edge Function        Email Service        Admin
   │                        │                       │                    │                    │               │
   │ Fill Form              │                       │                    │                    │               │
   ├───────────────────────>│                       │                    │                    │               │
   │                        │                       │                    │                    │               │
   │ Click Submit           │                       │                    │                    │               │
   ├───────────────────────>│                       │                    │                    │               │
   │                        │                       │                    │                    │               │
   │                        │ INSERT contact        │                    │                    │               │
   │                        ├──────────────────────>│                    │                    │               │
   │                        │                       │                    │                    │               │
   │                        │ Contact saved         │                    │                    │               │
   │                        │<──────────────────────┤                    │                    │               │
   │                        │                       │                    │                    │               │
   │                        │ Invoke function       │                    │                    │               │
   │                        ├───────────────────────┼───────────────────>│                    │               │
   │                        │                       │                    │                    │               │
   │                        │                       │                    │ Send email         │               │
   │                        │                       │                    ├───────────────────>│               │
   │                        │                       │                    │                    │               │
   │                        │                       │                    │                    │ Deliver email │
   │                        │                       │                    │                    ├──────────────>│
   │                        │                       │                    │                    │               │
   │                        │                       │ Realtime event     │                    │               │ 🔔
   │                        │                       ├────────────────────┼────────────────────┼──────────────>│
   │                        │                       │                    │                    │               │
   │ Success message        │                       │                    │                    │               │
   │<───────────────────────┤                       │                    │                    │               │
   │                        │                       │                    │                    │               │
```

### 2. Real-time Update Flow

```
Admin Dashboard          Supabase Realtime         Database              New Contact
       │                        │                       │                      │
       │ Subscribe to changes   │                       │                      │
       ├───────────────────────>│                       │                      │
       │                        │                       │                      │
       │ Subscription active    │                       │                      │
       │<───────────────────────┤                       │                      │
       │                        │                       │                      │
       │                        │                       │ INSERT new contact   │
       │                        │                       │<─────────────────────┤
       │                        │                       │                      │
       │                        │ Broadcast INSERT      │                      │
       │                        │<──────────────────────┤                      │
       │                        │                       │                      │
       │ Receive event          │                       │                      │
       │<───────────────────────┤                       │                      │
       │                        │                       │                      │
       │ Update UI              │                       │                      │
       │ (no refresh!)          │                       │                      │
       │                        │                       │                      │
       │ Show notification 🔔   │                       │                      │
       │                        │                       │                      │
```

### 3. Reply Flow

```
Admin                   Frontend              Database            Edge Function        Email Service        Customer
  │                        │                       │                    │                    │               │
  │ Click Reply            │                       │                    │                    │               │
  ├───────────────────────>│                       │                    │                    │               │
  │                        │                       │                    │                    │               │
  │ Type message           │                       │                    │                    │               │
  ├───────────────────────>│                       │                    │                    │               │
  │                        │                       │                    │                    │               │
  │ Click Send             │                       │                    │                    │               │
  ├───────────────────────>│                       │                    │                    │               │
  │                        │                       │                    │                    │               │
  │                        │ INSERT reply          │                    │                    │               │
  │                        ├──────────────────────>│                    │                    │               │
  │                        │                       │                    │                    │               │
  │                        │ Reply saved           │                    │                    │               │
  │                        │<──────────────────────┤                    │                    │               │
  │                        │                       │                    │                    │               │
  │                        │ Invoke function       │                    │                    │               │
  │                        ├───────────────────────┼───────────────────>│                    │               │
  │                        │                       │                    │                    │               │
  │                        │                       │                    │ Send reply email   │               │
  │                        │                       │                    ├───────────────────>│               │
  │                        │                       │                    │                    │               │
  │                        │                       │                    │                    │ Deliver email │
  │                        │                       │                    │                    ├──────────────>│
  │                        │                       │                    │                    │               │
  │                        │ UPDATE status         │                    │                    │               │ 📧
  │                        ├──────────────────────>│                    │                    │               │
  │                        │                       │                    │                    │               │
  │ Success notification   │                       │                    │                    │               │
  │<───────────────────────┤                       │                    │                    │               │
  │                        │                       │                    │                    │               │
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  contact.html    │         │   admin.html     │             │
│  │                  │         │                  │             │
│  │  • Google OAuth  │         │  • Google OAuth  │             │
│  │  • Form UI       │         │  • Dashboard UI  │             │
│  │  • Validation    │         │  • Contact list  │             │
│  └────────┬─────────┘         │  • Reply modal   │             │
│           │                   │  • Statistics    │             │
│           │                   └────────┬─────────┘             │
│           │                            │                        │
│           ▼                            ▼                        │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  contact.js      │         │   admin.js       │             │
│  │                  │         │                  │             │
│  │  • Auth logic    │         │  • Auth logic    │             │
│  │  • Form submit   │         │  • Load contacts │             │
│  │  • DB insert     │         │  • Realtime sub  │             │
│  │  • Email trigger │         │  • Reply logic   │             │
│  └──────────────────┘         │  • Status update │             │
│                                └──────────────────┘             │
│                                                                  │
└──────────────────────┬──────────────────┬────────────────────────┘
                       │                  │
                       ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Authentication                                        │    │
│  │  • Google OAuth provider                               │    │
│  │  • JWT tokens                                          │    │
│  │  • Session management                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL)                                 │    │
│  │  • contacts table                                      │    │
│  │  • contact_replies table                               │    │
│  │  • RLS policies                                        │    │
│  │  • Indexes                                             │    │
│  │  • Triggers                                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Realtime Engine                                       │    │
│  │  • WebSocket server                                    │    │
│  │  • Change data capture                                 │    │
│  │  • Broadcast system                                    │    │
│  │  • Subscription management                             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Edge Functions (Deno)                                 │    │
│  │  • send-contact-email                                  │    │
│  │  • Email templates                                     │    │
│  │  • Error handling                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Email Service (Resend / Gmail SMTP)                   │    │
│  │  • SMTP server                                         │    │
│  │  • Email delivery                                      │    │
│  │  • Bounce handling                                     │    │
│  │  • Delivery tracking                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├─ HTTPS/TLS encryption
├─ CORS policies
└─ Rate limiting

Layer 2: Authentication
├─ Google OAuth 2.0
├─ JWT tokens
├─ Session management
└─ Email verification

Layer 3: Authorization (RLS)
├─ contacts table:
│  ├─ INSERT: Anyone (anon, authenticated)
│  ├─ SELECT: Admin only
│  ├─ UPDATE: Admin only
│  └─ DELETE: Admin only
│
└─ contact_replies table:
   ├─ INSERT: Admin only
   └─ SELECT: Admin only

Layer 4: Data Validation
├─ Input sanitization
├─ SQL injection prevention
├─ XSS protection
└─ CSRF protection

Layer 5: Application Security
├─ Environment variables
├─ API key protection
├─ Error handling
└─ Logging
```

---

## Performance Characteristics

### Latency:
- Contact submission: ~200-500ms
- Real-time update: <100ms
- Email delivery: 1-3 seconds
- Database query: 10-50ms

### Scalability:
- Concurrent users: 1000+
- Contacts/month: Unlimited
- Realtime connections: 500 (free tier)
- Email throughput: 3000/month (Resend free)

### Reliability:
- Database uptime: 99.9%
- Realtime uptime: 99.9%
- Email delivery: 99%+
- Automatic reconnection
- Error recovery

---

## Technology Stack

### Frontend:
- HTML5
- CSS3 (Custom)
- JavaScript (ES6+)
- Supabase JS Client

### Backend:
- Supabase (BaaS)
- PostgreSQL 15
- Deno (Edge Functions)
- WebSockets (Realtime)

### Email:
- Resend API
- Gmail SMTP (alternative)
- HTML email templates

### Infrastructure:
- Supabase Cloud
- CDN (Supabase)
- Edge network
- Global distribution

---

This architecture provides a robust, scalable, and maintainable solution for real-time contact management with email notifications!
