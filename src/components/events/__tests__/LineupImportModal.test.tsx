import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineupImportModal } from '../LineupImportModal';

const parseLineupURLMock = vi.fn();
const parseLineupTextMock = vi.fn();

vi.mock('@/utils/lineupImportParsers', () => ({
  parseLineupURL: (...args: unknown[]) => parseLineupURLMock(...args),
  parseLineupText: (...args: unknown[]) => parseLineupTextMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LineupImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts URL names, allows removal, toggles replace mode, and imports', async () => {
    const user = userEvent.setup();
    const onImportNames = vi.fn().mockResolvedValue(2);

    parseLineupURLMock.mockResolvedValue({
      isValid: true,
      names: ['Ali Wong', 'John Mulaney', 'Theo Von'],
      errors: [],
      sourceFormat: 'url',
    });

    render(<LineupImportModal isOpen={true} onClose={vi.fn()} onImportNames={onImportNames} />);

    await user.type(
      screen.getByPlaceholderText('Paste lineup page URL'),
      'https://example.com/artists',
    );
    // Button is labeled "Import" with icon, so we search by name /Import/i
    await user.click(screen.getByRole('button', { name: /Import/i }));

    // Use regex to be resilient against whitespace
    expect(await screen.findByText(/3 names ready to import/i)).toBeInTheDocument();

    const theoBadge = screen.getByText('Theo Von');
    const row = theoBadge.parentElement as HTMLElement;
    const removeButton = row.querySelector('button') as HTMLButtonElement;
    expect(removeButton).toBeTruthy();
    await user.click(removeButton);

    const replaceToggle = screen.getAllByRole('switch')[0];
    await user.click(replaceToggle);

    await user.click(screen.getByRole('button', { name: 'Replace all' }));

    expect(onImportNames).toHaveBeenCalledWith({
      names: ['Ali Wong', 'John Mulaney'],
      mode: 'replace',
      sourceUrl: 'https://example.com/artists',
    });
  });

  it('supports paste-text extraction flow', async () => {
    const user = userEvent.setup();
    const onImportNames = vi.fn().mockResolvedValue(1);

    parseLineupTextMock.mockResolvedValue({
      isValid: true,
      names: ['Taylor Tomlinson'],
      errors: [],
      sourceFormat: 'text',
    });

    render(<LineupImportModal isOpen={true} onClose={vi.fn()} onImportNames={onImportNames} />);

    await user.click(screen.getByLabelText('Paste text instead'));
    await user.type(
      screen.getByPlaceholderText('Paste lineup text, artist lists, or performer names'),
      'Taylor Tomlinson',
    );
    await user.click(screen.getByRole('button', { name: 'Extract Names with AI' }));

    expect(await screen.findByText(/1 names ready to import/i)).toBeInTheDocument();
  });
});
