// Web Audio API based ambient sound generator and timer bell

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play distinctive melodic completion chime when pomodoro completes or task is checked
export function playCompletionBell(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic chords sequence: G5 -> C6 -> E6 -> G6 (Victory chime)
    const notes = [
      { freq: 783.99, start: 0, dur: 0.4 },     // G5
      { freq: 1046.50, start: 0.12, dur: 0.5 }, // C6
      { freq: 1318.51, start: 0.24, dur: 0.6 }, // E6
      { freq: 1567.98, start: 0.36, dur: 1.2 }, // G6 sustained
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const oscTriangle = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      oscTriangle.type = 'triangle';
      oscTriangle.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + note.start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

      osc.connect(gain);
      oscTriangle.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      oscTriangle.start(now + note.start);
      osc.stop(now + note.start + note.dur + 0.05);
      oscTriangle.stop(now + note.start + note.dur + 0.05);
    });

  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// Ambient Noise Generator
class AmbientManager {
  private activeNodes: { source?: AudioNode; gain?: GainNode; filter?: BiquadFilterNode } = {};
  private currentType: 'rain' | 'whitenoise' | 'lofi' | 'off' = 'off';

  public start(type: 'rain' | 'whitenoise' | 'lofi'): void {
    this.stop();
    const ctx = getAudioContext();
    this.currentType = type;

    if (type === 'whitenoise') {
      // White noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800; // Brown/pink soothing noise

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.15;

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start();
      this.activeNodes = { source: noiseSource, gain: gainNode, filter };
    } else if (type === 'rain') {
      // Rain simulation (filtered noise with gentle modulations)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 1.0;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.12;

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start();
      this.activeNodes = { source: noiseSource, gain: gainNode, filter };
    } else if (type === 'lofi') {
      // Binaural alpha-focus drone (432Hz harmonic tone)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(216, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(226, ctx.currentTime); // 10Hz alpha wave difference

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.08;

      osc.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc2.start();
      this.activeNodes = { source: osc, gain: gainNode };
    }
  }

  public stop(): void {
    try {
      if (this.activeNodes.source) {
        (this.activeNodes.source as any).stop?.();
        this.activeNodes.source.disconnect();
      }
      if (this.activeNodes.gain) {
        this.activeNodes.gain.disconnect();
      }
      this.activeNodes = {};
      this.currentType = 'off';
    } catch (e) {
      console.warn('Error stopping ambient audio:', e);
    }
  }

  public getType(): string {
    return this.currentType;
  }
}

export const ambientManager = new AmbientManager();
