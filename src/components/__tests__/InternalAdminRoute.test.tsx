import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { InternalAdminRoute } from '@/components/InternalAdminRoute';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useSuperAdmin', () => ({
  useSuperAdmin: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

describe('InternalAdminRoute', () => {
  it('renders child for super admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'ccamechi@gmail.com' },
      isLoading: false,
    } as never);
    vi.mocked(useSuperAdmin).mockReturnValue({ isSuperAdmin: true });

    render(
      <MemoryRouter initialEntries={['/admin/scheduled-messages']}>
        <Routes>
          <Route
            path="/admin/scheduled-messages"
            element={
              <InternalAdminRoute>
                <div>secret admin page</div>
              </InternalAdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('secret admin page')).toBeInTheDocument();
  });

  it('redirects non-super-admin users away from admin route', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u2', email: 'member@example.com' },
      isLoading: false,
    } as never);
    vi.mocked(useSuperAdmin).mockReturnValue({ isSuperAdmin: false });

    render(
      <MemoryRouter initialEntries={['/admin/scheduled-messages']}>
        <Routes>
          <Route
            path="/admin/scheduled-messages"
            element={
              <InternalAdminRoute>
                <div>secret admin page</div>
              </InternalAdminRoute>
            }
          />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument();
  });
});
