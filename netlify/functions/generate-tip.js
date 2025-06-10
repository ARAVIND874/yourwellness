// இது ஒரு Netlify Function எடுத்துக்காட்டு, Google Gemini API ஐப் பயன்படுத்துகிறது
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
    // Netlify Function துவங்கும் நேரம்
    console.log('Netlify Function started at:', new Date().toISOString());

    // POST கோரிக்கைகளை மட்டும் அனுமதிக்கவும்
    if (event.httpMethod !== 'POST') {
        console.log('Method not allowed:', event.httpMethod);
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        const { prompt, model: requestedModel } = JSON.parse(event.body); // model ஐப் பெறுகிறோம்
        console.log('Received prompt:', prompt); // உள்வரும் ப்ராம்ப்ட்டைப் பதிவு செய்கிறோம்
        console.log('Requested AI Model:', requestedModel || 'Not Specified (defaulting to gemini-1.5-flash)'); // கோரப்பட்ட மாதிரியைப் பதிவு செய்கிறோம்

        if (!prompt) {
            console.log('Error: Prompt is required');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Prompt is required' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // 1. GEMINI_API_KEY environment variable ஐ அணுகி பதிவு செய்கிறோம்
        const API_KEY = process.env.GEMINI_API_KEY;
        console.log('Attempting to access API Key. Key presence:', !!API_KEY); // API Key உள்ளதா இல்லையா என்பதைக் காட்டுகிறது (true/false)
        // Production சூழலில் API Key ஐ நேரடியாக பதிவு செய்ய வேண்டாம்!
        // இது வெறும் பிழைத்திருத்தத்திற்காக மட்டுமே.
        // console.log('API Key (first 5 chars):', API_KEY ? API_KEY.substring(0, 5) + '...' : 'Not Found');

        // 2. API Key இல்லையெனில் ஒரு பிழையை வழங்குகிறோம்
        if (!API_KEY) {
            console.error('CRITICAL ERROR: GEMINI_API_KEY is not set as an environment variable in Netlify!');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: Gemini API Key is missing. Please contact support.' }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // Google Generative AI ஐ துவக்கவும்
        const genAI = new GoogleGenerativeAI(API_KEY);
        // HTML இல் நீங்கள் gemini-pro-vision ஐ அனுப்பியிருந்தாலும்,
        // உரை உருவாக்கத்திற்கு gemini-1.5-flash அல்லது gemini-pro பொதுவாகப் பொருத்தமானது.
        // இங்கு, அனுப்பப்பட்ட மாதிரியைப் பயன்படுத்தலாம் அல்லது ஒரு இயல்புநிலையை அமைக்கலாம்.
        const modelToUse = requestedModel === 'gemini-pro-vision' ? 'gemini-1.5-flash' : (requestedModel || 'gemini-1.5-flash'); // vision க்கு flash ஐ மாற்றுகிறோம்

        const geminiModel = genAI.getGenerativeModel({ model: modelToUse });

        console.log('Calling Gemini API with model:', modelToUse);
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Gemini API அழைப்பு வெற்றிகரமாக முடிந்தது. உருவாக்கப்பட்ட உரையின் நீளம்:', text.length);

        return {
            statusCode: 200,
            body: JSON.stringify({ tip: text }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error('Netlify Function இல் பிழை:', error); // முழு பிழைப் பொருளையும் பதிவு செய்கிறோம்
        console.error('பிழைச் செய்தி:', error.message); // பிழைச் செய்தியைப் பதிவு செய்கிறோம்
        
        let errorMessage = 'உதவிக்குறிப்பை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.';
        
        // API key சம்பந்தமான குறிப்பிட்ட பிழைகளைக் கண்டறியவும்
        if (error.message && error.message.includes('API key not valid')) {
            console.error('Google Gemini இலிருந்து API Key சரிபார்ப்பு பிழையாக இருக்கலாம். உங்கள் API Key சரியானதா என சரிபார்க்கவும்.');
            errorMessage = 'API Key சரிபார்ப்பு பிழை: உங்கள் API Key சரியானதா என்பதை உறுதிப்படுத்தவும்.';
        } else if (error.message && error.message.includes('permission denied')) {
            console.error('Google Gemini API அணுகல் மறுக்கப்பட்டது. உங்கள் API Key க்கு தேவையான அனுமதிகள் உள்ளதா என சரிபார்க்கவும்.');
            errorMessage = 'API அணுகல் மறுக்கப்பட்டது: உங்கள் API Key க்கு தேவையான அனுமதிகள் இல்லை.';
        } else if (error.message && error.message.includes('Unsupported model')) {
            console.error('தேர்ந்தெடுக்கப்பட்ட AI மாதிரி ஆதரிக்கப்படவில்லை. சரியான மாதிரி பெயரைப் பயன்படுத்தவும்.');
            errorMessage = `மாதிரி பிழை: தேர்ந்தெடுக்கப்பட்ட AI மாதிரி ஆதரிக்கப்படவில்லை. (${error.message})`;
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage, details: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
