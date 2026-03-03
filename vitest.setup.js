import { vi } from 'vitest';
globalThis.Deno = {
  env: {
    get: vi.fn().mockReturnValue('mock-key'),
  },
};
