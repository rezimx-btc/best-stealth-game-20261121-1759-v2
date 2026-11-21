// SHADOW PROTOCOL — procedural WebAudio sounds. No audio files.
// Footsteps, coin clink, core chime, suspicion riser, alert sting,
// smoke hiss, exit fanfare. M toggles mute.
function makeAudio() {
  const audio = {
    ctx: null,
    muted: false,
    riserOsc: null,
    ensure() {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
        } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type, vol, slideTo) {
      const ctx = this.ensure();
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol || 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    noiseBurst(dur, vol, filterFreq) {
      const ctx = this.ensure();
      if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq || 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
    },
  };
  return audio;
}

// Named sound effects built on tone() / noiseBurst().
function playSound(audio, name) {
  if (!audio || audio.muted) return;
  switch (name) {
    case 'step':
      audio.noiseBurst(0.06, 0.05, 500);
      break;
    case 'coin':
      audio.tone(2093, 0.09, 'triangle', 0.1);
      setTimeout(() => audio.tone(2637, 0.12, 'triangle', 0.08), 70);
      break;
    case 'core':
      audio.tone(880, 0.14, 'sine', 0.14);
      setTimeout(() => audio.tone(1318, 0.2, 'sine', 0.12), 90);
      break;
    case 'suspicious':
      audio.tone(220, 0.5, 'sawtooth', 0.05, 440);
      break;
    case 'alert':
      audio.tone(196, 0.16, 'square', 0.09);
      setTimeout(() => audio.tone(147, 0.3, 'square', 0.1), 150);
      break;
    case 'smoke':
      audio.noiseBurst(0.5, 0.1, 2400);
      break;
    case 'caught':
      audio.tone(110, 0.7, 'sawtooth', 0.12, 55);
      break;
    case 'exit':
      audio.tone(523, 0.16, 'sine', 0.13);
      setTimeout(() => audio.tone(659, 0.16, 'sine', 0.13), 140);
      setTimeout(() => audio.tone(784, 0.3, 'sine', 0.14), 280);
      break;
    case 'clear':
      audio.tone(523, 0.15, 'triangle', 0.12);
      setTimeout(() => audio.tone(659, 0.15, 'triangle', 0.12), 130);
      setTimeout(() => audio.tone(784, 0.15, 'triangle', 0.12), 260);
      setTimeout(() => audio.tone(1046, 0.4, 'triangle', 0.13), 390);
      break;
    default:
      break;
  }
}

if (typeof window !== 'undefined') window.SHADOW_AUDIO = { makeAudio, playSound };
if (typeof module !== 'undefined' && module.exports) module.exports = { makeAudio, playSound };
