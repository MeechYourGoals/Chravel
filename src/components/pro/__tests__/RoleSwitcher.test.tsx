import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../../../hooks/useAuth');

import { useAuth } from '../../../hooks/useAuth';
import { RoleSwitcher } from '../RoleSwitcher';

const mockedUseAuth = vi.mocked(useAuth);

afterEach(() => {
  vi.clearAllMocks();
});

describe('RoleSwitcher', () => {
  it('switches to first role when current role not in category', async () => {
    const switchRole = vi.fn();
    mockedUseAuth.mockReturnValue({
      user: { isPro: true, proRole: 'admin' },
      switchRole,
    } as any);

    render(<RoleSwitcher category="Sports – Pro, Collegiate, Youth" />);

    await waitFor(() => {
      expect(switchRole).toHaveBeenCalledWith('player');
    });
  });

  it('keeps role when valid for category', async () => {
    const switchRole = vi.fn();
    mockedUseAuth.mockReturnValue({
      user: { isPro: true, proRole: 'player' },
      switchRole,
    } as any);

    render(<RoleSwitcher category="Sports – Pro, Collegiate, Youth" />);

    await waitFor(() => {
      expect(switchRole).not.toHaveBeenCalled();
    });
  });
});
