// WEBHOOK TEST SCRIPT
// Copy and paste this into your browser console to test the webhook

console.log('🧪 Testing NEXAD Admin Reply Webhook...');
console.log('');

const WEBHOOK_URL = 'https://hook.eu1.make.com/s7wl6b33237xln9t01hiqt1l87md58nr';

const testPayload = {
    type: 'admin_reply',
    contact_name: 'Test User',
    contact_email: 'test@example.com',
    contact_subject: 'Test Subject',
    original_message: 'This is a test original message from the customer.',
    reply_message: 'This is a test reply from the admin. If you see this in Make.com, the webhook is working!',
    admin_email: 'nexad.support@gmail.com',
    replied_at: new Date().toISOString()
};

console.log('📦 Test Payload:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('');
console.log('📤 Sending to webhook:', WEBHOOK_URL);
console.log('');

fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
})
.then(response => {
    console.log('📬 Response Status:', response.status);
    return response.text();
})
.then(text => {
    console.log('📄 Response Body:', text);
    console.log('');
    if (text.includes('Accepted') || text.includes('OK')) {
        console.log('✅ SUCCESS! Webhook received the data!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Go to Make.com');
        console.log('2. You should see "Successfully determined"');
        console.log('3. Click OK to continue');
        console.log('4. Add Gmail module');
        console.log('5. Configure email fields');
        console.log('6. Save and turn ON');
    } else {
        console.log('⚠️ Unexpected response. Check Make.com scenario.');
    }
})
.catch(error => {
    console.error('❌ Error:', error);
    console.log('');
    console.log('Possible issues:');
    console.log('- Webhook URL is incorrect');
    console.log('- Make.com scenario is not running');
    console.log('- Network/CORS issue');
});
