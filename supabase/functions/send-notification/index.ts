/**
 * NEXAD — send-notification Edge Function
 *
 * Triggered by a Supabase Database Webhook on:
 *   Table: public.notifications
 *   Events: INSERT
 *
 * What it does:
 *   1. Reads the new notification row from the webhook payload
 *   2. Looks up the recipient's active Expo push tokens from push_tokens
 *   3. Calls the Expo Push API to deliver a native device notification
 *   4. Looks up the recipient's email from auth.users (service role)
 *   5. Sends an email via Resend
 *
 * Required Edge Function secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL          – your project URL  (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY – service role secret (NOT the anon key)
 *   RESEND_API_KEY        – from resend.com (free tier is fine)
 *   FROM_EMAIL            – verified sender address in Resend (e.g. noreply@yourdomain.com)
 *
 * Deployment (run once from your terminal):
 *   supabase functions deploy send-notification --project-ref <your-project-ref>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  consultation_request_id?: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: NotificationRow;
  old_record: NotificationRow | null;
}

interface PushToken {
  token: string;
}

// ─── Expo Push ────────────────────────────────────────────────────────────

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!tokens.length) return;

  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    badge: 1,
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await res.json();
  console.log('[Push] Expo API response:', JSON.stringify(result));
}

// ─── Email via Resend ────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  resendKey: string,
  fromEmail: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#202124;margin-bottom:8px">${subject}</h2>
          <p style="color:#5F6368;font-size:15px;line-height:1.5">${body}</p>
          <hr style="border:none;border-top:1px solid #E8EAED;margin:24px 0"/>
          <p style="color:#BCC0C6;font-size:12px">
            You received this email because you have notifications enabled in NEXAD.
          </p>
        </div>
      `,
    }),
  });

  const result = await res.json();
  console.log('[Email] Resend response:', JSON.stringify(result));
}

// ─── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Supabase Database Webhooks use POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only act on INSERT events
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response('Ignored', { status: 200 });
    }

    const notif = payload.record;
    const { user_id, title, message, type, related_id, consultation_request_id } = notif;

    // ── Supabase admin client (service role — bypasses RLS) ──────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey   = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail   = Deno.env.get('FROM_EMAIL') ?? 'noreply@nexad.app';

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ── 1. Expo Push ──────────────────────────────────────────────────────
    // Push is sent client-side so it reaches the student's device even when
    // their app is fully closed (teacher's device calls Expo Push API directly).
    // The Edge Function only handles email here to avoid duplicate pushes.
    console.log('[Push] Skipped — handled client-side for killed-app reliability');

    // ── 2. Email (only if Resend is configured) ───────────────────────────
    if (resendKey) {
      // Look up the user's email via the auth admin API
      const { data: authUser, error: authError } = await admin.auth.admin.getUserById(user_id);

      if (!authError && authUser?.user?.email) {
        const email = authUser.user.email;
        await sendEmail(email, title, message, resendKey, fromEmail);
      } else {
        console.log('[Email] Could not find email for user', user_id, authError?.message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-notification] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
