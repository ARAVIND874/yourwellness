const { GoogleGenerativeAI } = require('@google/generative-ai');

// Netlify Environment Variable-ல் இருந்து API Key-ஐ அணுகவும்
const API_KEY = process.env.GEMINI_API_KEY;

exports.handler = async (event, context) => {
    // POST request மட்டுமே அனுமதிக்கவும்
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let goal;
    let currentLanguage;

    try {
        const body = JSON.parse(event.body);
        goal = body.goal;
        currentLanguage = body.currentLanguage;
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON in request body.' }),
        };
    }

    // இலக்கு உள்ளதா என்பதைச் சரிபார்க்கவும்
    if (!goal) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Goal is required in the request body.' }),
        };
    }

    // API Key உள்ளதா என்பதைச் சரிபார்க்கவும்
    if (!API_KEY) {
        console.error('API_KEY environment variable not set.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API Key is missing.' }),
        };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // மாடல் பெயரை 'gemini-1.5-flash' ஆக மாற்றப்பட்டுள்ளது
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const translations = {
        ta: (goal) => `பயனரின் ஆரோக்கிய இலக்கு "${goal}" என்பதாகும். இந்த இலக்கை அடைய உதவும் ஒரு தனிப்பயனாக்கப்பட்ட, சுருக்கமான, **மிகவும் நேர்மறையான, ஊக்கமளிக்கும் மற்றும் உற்சாகப்படுத்தும்** ஆரோக்கிய உதவிக்குறிப்பை **தமிழில்** வழங்குங்கள். எந்த QR குறியீடுகளையும் சேர்க்க வேண்டாம்.`,
        en: (goal) => `A user has stated their wellness goal as "${goal}". Provide a personalized, concise, **highly positive, encouraging, and motivating** wellness tip in English to help them achieve this goal. Do not include any QR codes.`,
    };

    // மொழிக்கு ஏற்ப ப்ராம்ப்ட் ஃபங்ஷனைத் தேர்ந்தெடுக்கவும், இல்லையெனில் ஆங்கிலம்
    const promptFunction = translations[currentLanguage] || translations['en'];
    const prompt = promptFunction(goal); // இங்கே ப்ராம்ப்ட் உருவாக்கப்படுகிறது!

    try {
        const result = await model.generateContent(prompt); // இந்த ப்ராம்ப்ட் பயன்படுத்தப்படுகிறது
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ tip: text }),
        };
    } catch (error) {
        console.error('Error generating content from Gemini API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate tip from AI.', details: error.message }),
        };
    }
};
