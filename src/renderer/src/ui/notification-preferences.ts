// Notification preferences panel — accessible from command palette

import {
  getNotificationConfig,
  updateNotificationConfig,
  updateEventPreference,
  type NotificationEvent,
  type EventPreferences,
} from './notification-config';
import { testSound } from './notification-sounds';

const EVENT_LABELS: ReadonlyArray<{ readonly event: NotificationEvent; readonly label: string }> = [
  { event: 'needs-input', label: 'Needs Input' },
  { event: 'complete', label: 'Complete' },
  { event: 'error', label: 'Error' },
];

const CHANNELS: ReadonlyArray<{ readonly key: keyof EventPreferences; readonly label: string }> = [
  { key: 'sound', label: 'Sound' },
  { key: 'toast', label: 'Toast' },
  { key: 'desktop', label: 'Desktop' },
];

export class NotificationPreferences {
  private overlay: HTMLElement | null = null;
  private visible = false;

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.renderOverlay();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private renderOverlay(): void {
    const config = getNotificationConfig();

    this.overlay = document.createElement('div');
    this.overlay.className = 'notif-prefs-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    const card = document.createElement('div');
    card.className = 'notif-prefs-card';

    // Header
    const header = document.createElement('div');
    header.className = 'notif-prefs-header';

    const title = document.createElement('span');
    title.className = 'notif-prefs-title';
    title.textContent = 'Notification Preferences';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'file-viewer-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Table header
    const tableHeader = document.createElement('div');
    tableHeader.className = 'notif-prefs-row notif-prefs-row--header';

    const eventCol = document.createElement('span');
    eventCol.textContent = 'Event';
    tableHeader.appendChild(eventCol);
    for (const ch of CHANNELS) {
      const col = document.createElement('span');
      col.textContent = ch.label;
      col.className = 'notif-prefs-col-center';
      tableHeader.appendChild(col);
    }
    const testCol = document.createElement('span');
    testCol.textContent = 'Test';
    testCol.className = 'notif-prefs-col-center';
    tableHeader.appendChild(testCol);

    // Event rows
    const rows = document.createElement('div');
    rows.className = 'notif-prefs-rows';

    for (const { event, label } of EVENT_LABELS) {
      const row = document.createElement('div');
      row.className = 'notif-prefs-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'notif-prefs-event-label';
      labelEl.textContent = label;
      row.appendChild(labelEl);

      for (const { key } of CHANNELS) {
        const cell = document.createElement('span');
        cell.className = 'notif-prefs-col-center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'notif-prefs-checkbox';
        checkbox.checked = config.events[event][key];
        checkbox.addEventListener('change', () => {
          updateEventPreference(event, key, checkbox.checked);
        });
        cell.appendChild(checkbox);
        row.appendChild(cell);
      }

      const testCell = document.createElement('span');
      testCell.className = 'notif-prefs-col-center';
      const testBtn = document.createElement('button');
      testBtn.className = 'notif-prefs-test-btn';
      testBtn.textContent = '\u25b6';
      testBtn.title = `Test ${label} sound`;
      testBtn.addEventListener('click', () => testSound(event));
      testCell.appendChild(testBtn);
      row.appendChild(testCell);

      rows.appendChild(row);
    }

    // Volume slider
    const volumeRow = document.createElement('div');
    volumeRow.className = 'notif-prefs-control-row';

    const volumeLabel = document.createElement('label');
    volumeLabel.className = 'notif-prefs-control-label';
    volumeLabel.textContent = 'Volume';

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'notif-prefs-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = String(Math.round(config.volume * 100));

    const volumeValue = document.createElement('span');
    volumeValue.className = 'notif-prefs-control-value';
    volumeValue.textContent = volumeSlider.value + '%';

    volumeSlider.addEventListener('input', () => {
      volumeValue.textContent = volumeSlider.value + '%';
      updateNotificationConfig({ volume: Number(volumeSlider.value) / 100 });
    });

    volumeRow.appendChild(volumeLabel);
    volumeRow.appendChild(volumeSlider);
    volumeRow.appendChild(volumeValue);

    // Toast duration
    const durationRow = document.createElement('div');
    durationRow.className = 'notif-prefs-control-row';

    const durationLabel = document.createElement('label');
    durationLabel.className = 'notif-prefs-control-label';
    durationLabel.textContent = 'Toast Duration';

    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.className = 'notif-prefs-duration-input';
    durationInput.min = '1';
    durationInput.max = '30';
    durationInput.value = String(config.toastDurationMs / 1000);

    const durationUnit = document.createElement('span');
    durationUnit.className = 'notif-prefs-control-value';
    durationUnit.textContent = 'seconds';

    durationInput.addEventListener('change', () => {
      const val = Math.max(1, Math.min(30, Number(durationInput.value)));
      durationInput.value = String(val);
      updateNotificationConfig({ toastDurationMs: val * 1000 });
    });

    durationRow.appendChild(durationLabel);
    durationRow.appendChild(durationInput);
    durationRow.appendChild(durationUnit);

    // Assemble
    card.appendChild(header);
    card.appendChild(tableHeader);
    card.appendChild(rows);
    card.appendChild(volumeRow);
    card.appendChild(durationRow);

    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);

    // Escape to close
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);
  }
}
