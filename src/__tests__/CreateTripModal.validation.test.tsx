import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';
import { testFactories } from './utils/testHelpers';
import { CreateTripModal } from '@/components/CreateTripModal';
import { toast } from 'sonner';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: testFactories.createUser(),
    session: { access_token: 'mock-token', user: { id: 'test-user-123' } },
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock useTrips hook
vi.mock('@/hooks/useTrips', () => ({
  useTrips: () => ({
    trips: [],
    loading: false,
    initializing: false,
    createTrip: vi.fn().mockResolvedValue(testFactories.createTrip()),
    updateTrip: vi.fn(),
    archiveTrip: vi.fn(),
    refreshTrips: vi.fn(),
  }),
}));

// Mock useOrganization hook
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('CreateTripModal - Validation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMockHelpers.clearMocks();
    supabaseMockHelpers.setUser(testFactories.createUser());
  });

  describe('Date Range Validation', () => {
    it('should show error when end date is before start date', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      // Set start date to June 7, 2024
      await userEvent.type(startDateInput, '2024-06-07');
      
      // Set end date to June 1, 2024 (before start date)
      await userEvent.type(endDateInput, '2024-06-01');

      // Wait for validation to run
      await waitFor(() => {
        const errorMessage = screen.queryByText(/end date must be after start date/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should show error when end date equals start date', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      const sameDate = '2024-06-07';
      await userEvent.type(startDateInput, sameDate);
      await userEvent.type(endDateInput, sameDate);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/end date must be after start date/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should not show error when end date is after start date', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(startDateInput, '2024-06-01');
      await userEvent.type(endDateInput, '2024-06-07');

      await waitFor(() => {
        const errorMessage = screen.queryByText(/end date must be after start date/i);
        expect(errorMessage).not.toBeInTheDocument();
      });
    });

    it('should warn when trip duration exceeds 1 year', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(startDateInput, '2024-01-01');
      await userEvent.type(endDateInput, '2025-02-01'); // More than 1 year

      await waitFor(() => {
        const warningMessage = screen.queryByText(/trip duration exceeds 1 year/i);
        expect(warningMessage).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Trip Name Detection', () => {
    it('should show error when trip name already exists', async () => {
      const existingTrip = testFactories.createTrip({
        name: 'Paris Adventure',
        created_by: 'test-user-123',
      });

      // Mock existing trips
      supabaseMockHelpers.setMockData('trips', [existingTrip]);

      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      await userEvent.type(titleInput, 'Paris Adventure');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('already have a trip with this name')
        );
      });
    });

    it('should allow trip creation with unique name', async () => {
      const existingTrip = testFactories.createTrip({
        name: 'Paris Adventure',
        created_by: 'test-user-123',
      });

      supabaseMockHelpers.setMockData('trips', [existingTrip]);

      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      const locationInput = screen.getByPlaceholderText(/e.g., paris, france/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(titleInput, 'Tokyo Adventure'); // Different name
      await userEvent.type(locationInput, 'Tokyo, Japan');
      await userEvent.type(startDateInput, '2024-07-01');
      await userEvent.type(endDateInput, '2024-07-07');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      // Should not show duplicate name error
      await waitFor(() => {
        expect(toast.error).not.toHaveBeenCalledWith(
          expect.stringContaining('already have a trip with this name')
        );
      });
    });
  });

  describe('Required Field Validation', () => {
    it('should show error when title is empty', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Trip title is required');
      });
    });

    it('should show error when location is empty', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      await userEvent.type(titleInput, 'My Trip');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Location is required');
      });
    });

    it('should show error when start date is empty', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      const locationInput = screen.getByPlaceholderText(/e.g., paris, france/i);
      
      await userEvent.type(titleInput, 'My Trip');
      await userEvent.type(locationInput, 'Paris, France');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Start date is required');
      });
    });

    it('should show error when end date is empty', async () => {
      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      const locationInput = screen.getByPlaceholderText(/e.g., paris, france/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      
      await userEvent.type(titleInput, 'My Trip');
      await userEvent.type(locationInput, 'Paris, France');
      await userEvent.type(startDateInput, '2024-06-01');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('End date is required');
      });
    });
  });

  describe('First-time User Onboarding', () => {
    it('should show onboarding banner for first-time users', () => {
      // Mock useTrips to return empty trips array (first-time user)
      vi.mocked(require('@/hooks/useTrips').useTrips).mockReturnValue({
        trips: [],
        loading: false,
        initializing: false,
        createTrip: vi.fn(),
        updateTrip: vi.fn(),
        archiveTrip: vi.fn(),
        refreshTrips: vi.fn(),
      });

      render(<CreateTripModal {...defaultProps} />);

      expect(screen.getByText(/welcome to chravel/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first trip/i)).toBeInTheDocument();
    });

    it('should not show onboarding banner for existing users', () => {
      const existingTrip = testFactories.createTrip();
      
      // Mock useTrips to return trips (existing user)
      vi.mocked(require('@/hooks/useTrips').useTrips).mockReturnValue({
        trips: [existingTrip],
        loading: false,
        initializing: false,
        createTrip: vi.fn(),
        updateTrip: vi.fn(),
        archiveTrip: vi.fn(),
        refreshTrips: vi.fn(),
      });

      render(<CreateTripModal {...defaultProps} />);

      expect(screen.queryByText(/welcome to chravel/i)).not.toBeInTheDocument();
    });

    it('should allow dismissing onboarding banner', async () => {
      vi.mocked(require('@/hooks/useTrips').useTrips).mockReturnValue({
        trips: [],
        loading: false,
        initializing: false,
        createTrip: vi.fn(),
        updateTrip: vi.fn(),
        archiveTrip: vi.fn(),
        refreshTrips: vi.fn(),
      });

      render(<CreateTripModal {...defaultProps} />);

      const dismissButton = screen.getByRole('button', { name: '' }); // Close button
      await userEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/welcome to chravel/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully create trip with valid data', async () => {
      const mockCreateTrip = vi.fn().mockResolvedValue(testFactories.createTrip());
      
      vi.mocked(require('@/hooks/useTrips').useTrips).mockReturnValue({
        trips: [],
        loading: false,
        initializing: false,
        createTrip: mockCreateTrip,
        updateTrip: vi.fn(),
        archiveTrip: vi.fn(),
        refreshTrips: vi.fn(),
      });

      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      const locationInput = screen.getByPlaceholderText(/e.g., paris, france/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(titleInput, 'Paris Adventure');
      await userEvent.type(locationInput, 'Paris, France');
      await userEvent.type(startDateInput, '2024-06-01');
      await userEvent.type(endDateInput, '2024-06-07');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTrip).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Paris Adventure',
            destination: 'Paris, France',
            start_date: '2024-06-01',
            end_date: '2024-06-07',
          })
        );
      });
    });

    it('should trim whitespace from form inputs', async () => {
      const mockCreateTrip = vi.fn().mockResolvedValue(testFactories.createTrip());
      
      vi.mocked(require('@/hooks/useTrips').useTrips).mockReturnValue({
        trips: [],
        loading: false,
        initializing: false,
        createTrip: mockCreateTrip,
        updateTrip: vi.fn(),
        archiveTrip: vi.fn(),
        refreshTrips: vi.fn(),
      });

      render(<CreateTripModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/e.g., summer in paris/i);
      const locationInput = screen.getByPlaceholderText(/e.g., paris, france/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(titleInput, '  Paris Adventure  ');
      await userEvent.type(locationInput, '  Paris, France  ');
      await userEvent.type(startDateInput, '2024-06-01');
      await userEvent.type(endDateInput, '2024-06-07');

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTrip).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Paris Adventure', // Should be trimmed
            destination: 'Paris, France', // Should be trimmed
          })
        );
      });
    });
  });
});
