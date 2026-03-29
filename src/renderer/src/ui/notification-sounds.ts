// Notification sounds using Web Audio API
// No external audio files needed — generates tones programmatically

type SoundEvent = 'needs-input' | 'complete' | 'error';

interface SoundConfig {
  enabled: Record<SoundEvent, boolean>;
  volume: number;
}

const DEFAULT_CONFIG: SoundConfig = {
  enabled: { 'needs-input': true, complete: false, error: true },
  volume: 0.3,
};

let audioCtx: AudioContext | null = null;
let config: SoundConfig = { ...DEFAULT_CONFIG };

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume?: number): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const vol = volume ?? config.volume;
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

// Needs-input: urgent chime — two ascending tones
function playNeedsInput(): void {
  playTone(880, 0.15, 'sine');
  setTimeout(() => playTone(1100, 0.2, 'sine'), 150);
}

// Complete: pleasant ding — single soft tone
function playComplete(): void {
  playTone(660, 0.3, 'sine', config.volume * 0.7);
}

// Error: alert — low descending tone
function playError(): void {
  playTone(440, 0.15, 'square', config.volume * 0.5);
  setTimeout(() => playTone(330, 0.2, 'square', config.volume * 0.5), 150);
}

export function playNotificationSound(event: SoundEvent): void {
  if (!config.enabled[event]) return;

  switch (event) {
    case 'needs-input': playNeedsInput(); break;
    case 'complete': playComplete(); break;
    case 'error': playError(); break;
  }
}

export function setSoundEnabled(event: SoundEvent, enabled: boolean): void {
  config.enabled[event] = enabled;
  saveSoundConfig();
}

export function setSoundVolume(volume: number): void {
  config.volume = Math.max(0, Math.min(1, volume));
  saveSoundConfig();
}

export function getSoundConfig(): Readonly<SoundConfig> {
  return config;
}

export function loadSoundConfig(): void {
  try {
    window.api.settings.load().then((s) => {
      if (s.soundConfig && typeof s.soundConfig === 'object') {
        const sc = s.soundConfig as Record<string, unknown>;
        if (sc.enabled && typeof sc.enabled === 'object') {
          const e = sc.enabled as Record<string, boolean>;
          config.enabled = {
            'needs-input': e['needs-input'] ?? true,
            complete: e.complete ?? false,
            error: e.error ?? true,
          };
        }
        if (typeof sc.volume === 'number') config.volume = sc.volume;
      }
    }).catch(() => {});
  } catch { /* */ }
}

function saveSoundConfig(): void {
  window.api.settings.load().then((s) => {
    window.api.settings.save({ ...s, soundConfig: config });
  }).catch(() => {});
}

export function testSound(event: SoundEvent): void {
  const wasEnabled = config.enabled[event];
  config.enabled[event] = true;
  playNotificationSound(event);
  config.enabled[event] = wasEnabled;
}
