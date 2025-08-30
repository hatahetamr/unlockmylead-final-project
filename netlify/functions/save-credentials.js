const { initializeApp, getApp } = require('firebase-admin/app');
const { getFirestore, doc, setDoc } = require('firebase-admin/firestore');

var app;
try { app = getApp(); } catch (e) { initializeApp(); app = getApp(); }
const db = getFirestore(app);
const appId = "unlock-my-lead";

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { userId, service, credentials } = JSON.parse(event.body);

    if (!userId || !service || !credentials) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
    }

    try {
        const credentialsRef = doc(db, 'artifacts', appId, 'users', userId, 'integrations', service);
        await setDoc(credentialsRef, credentials);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `${service} credentials saved successfully.` }),
        };
    } catch (error) {
        console.error("Error saving credentials:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'A server error occurred.' }),
        };
    }
};
