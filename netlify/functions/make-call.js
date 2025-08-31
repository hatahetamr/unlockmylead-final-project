const twilio = require('twilio');
const { initializeApp, getApp } = require('firebase-admin/app');
const { getFirestore, doc } = require('firebase-admin/firestore');

var app;
try { 
    app = getApp(); 
} catch (e) { 
    initializeApp(); 
    app = getApp(); 
}
const db = getFirestore(app);
const appId = "unlock-my-lead";

exports.handler = async (event, context) => {
    console.log('Make-call function invoked with method:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
        console.log('Invalid HTTP method:', event.httpMethod);
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }) 
        };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
        console.log('Parsed request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Invalid JSON in request body' }) 
        };
    }

    const { targetPhoneNumber, script, userId, language, tone } = requestBody;

    // Enhanced parameter validation
    if (!userId) {
        console.error('Missing userId parameter');
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing required parameter: userId' }) 
        };
    }
    
    if (!targetPhoneNumber) {
        console.error('Missing targetPhoneNumber parameter');
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing required parameter: targetPhoneNumber' }) 
        };
    }
    
    if (!script) {
        console.error('Missing script parameter');
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Missing required parameter: script' }) 
        };
    }

    console.log(`Processing call request for user: ${userId}, target: ${targetPhoneNumber}`);

    try {
        // Retrieve the user's personal Twilio credentials from Firestore
        const twilioCredentialsRef = doc(db, 'artifacts', appId, 'users', userId, 'integrations', 'twilio');
        console.log('Fetching Twilio credentials from Firestore...');
        
        const docSnapshot = await twilioCredentialsRef.get();

        if (!docSnapshot.exists) {
            console.error('Twilio credentials not found for user:', userId);
            return { 
                statusCode: 404, 
                body: JSON.stringify({ 
                    error: 'Twilio credentials not found for this user. Please connect your account in Settings.' 
                }) 
            };
        }

        const credentials = docSnapshot.data();
        console.log('Twilio credentials retrieved successfully');
        
        // Validate credentials
        if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
            console.error('Incomplete Twilio credentials for user:', userId);
            return { 
                statusCode: 400, 
                body: JSON.stringify({ 
                    error: 'Incomplete Twilio credentials. Please reconnect your account in Settings.' 
                }) 
            };
        }

        // Initialize Twilio client
        console.log('Initializing Twilio client...');
        const client = twilio(credentials.accountSid, credentials.authToken);

        // Prepare TwiML with enhanced language and voice support
        const voiceAttribute = tone ? `voice="${tone}"` : '';
        const languageAttribute = language ? `language="${language}"` : '';
        const twimlResponse = `<Response><Say ${voiceAttribute} ${languageAttribute}>${script}</Say></Response>`;
        
        console.log('TwiML prepared:', twimlResponse);

        // Make the Twilio AI call
        console.log('Initiating Twilio call...');
        const call = await client.calls.create({
            twiml: twimlResponse,
            to: targetPhoneNumber,
            from: credentials.phoneNumber,
        });

        console.log('Call initiated successfully with SID:', call.sid);

        // Return a success response
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: `Call initiated successfully to ${targetPhoneNumber}`,
                callSid: call.sid,
                status: call.status
            }),
        };

    } catch (error) {
        console.error("Twilio API Error:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            moreInfo: error.moreInfo,
            status: error.status
        });
        
        // Enhanced error response based on error type
        let errorMessage = 'Failed to initiate call';
        let statusCode = 500;
        
        if (error.code === 21211) {
            errorMessage = 'Invalid phone number format';
            statusCode = 400;
        } else if (error.code === 21212) {
            errorMessage = 'Invalid Twilio phone number';
            statusCode = 400;
        } else if (error.code === 20003) {
            errorMessage = 'Authentication failed - please check your Twilio credentials';
            statusCode = 401;
        } else if (error.code === 21606) {
            errorMessage = 'Phone number is not verified for trial account';
            statusCode = 400;
        }
        
        return {
            statusCode: statusCode,
            body: JSON.stringify({ 
                error: errorMessage,
                details: error.message,
                twilioCode: error.code
            }),
        };
    }
};
