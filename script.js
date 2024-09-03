const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const canvas = document.getElementById('spectrum');
const canvasCtx = canvas.getContext('2d');

let audioCtx;
let analyser;
let source;
let dataArray;
let bufferLength;
let mediaRecorder;
let recordedChunks = [];
let animationFrameId;

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Initialize audio context and analyser
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } else {
            // Close and clean up previous context if necessary
            audioCtx.close().then(() => {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            });
        }

        // Clean up previous setup
        if (analyser) {
            analyser.disconnect();
        }
        
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Set up MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            recordedChunks = [];
            const url = URL.createObjectURL(blob);
            saveBtn.href = url;
            saveBtn.download = 'recording.webm';
            saveBtn.style.display = 'block'; // Show the save button
        };

        // Start recording
        mediaRecorder.start();

        // Update button states
        startBtn.disabled = true;
        stopBtn.disabled = false;
        saveBtn.style.display = 'none'; // Hide the save button initially

        // Start drawing
        draw();
    } catch (err) {
        console.error('Error accessing audio stream:', err);
    }
});

stopBtn.addEventListener('click', () => {
    if (audioCtx) {
        audioCtx.close().then(() => {
            audioCtx = null;
            analyser = null;
            source = null;
            dataArray = null;
            bufferLength = 0;
            cancelAnimationFrame(animationFrameId);
            if (mediaRecorder) {
                mediaRecorder.stop();
            }
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }).catch(err => console.error('Error closing audio context:', err));
    }
});

function draw() {
    animationFrameId = requestAnimationFrame(draw);

    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
