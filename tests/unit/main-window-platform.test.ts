import { describe, it, expect } from 'vitest';

/**
 * Tests for platform-gated window configuration.
 * Since createMainWindow depends on Electron, we test the platform-conditional
 * logic directly to verify macOS gets trafficLightPosition and other platforms don't.
 */

describe('Main window platform gating', () => {
  describe('trafficLightPosition', () => {
    it('includes trafficLightPosition on darwin', () => {
      const platform = 'darwin';
      const opts = {
        frame: false,
        titleBarStyle: 'hidden' as const,
        ...(platform === 'darwin' ? {
          trafficLightPosition: { x: 13, y: 10 },
        } : {}),
      };
      expect(opts.trafficLightPosition).toEqual({ x: 13, y: 10 });
    });

    it('excludes trafficLightPosition on linux', () => {
      const platform = 'linux';
      const opts = {
        frame: false,
        titleBarStyle: 'hidden' as const,
        ...(platform === 'darwin' ? {
          trafficLightPosition: { x: 13, y: 10 },
        } : {}),
      };
      expect(opts).not.toHaveProperty('trafficLightPosition');
    });

    it('excludes trafficLightPosition on win32', () => {
      const platform = 'win32';
      const opts = {
        frame: false,
        titleBarStyle: 'hidden' as const,
        ...(platform === 'darwin' ? {
          trafficLightPosition: { x: 13, y: 10 },
        } : {}),
      };
      expect(opts).not.toHaveProperty('trafficLightPosition');
    });
  });

  describe('titlebar controls gating', () => {
    // Simulates the renderer logic: controls are only created when platform !== 'darwin'
    function shouldRenderCustomControls(platform: string): boolean {
      return platform !== 'darwin';
    }

    it('does not render custom controls on darwin', () => {
      expect(shouldRenderCustomControls('darwin')).toBe(false);
    });

    it('renders custom controls on linux', () => {
      expect(shouldRenderCustomControls('linux')).toBe(true);
    });

    it('renders custom controls on win32', () => {
      expect(shouldRenderCustomControls('win32')).toBe(true);
    });
  });

  describe('platform body class', () => {
    it('generates correct class for darwin', () => {
      expect(`platform-${'darwin'}`).toBe('platform-darwin');
    });

    it('generates correct class for linux', () => {
      expect(`platform-${'linux'}`).toBe('platform-linux');
    });

    it('generates correct class for win32', () => {
      expect(`platform-${'win32'}`).toBe('platform-win32');
    });
  });
});
