import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (next: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      role="switch"
      type="checkbox"
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

describe('LineupImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts URL names, allows removal, toggles replace mode, and imports', async () => {
    const onImportNames = vi.fn().mockResolvedValue(2);

    parseLineupURLMock.mockResolvedValue({
      isValid: true,
      names: ['Ali Wong', 'John Mulaney', 'Theo Von'],
      errors: [],
      sourceFormat: 'url',
    });

    render(<LineupImportModal isOpen={true} onClose={vi.fn()} onImportNames={onImportNames} />);

    fireEvent.change(screen.getByPlaceholderText('Paste lineup page URL'), {
      target: { value: 'https://example.com/artists' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
    });

    expect(await screen.findByText('3 names ready to import')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Theo Von' }));
    fireEvent.click(screen.getAllByRole('switch')[0]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));
    });

    expect(onImportNames).toHaveBeenCalledWith({
      names: ['Ali Wong', 'John Mulaney'],
      mode: 'replace',
      sourceUrl: 'https://example.com/artists',
    });
  });

  it('supports paste-text extraction flow', async () => {
    const onImportNames = vi.fn().mockResolvedValue(1);

    parseLineupTextMock.mockResolvedValue({
      isValid: true,
      names: ['Taylor Tomlinson'],
      errors: [],
      sourceFormat: 'text',
    });

    render(<LineupImportModal isOpen={true} onClose={vi.fn()} onImportNames={onImportNames} />);

    fireEvent.click(screen.getByLabelText('Paste text instead'));
    fireEvent.change(
      screen.getByPlaceholderText('Paste lineup text, artist lists, or performer names'),
      {
        target: { value: 'Taylor Tomlinson' },
      },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extract Names with AI' }));
    });

    expect(await screen.findByText('1 names ready to import')).toBeInTheDocument();
  });
});
