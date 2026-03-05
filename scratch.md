ONE LAST FEATURE OF THIS APP:
    [] Unified Messaging System: 
        [] Unified Data Model: 
            Conversation Types: Define a conversations table with a type enum: CONSULTATION, ANNOUNCEMENT_THREAD, or INQUIRY.

            Automatic Thread Creation: * Consultations: When a teacher status updates to ACCEPTED in the consultation_requests table, automatically insert a new row into conversations.

            Announcements: When a student replies to a global announcement, create a unique conversation_id linked to that announcement_id and the student_id (Private Thread).

            Participants: Use a conversation_participants table to link multiple users (Teacher/Student) to a single chat.
        [] Messaging UI & Shortcuts:
            Inbox: A single view fetching all conversations where the current user_id is a participant, sorted by last_message_at.Contextual Shortcuts: Within the chat interface, if type == 'CONSULTATION', display persistent action buttons:View Smart Brief: Deep link to the consultation summary.View Files: Filtered view of all attachments sent within that specific conversation_id.File Handling: Support PDF/Docx uploads. Validate file size ($< 5\text{MB}$) via client-side logic and Supabase Storage bucket policies.
        [] Real-time and System Notifications:
            Supabase Realtime: Enable REPLICA identity on the messages table. The frontend must subscribe to INSERT changes on messages where conversation_id matches the active chat.

            Push Notifications: Create a Supabase Database Webhook on the messages table. On every INSERT, trigger an Edge Function to:

            Identify the recipient(s) not currently "active" in the chat.

            Send a push notification via FCM/OneSignal.

            Send an Email Notification (via Resend/SMTP) if the user is offline.

==============================================================
GENERAL UI:
    [] Add a style on the modals. It's too plain. Make it look better. Like an IOS modal type for reference 
    [] Fix the textbox on the private comments. It must not overlap with the device's keyboard, and not got stuck when the keyboard closes. 
    [] The opening transition of the burger menus is a bit laggy. make it smoother the IOS transitions/animations 
    [] The background of the burger menu panel must be a translucent blurry and a bit greyish so it won't look too plain. 
    [] All white plain background cards must look translucent and has a glass effect so it would compliment the background of the screen and won't look to plain also. 
    [] Fix the transition of the screens/pages (Because sometime when I go to another screen, the transition of the screen is overlapping and it does not look good). Make it smooth and consistent. Like add some fading animation or anything that would mock an IOS. 
    
==========================================================
NOTIFICATION MODIFICATIONS:
    [] In-App Sync: Use Supabase Realtime (Postgres Changes) to listen to the notifications table. When a new row is inserted (enrollment, comment, or file submission), the UI should immediately update the burger menu bubble.

    [] Device-Level Notifications: Since Supabase doesn't send 'Push Notifications' directly to iOS/Android trays, please set up a Supabase Edge Function. This function should be triggered by a Database Webhook whenever a new notification is created, sending the payload to a provider like Firebase Cloud Messaging (FCM) or OneSignal.

    [] Email via Google SSO: Use a Supabase Edge Function (or an integration like Resend/SendGrid) to trigger an email to the user's auth.users email address whenever a notification is generated.

    []  Logic: Can you provide the Database Webhook configuration and the Edge Function structure needed to bridge the database to both FCM (for the device) and the Email provider?"
