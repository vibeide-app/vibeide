// Notification sounds using Web Audio API
// No external audio files needed — generates tones programmatically

import { getNotificationConfig, type NotificationEvent } from './notification-config';

let audioCtx: AudioContext | null = null;

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

    const vol = volume ?? getNotificationConfig().volume;
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
  const vol = getNotificationConfig().volume;
  playTone(660, 0.3, 'sine', vol * 0.7);
}

// Error: alert — low descending tone
function playError(): void {
  const vol = getNotificationConfig().volume;
  playTone(440, 0.15, 'square', vol * 0.5);
  setTimeout(() => playTone(330, 0.2, 'square', vol * 0.5), 150);
}

export function playNotificationSound(event: NotificationEvent): void {
  const config = getNotificationConfig();
  if (!config.events[event].sound) return;

  switch (event) {
    case 'needs-input': playNeedsInput(); break;
    case 'complete': playComplete(); break;
    case 'error': playError(); break;
  }
}

export function testSound(event: NotificationEvent): void {
  switch (event) {
    case 'needs-input': playNeedsInput(); break;
    case 'complete': playComplete(); break;
    case 'error': playError(); break;
  }
}
