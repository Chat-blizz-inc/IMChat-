/**
 * Synthesizes a pleasant, Facebook-style dual-tone bell notification sound.
 * Uses the Web Audio API for zero reliance on external assets, CORS, or networks.
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    // Facebook chime is characterized by a quick, shiny, high-pitch harmonic pair
    // Primary Tone: ~523.25 Hz (C5)
    // Secondary Tone: ~659.25 Hz (E5)
    
    // First Oscillator (C5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    
    // Second Oscillator (E5) - creates the pleasant major third chord characteristic of Facebook
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now);

    // Dynamic gain envelope for Osc 1 (Fast attack, organic delay release)
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.05); // Sharp punchy attack
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Warm exponential ring

    // Dynamic gain envelope for Osc 2
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.03); // Slightly faster attack
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4); // Faster ring

    // Connect nodes
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    // Playback duration
    osc1.start(now);
    osc1.stop(now + 0.6);

    osc2.start(now);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn("Could not play notification chime:", err);
  }
}
