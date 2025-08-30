const twilio = require('twilio');
const { initializeApp, getApp } = require('firebase-admin/app');
const { getFirestore, doc } = require('firebase-admin/firestore');

var app;
try { app = getApp(); } catch (e) { initializeApp(); app = getApp(); }
const db = getFirestore(app);
const appId = "unlock-my-lead";

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { targetPhoneNumber, script, userId, language, tone } = JSON.parse(event.body);

    if (!userId || !targetPhoneNumber || !script) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
    }

    try {
        // Retrieve the user's personal Twilio credentials from Firestore
        const twilioCredentialsRef = doc(db, 'artifacts', appId, 'users', userId, 'integrations', 'twilio');
        const docSnapshot = await twilioCredentialsRef.get();

        if (!docSnapshot.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Twilio credentials not found for this user. Please connect your account in Settings.' }) };
        }

        const credentials = docSnapshot.data();
        const client = twilio(credentials.accountSid, credentials.authToken);

        // Make the Twilio AI call with language and tone options
        const call = await client.calls.create({
            twiml: `<Response><Say voice="${tone}" language="${language}">${script}</Say></Response>`,
            to: targetPhoneNumber,
            from: credentials.phoneNumber,
        });

        // Return a success response
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Call initiated to ${targetPhoneNumber} with SID: ${call.sid}` }),
        };

    } catch (error) {
        console.error("Twilio API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to initiate call. Error: ${error.message}` }),
        };
    }
};
          Add Twilio AI calling backend function

