const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const stepContainer = document.getElementById('step-container');
const startBtn = document.getElementById('start-btn');

let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0.0;
const tempo = 120.0;
const scheduleAheadTime = 0.1; // Seconds
const lookahead = 25.0; // Milliseconds

// 1. Create the 16 step elements
for (let i = 0; i < 16; i++) {
    const step = document.createElement('div');
    step.classList.add('step');
    // Darken every 4th step for visual grouping (like the RD-6)
    if (i % 4 === 0) step.style.filter = "brightness(0.8)";
    
    step.addEventListener('click', () => step.classList.toggle('active'));
    stepContainer.appendChild(step);
}

// 2. Synthesize the Kick Drum sound
function playKick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    // Rapid pitch drop (150Hz down to almost 0)
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    // Volume envelope (Short decay)
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.start(time);
    osc.stop(time + 0.5);
}

// 3. The precise scheduler loop
function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentStep, nextNoteTime);
        advanceStep();
    }
    if (isPlaying) setTimeout(scheduler, lookahead);
}

function scheduleNote(stepIndex, time) {
    const allSteps = document.querySelectorAll('.step');
    
    // UI Feedback (Move the white border)
    setTimeout(() => {
        allSteps.forEach(s => s.classList.remove('playing'));
        allSteps[stepIndex].classList.add('playing');
    }, (time - audioCtx.currentTime) * 1000);

    // If the step is "active", play the sound
    if (allSteps[stepIndex].classList.contains('active')) {
        playKick(time);
    }
}

function advanceStep() {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    currentStep = (currentStep + 1) % 16;
}

// 4. Interaction handling
startBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    isPlaying = !isPlaying;
    if (isPlaying) {
        currentStep = 0;
        nextNoteTime = audioCtx.currentTime;
        scheduler();
    }
});