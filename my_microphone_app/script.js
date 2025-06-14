const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const downloadButton = document.getElementById('downloadButton');
const statusDiv = document.getElementById('status');
const audioPlayback = document.getElementById('audioPlayback');

let mediaRecorder;
let audioChunks = [];
let audioStream; // மைக்ரோஃபோன் ஸ்ட்ரீம்

// "பதிவு செய்யத் தொடங்குங்கள்" பொத்தானைக் கிளிக் செய்யும் போது
startButton.addEventListener('click', async () => {
    audioChunks = []; // புதிய பதிவுக்கு முந்தைய துண்டுகளை அழிக்கவும்
    audioPlayback.src = ''; // முந்தைய ஆடியோவை அழிக்கவும்
    downloadButton.disabled = true; // பதிவிறக்க பொத்தானை முடக்கவும்

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            // மைக்ரோஃபோன் அணுகலைப் பெறுங்கள்
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            statusDiv.textContent = 'மைக்ரோஃபோன் அணுகல் கிடைத்தது. பதிவு தொடங்குகிறது...';

            // MediaRecorder-ஐ உருவாக்குங்கள்
            // WebM ஆடியோவை சிறந்த இணக்கத்தன்மைக்கு பயன்படுத்தவும்
            mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' }); 

            // ஆடியோ துண்டுகள் (chunks) கிடைக்கும்போது சேகரிக்கவும்
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) { // தரவு இருந்தால் மட்டுமே சேமிக்கவும்
                    audioChunks.push(event.data);
                }
            };

            // பதிவு முடிந்தவுடன்
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // ஆடியோவை Blob ஆக மாற்றவும்
                const audioUrl = URL.createObjectURL(audioBlob); // Blob-க்கு ஒரு URL உருவாக்கவும்

                audioPlayback.src = audioUrl; // ஆடியோ பிளேபேக்கிற்கு URL-ஐ அமைக்கவும்
                downloadButton.disabled = false; // பதிவிறக்க பொத்தானை இயக்கவும்
                statusDiv.textContent = 'பதிவு நிறைவடைந்தது. பதிவிறக்க பொத்தானைக் கிளிக் செய்யவும் அல்லது பிளே செய்யவும்.';

                // ஸ்ட்ரீம் டிராக்குகளை நிறுத்தவும் (மைக்ரோஃபோனை விடுவிக்கவும்)
                audioStream.getTracks().forEach(track => track.stop());
            };

            // பதிவு செய்வதைத் தொடங்குங்கள்
            mediaRecorder.start();
            startButton.disabled = true;
            stopButton.disabled = false;

        } catch (err) {
            // மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது அல்லது பிழை ஏற்பட்டது
            console.error('மைக்ரோஃபோன் அணுகல் பிழை: ', err);
            statusDiv.textContent = 'மைக்ரோஃபோன் அணுகல் அனுமதி தேவை அல்லது பிழை ஏற்பட்டது.';
            alert('மைக்ரோஃபோன் அணுகல் அனுமதி தேவை அல்லது உங்கள் சாதனம்/உலாவி ஆதரிக்கவில்லை.');
            startButton.disabled = false;
            stopButton.disabled = true;
            downloadButton.disabled = true;
        }
    } else {
        statusDiv.textContent = 'இந்த உலாவியில் மைக்ரோஃபோன் API ஆதரிக்கப்படவில்லை.';
        alert('உங்கள் சாதனம் அல்லது உலாவி மைக்ரோஃபோனை ஆதரிக்கவில்லை.');
        startButton.disabled = true;
    }
});

// "பதிவு செய்வதை நிறுத்துங்கள்" பொத்தானைக் கிளிக் செய்யும் போது
stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop(); // பதிவை நிறுத்தவும்
        startButton.disabled = false;
        stopButton.disabled = true;
        statusDiv.textContent = 'பதிவு நிறுத்தப்பட்டது. ஆடியோவை செயலாக்குகிறது...';
    }
});

// "ஆடியோவைப் பதிவிறக்கவும்" பொத்தானைக் கிளிக் செய்யும் போது
downloadButton.addEventListener('click', () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'my-recorded-audio.webm'; // கோப்பு பெயர்
    document.body.appendChild(a);
    a.click(); // பதிவிறக்கத்தைத் தூண்டவும்
    document.body.removeChild(a);
    URL.revokeObjectURL(audioUrl); // URL-ஐ விடுவிக்கவும்
});