import { Notification, BrowserWindow } from 'electron';

export interface NotificationRequest {
  readonly title: string;
  readonly body: string;
  readonly urgency?: 'low' | 'normal' | 'critical';
}

export class NotificationManager {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  show(request: NotificationRequest, mainWindow: BrowserWindow | null): void {
    if (!this.enabled) return;
    if (!Notification.isSupported()) return;

    // Don't notify if the window is focused
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) return;

    const notification = new Notification({
      title: request.title,
      body: request.body,
      urgency: request.urgency ?? 'normal',
      silent: request.urgency !== 'critical',
    });

    notification.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notification.show();
  }
}
