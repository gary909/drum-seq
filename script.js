const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const stepContainer = document.getElementById('step-container');
const startBtn = document.getElementById('start-btn');

let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0.0;
const tempo = 120.0;
const scheduleAheadTime = 0.1;
const lookahead = 25.0;

// --- MIDI SETUP ---
let midiOutput = null;

// Request MIDI access from the browser
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
}

function onMIDISuccess(midiAccess) {
    const outputs = Array.from(midiAccess.outputs.values());
    // Auto-selects the first available MIDI device (ensure RD-6 is plugged in)
    midiOutput = outputs[0];
    console.log("MIDI Ready:", midiOutput ? midiOutput.name : "No device found");
}

function onMIDIFailure() {
    console.warn("MIDI access failed. Check browser permissions.");
}
// ------------------

// 1. Create the 16 step elements
for (let i = 0; i < 16; i++) {
    const step = document.createElement('div');
    step.classList.add('step');
    if (i % 4 === 0) step.style.filter = "brightness(0.8)";
    step.addEventListener('click', () => step.classList.toggle('active'));
    stepContainer.appendChild(step);
}

// 2. Internal Synthesizer (for browser audio)
function playKick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.start(time);
    osc.stop(time + 0.5);
}

// 3. Scheduler
function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentStep, nextNoteTime);
        advanceStep();
    }
    if (isPlaying) setTimeout(scheduler, lookahead);
}

function scheduleNote(stepIndex, time) {
    const allSteps = document.querySelectorAll('.step');
    
    setTimeout(() => {
        allSteps.forEach(s => s.classList.remove('playing'));
        allSteps[stepIndex].classList.add('playing');
    }, (time - audioCtx.currentTime) * 1000);

    if (allSteps[stepIndex].classList.contains('active')) {
        // Internal browser sound
        playKick(time);

        // HARDWARE TRIGGER: Send MIDI to the RD-6
        if (midiOutput) {
            // Note On: Channel 1 (90), Bass Drum (24), Velocity (7F)
            // for T8 use: 0x99
            // for RD6 use 0x99
            const noteOn = [0x90, 0x24, 0x7F]; 
            // Note Off: Channel 1 (80), Bass Drum (24), Velocity (00)
            const noteOff = [0x80, 0x24, 0x00];

            // Use the high-precision audio clock (converted to ms) for scheduling
            midiOutput.send(noteOn, time * 1000); 
            midiOutput.send(noteOff, (time + 0.05) * 1000);
        }
    }
}

function advanceStep() {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTime += 0.25 * secondsPerBeat;
    currentStep = (currentStep + 1) % 16;
}

startBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlaying = !isPlaying;
    if (isPlaying) {
        currentStep = 0;
        nextNoteTime = audioCtx.currentTime;
        scheduler();
    }
});