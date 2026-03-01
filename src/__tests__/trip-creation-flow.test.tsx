/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';
import { testFactories } from './utils/testHelpers';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', async () => {
  const actual = await vi.importActual('@/hooks/useAuth');
  return {
    ...actual,
    useAuth: () => ({
      user: testFactories.createUser(),
      session: { access_token: 'mock-token', user: { id: 'test-user-123' } },
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }),
  };
});

// NOTE: Integration tests with complex mock hoisting issues
// Skipped pending proper test infrastructure overhaul
describe.skip('Trip Creation → Invite → Join Flow', () => {
  beforeEach(() => {
    supabaseMockHelpers.clearMocks();
    supabaseMockHelpers.setUser(testFactories.createUser());
  });

  describe('Trip Creation', () => {
    it('should create a new trip successfully', async () => {
      const newTrip = testFactories.createTrip({
        name: 'Paris Adventure',
        destination: 'Paris, France',
      });

      // Mock trip creation
      supabaseMockHelpers.setMockData('trips', [newTrip], {
        column: 'id',
        value: newTrip.id,
      });

      const TestComponent = () => {
        const [trip, setTrip] = React.useState<unknown>(null);
        const [status, setStatus] = React.useState('idle');

        const handleCreateTrip = async () => {
          setStatus('loading');
          try {
            const { data, error } = await mockSupabase
              .from('trips')
              .insert({
                name: 'Paris Adventure',
                destination: 'Paris, France',
                start_date: '2024-06-01',
                end_date: '2024-06-07',
                trip_type: 'consumer',
                creator_id: 'test-user-123',
              })
              .select()
              .single();

            if (error) throw error;
            setTrip(data);
            setStatus('success');
          } catch {
            setStatus('error');
          }
        };

        return (
          <div>
            <button onClick={handleCreateTrip}>Create Trip</button>
            <div data-testid="status">{status}</div>
            {trip && <div data-testid="trip-name">{trip.name}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      const createButton = screen.getByText('Create Trip');
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('success');
        expect(screen.getByTestId('trip-name')).toHaveTextContent('Paris Adventure');
      });
    });
  });

  describe('Trip Invitation', () => {
    it('should generate an invite link for a trip', async () => {
      const trip = testFactories.createTrip();
      const inviteLink = `https://chravel.app/join/${trip.id}?token=abc123`;

      // Mock invite link generation
      supabaseMockHelpers.setMockData('trip_invites', [
        {
          trip_id: trip.id,
          invite_token: 'abc123',
          created_by: 'test-user-123',
        },
      ]);

      const TestComponent = () => {
        const [link, setLink] = React.useState<string | null>(null);

        const handleGenerateInvite = async () => {
          const { data } = await mockSupabase
            .from('trip_invites')
            .select('*')
            .eq('trip_id', trip.id)
            .single();

          if (data) {
            setLink(`https://chravel.app/join/${trip.id}?token=${data.invite_token}`);
          }
        };

        return (
          <div>
            <button onClick={handleGenerateInvite}>Generate Invite</button>
            {link && <div data-testid="invite-link">{link}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      const generateButton = screen.getByText('Generate Invite');
      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('invite-link')).toHaveTextContent(inviteLink);
      });
    });

    it('should add collaborators to a trip', async () => {
      const trip = testFactories.createTrip();
      const collaborator = testFactories.createUser({
        id: 'collaborator-123',
        email: 'collaborator@example.com',
      });

      supabaseMockHelpers.setMockData('trip_collaborators', [
        {
          trip_id: trip.id,
          user_id: collaborator.id,
          role: 'participant',
        },
      ]);

      const TestComponent = () => {
        const [collaborators, setCollaborators] = React.useState<unknown[]>([]);

        const handleAddCollaborator = async () => {
          const { data } = await mockSupabase
            .from('trip_collaborators')
            .select('*')
            .eq('trip_id', trip.id);

          if (data) {
            setCollaborators(data);
          }
        };

        return (
          <div>
            <button onClick={handleAddCollaborator}>Add Collaborator</button>
            {collaborators.length > 0 && (
              <div data-testid="collaborator-count">{collaborators.length}</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      const addButton = screen.getByText('Add Collaborator');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('collaborator-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Join Trip Flow', () => {
    it('should allow a user to join a trip via invite link', async () => {
      const trip = testFactories.createTrip();
      const inviteToken = 'abc123';
      const joiningUser = testFactories.createUser({
        id: 'joining-user-123',
        email: 'joining@example.com',
      });

      // Mock invite validation
      supabaseMockHelpers.setMockData('trip_invites', [
        {
          trip_id: trip.id,
          invite_token: inviteToken,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ]);

      // Mock adding user as collaborator
      supabaseMockHelpers.setMockData('trip_collaborators', [
        {
          trip_id: trip.id,
          user_id: joiningUser.id,
          role: 'participant',
        },
      ]);

      const TestComponent = () => {
        const [joined, setJoined] = React.useState(false);

        const handleJoinTrip = async () => {
          // Validate invite token
          const { data: invite } = await mockSupabase
            .from('trip_invites')
            .select('*')
            .eq('invite_token', inviteToken)
            .single();

          if (invite) {
            // Add user as collaborator
            await mockSupabase.from('trip_collaborators').insert({
              trip_id: trip.id,
              user_id: joiningUser.id,
              role: 'participant',
            });

            setJoined(true);
          }
        };

        return (
          <div>
            <button onClick={handleJoinTrip}>Join Trip</button>
            {joined && <div data-testid="joined">Joined successfully</div>}
          </div>
        );
      };

      render(<TestComponent />);

      const joinButton = screen.getByText('Join Trip');
      await userEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByTestId('joined')).toBeInTheDocument();
      });
    });

    it('should reject expired invite links', async () => {
      const expiredInvite = {
        trip_id: 'test-trip-123',
        invite_token: 'expired-token',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
      };

      supabaseMockHelpers.setMockData('trip_invites', [expiredInvite]);

      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleJoinTrip = async () => {
          const { data: invite } = await mockSupabase
            .from('trip_invites')
            .select('*')
            .eq('invite_token', 'expired-token')
            .single();

          if (invite && new Date(invite.expires_at) < new Date()) {
            setError('Invite link has expired');
          }
        };

        return (
          <div>
            <button onClick={handleJoinTrip}>Join Trip</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      const joinButton = screen.getByText('Join Trip');
      await userEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invite link has expired');
      });
    });
  });
});
