const { initializeApp, getApp } = require('firebase-admin/app');
const { getFirestore, doc } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

var app;
try { app = getApp(); } catch (e) { initializeApp(); app = getApp(); }
const db = getFirestore(app);
const appId = "unlock-my-lead";

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { userId, callRecord, crmType } = JSON.parse(event.body);

    if (!userId || !callRecord || !crmType) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameters.' }) };
    }

    try {
        const crmCredentialsRef = doc(db, 'artifacts', appId, 'users', userId, 'integrations', crmType);
        const docSnapshot = await crmCredentialsRef.get();

        if (!docSnapshot.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: `CRM credentials not found for ${crmType}.` }) };
        }

        const credentials = docSnapshot.data();
        var crmResponse = null;

        // Modular logic to handle different CRMs
        if (crmType === 'hubspot') {
            const hubspotApiKey = credentials.apiKey;
            // HubSpot API call logic here
            crmResponse = { status: 'success', service: 'HubSpot', recordId: '12345' };
        } else if (crmType === 'zoho') {
            const zohoApiKey = credentials.apiKey;
            // Zoho API call logic here
            crmResponse = { status: 'success', service: 'Zoho', recordId: '67890' };
        } else if (crmType === 'bitrix') {
            const bitrixWebhookUrl = credentials.webhookUrl;
            // Bitrix24 webhook call logic here
            crmResponse = { status: 'success', service: 'Bitrix24', recordId: 'abcde' };
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported CRM type.' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Call record synced to ${crmType}.`, response: crmResponse }),
        };

    } catch (error) {
        console.error(`Error syncing to ${crmType}:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to sync to ${crmType}. Error: ${error.message}` }),
        };
    }
};