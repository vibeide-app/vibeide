import { vi } from 'vitest';

export interface MockPty {
  pid: number;
  cols: number;
  rows: number;
  process: string;
  handleFlowControl: boolean;
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  onData: ReturnType<typeof vi.fn>;
  onExit: ReturnType<typeof vi.fn>;
  _dataCallback?: (data: string) => void;
  _exitCallback?: (event: { exitCode: number; signal?: number }) => void;
}

export function createMockPty(): MockPty {
  const mockPty: MockPty = {
    pid: 12345,
    cols: 120,
    rows: 30,
    process: '/bin/bash',
    handleFlowControl: false,
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    onData: vi.fn((callback: (data: string) => void) => {
      mockPty._dataCallback = callback;
      return { dispose: vi.fn() };
    }),
    onExit: vi.fn((callback: (event: { exitCode: number; signal?: number }) => void) => {
      mockPty._exitCallback = callback;
      return { dispose: vi.fn() };
    }),
  };
  return mockPty;
}

let currentMock: MockPty | null = null;

export function setCurrentMock(mock: MockPty): void {
  currentMock = mock;
}

export function spawn(
  _file: string,
  _args: string[],
  _options: Record<string, unknown>,
): MockPty {
  if (currentMock) {
    return currentMock;
  }
  return createMockPty();
}
