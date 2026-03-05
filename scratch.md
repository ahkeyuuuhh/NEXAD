BACKENDS TO-DO LIST:
[] Messaging & Communication System: 
    [] Unified message inbox for students
    and teachers showing all conversations (consultation chats, classroom
    announcement replies, teacher inquiries). Consultation-specific chat
    automatically created when teacher accepts a request, with "View Smart Brief"
    and "View Files" shortcuts within the chat interface. Students can reply to
    classroom announcements creating private threads with teachers. Real-time
    message delivery using Supabase Realtime with push notifications for new
    messages. File sharing in chat (PDF/Docx up to 5MB).

MODIFICATIONS NEEDED: 
    [] Accounts: When the account is already signed in as teacher/student it cannot be logged in on another way around. 
    [] The profile pictures must also be fetched so it can appear on the app also and not just a plain letter profile. 


TEACHER'S INTERFACE: 
[] Make the consultation history cards into a dropdown, just like the consultation history of the student's interface so that it would be consistent.


MORE STUDENT INTERFACE UI MODIFICATIONS NEEDED: 
CONSULTATION HISTORY SCREEN: 
[] The background status tag of the consultation history like the "Declined" "Cancelled" must be a pill-shaped and not a plain background so it would look better. 

MY CLASSROOMS SCREEN:
[] Students are not allowed to unenroll other students or their classmates.  They are only allowed to unenroll themseleves.

REQUEST CONSULTATION SCREEN:
[] Make the teacher's name card smaller so it would fit the margin of the screen.

BUG: 
[] I tried requesting a consultation without a file submitted. But the Plagiarism checker detects something, even though there's no file. 
[] The notification is not real-time synced. I tried using 2 devices (One as student and one as teacher) it took over 15 seconds before the notification appeared and It needs to be refreshed. It should be real-time and no-need of refreshing the page. It should also notify on the device itself as it is an application. 
[] When assigning a time and date of the consultation, teacher's should not be able to assign a time/date that is past. For example, today is March 5, 2026, 9:00pm, the teacher's should not be allowed to assigned times like March 5, 2026, below 9:00pm. It must be disabled. 
[] Add a notification sound 
[] If the user logged in and closed the app, they should remained logged in unless they logged out themselves or there's an update to the apk. 
[] The student's interface "My COnsultations" screen must also be added on the navigation (burger menu) option.

GENERAL UI:
[] Add a style on the modals. It's too plain. Make it look better. Like an IOS modal type for reference 
[] Fix the textbox on the private comments. It must not overlap with the device's keyboard, and not got stuck when the keyboard closes. 
[] The opening transition of the burger menus is a bit laggy. make it smoother the IOS transitions/animations 
