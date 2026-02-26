import { describe, it, expect, vi } from 'vitest';
import despia, { shareApp } from './despia';

// Mock the despia-native module
vi.mock('despia-native', () => ({
  default: vi.fn(),
  __esModule: true,
}));

describe('shareApp', () => {
  it('calls despia with the correct format', () => {
    const options = {
      message: 'Check out this awesome app!',
      url: 'https://example.com',
    };

    shareApp(options);

    const expectedMessage = encodeURIComponent(options.message);
    const expectedUrl = encodeURIComponent(options.url);
    const expectedCommand = `shareapp://message?=${expectedMessage}&url=${expectedUrl}`;

    expect(despia).toHaveBeenCalledWith(expectedCommand);
  });

  it('correctly encodes special characters in message and URL', () => {
    const options = {
      message: 'Hello World & More!',
      url: 'https://example.com/path?query=1&other=2',
    };

    shareApp(options);

    const expectedMessage = encodeURIComponent(options.message);
    const expectedUrl = encodeURIComponent(options.url);
    const expectedCommand = `shareapp://message?=${expectedMessage}&url=${expectedUrl}`;

    expect(despia).toHaveBeenCalledWith(expectedCommand);
  });
});
