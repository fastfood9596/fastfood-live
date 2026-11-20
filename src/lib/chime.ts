let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/** Call inside a user click (like Place Order) so mobile browsers allow later chimes. */
export function unlockChime() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}

/** Plays a gentle two-tone notification chime when an order is ready. */
export function playOrderReadyChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [1046.5, 1318.51]; // C6 -> E6 pleasant service bell

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.16);

    gain.gain.setValueAtTime(0.001, now + idx * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.16);
    osc.stop(now + idx * 0.16 + 0.6);
  });
}