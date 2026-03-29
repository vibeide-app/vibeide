// Unified notification preferences — single source of truth for sound, toast, and desktop notifications

export type NotificationEvent = 'needs-input' | 'complete' | 'error';

export interface EventPreferences {
  readonly sound: boolean;
  readonly toast: boolean;
  readonly desktop: boolean;
}

export interface NotificationConfig {
  readonly events: Readonly<Record<NotificationEvent, EventPreferences>>;
  readonly volume: number;
  readonly toastDurationMs: number;
}

const DEFAULT_CONFIG: NotificationConfig = {
  events: {
    'needs-input': { sound: true, toast: true, desktop: true },
    complete: { sound: false, toast: true, desktop: false },
    error: { sound: true, toast: true, desktop: true },
  },
  volume: 0.3,
  toastDurationMs: 5000,
};

let currentConfig: NotificationConfig = { ...DEFAULT_CONFIG };

export function getNotificationConfig(): Readonly<NotificationConfig> {
  return currentConfig;
}

export async function loadNotificationConfig(): Promise<void> {
  try {
    const settings = await window.api.settings.load();

    // Migrate from old soundConfig if notificationConfig doesn't exist
    if (settings.notificationConfig && typeof settings.notificationConfig === 'object') {
      currentConfig = parseConfig(settings.notificationConfig as Record<string, unknown>);
    } else if (settings.soundConfig && typeof settings.soundConfig === 'object') {
      currentConfig = migrateFromSoundConfig(settings.soundConfig as Record<string, unknown>);
      await saveNotificationConfig();
    }
  } catch {
    // Use defaults
  }
}

export async function updateNotificationConfig(
  partial: Partial<Pick<NotificationConfig, 'volume' | 'toastDurationMs'>>,
): Promise<void> {
  currentConfig = { ...currentConfig, ...partial };
  await saveNotificationConfig();
}

export async function updateEventPreference(
  event: NotificationEvent,
  channel: keyof EventPreferences,
  value: boolean,
): Promise<void> {
  const updatedEvent: EventPreferences = {
    ...currentConfig.events[event],
    [channel]: value,
  };
  const updatedEvents = { ...currentConfig.events, [event]: updatedEvent };
  currentConfig = { ...currentConfig, events: updatedEvents };
  await saveNotificationConfig();
}

async function saveNotificationConfig(): Promise<void> {
  try {
    const settings = await window.api.settings.load();
    const { soundConfig: _, ...rest } = settings as Record<string, unknown>;
    await window.api.settings.save({ ...rest, notificationConfig: currentConfig });
  } catch {
    // Save failed
  }
}

function parseConfig(raw: Record<string, unknown>): NotificationConfig {
  const events = raw.events as Record<string, Record<string, boolean>> | undefined;
  const parsed: NotificationConfig = {
    events: {
      'needs-input': parseEventPrefs(events?.['needs-input'], DEFAULT_CONFIG.events['needs-input']),
      complete: parseEventPrefs(events?.complete, DEFAULT_CONFIG.events.complete),
      error: parseEventPrefs(events?.error, DEFAULT_CONFIG.events.error),
    },
    volume: typeof raw.volume === 'number' ? raw.volume : DEFAULT_CONFIG.volume,
    toastDurationMs: typeof raw.toastDurationMs === 'number' ? raw.toastDurationMs : DEFAULT_CONFIG.toastDurationMs,
  };
  return parsed;
}

function parseEventPrefs(
  raw: Record<string, boolean> | undefined,
  defaults: EventPreferences,
): EventPreferences {
  if (!raw) return defaults;
  return {
    sound: typeof raw.sound === 'boolean' ? raw.sound : defaults.sound,
    toast: typeof raw.toast === 'boolean' ? raw.toast : defaults.toast,
    desktop: typeof raw.desktop === 'boolean' ? raw.desktop : defaults.desktop,
  };
}

function migrateFromSoundConfig(sc: Record<string, unknown>): NotificationConfig {
  const enabled = sc.enabled as Record<string, boolean> | undefined;
  const volume = typeof sc.volume === 'number' ? sc.volume : DEFAULT_CONFIG.volume;

  return {
    events: {
      'needs-input': {
        sound: enabled?.['needs-input'] ?? true,
        toast: true,
        desktop: true,
      },
      complete: {
        sound: enabled?.complete ?? false,
        toast: true,
        desktop: false,
      },
      error: {
        sound: enabled?.error ?? true,
        toast: true,
        desktop: true,
      },
    },
    volume,
    toastDurationMs: DEFAULT_CONFIG.toastDurationMs,
  };
}
