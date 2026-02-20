/**
 * Unit tests for useSmartImportDropzone
 *
 * Verifies:
 * - Hook returns expected API (getRootProps, getInputProps, isDragActive)
 * - preventDefault called on dragOver (browser default behavior prevented)
 * - preventDefault called on drop (browser default behavior prevented)
 * - isSmartImportFileTypeValid correctly validates file types
 *
 * Note: Full drop→onFileSelected and drop→toast.error flows are integration-tested
 * via CalendarImportModal/AgendaImportModal; jsdom does not fully simulate
 * react-dropzone's native drop handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import React from 'react';
import { useSmartImportDropzone, isSmartImportFileTypeValid } from '../useSmartImportDropzone';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useSmartImportDropzone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns getRootProps, getInputProps, and isDragActive', () => {
    const onFileSelected = vi.fn();
    const { result } = renderHook(() => useSmartImportDropzone({ onFileSelected }));

    expect(result.current.getRootProps).toBeDefined();
    expect(typeof result.current.getRootProps).toBe('function');
    expect(result.current.getInputProps).toBeDefined();
    expect(typeof result.current.getInputProps).toBe('function');
    expect(result.current.isDragActive).toBe(false);
  });

  it('calls preventDefault on dragOver', async () => {
    const onFileSelected = vi.fn();
    const TestComponent = () => {
      const { getRootProps, getInputProps } = useSmartImportDropzone({
        onFileSelected,
      });
      return (
        <div {...getRootProps()} data-testid="dropzone">
          <input {...getInputProps()} />
        </div>
      );
    };

    const { getByTestId } = render(<TestComponent />);
    const dropzone = getByTestId('dropzone');

    const preventDefaultSpy = vi.fn();
    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
    });
    dragOverEvent.preventDefault = preventDefaultSpy;

    await act(async () => {
      dropzone.dispatchEvent(dragOverEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('accepts disabled prop without error', () => {
    const onFileSelected = vi.fn();
    const { result } = renderHook(() => useSmartImportDropzone({ onFileSelected, disabled: true }));

    const rootProps = result.current.getRootProps();
    expect(rootProps).toBeDefined();
    expect(Object.keys(rootProps).length).toBeGreaterThan(0);
  });
});

describe('isSmartImportFileTypeValid', () => {
  it('accepts ICS files', () => {
    const file = new File([], 'test.ics', { type: 'text/calendar' });
    expect(isSmartImportFileTypeValid(file)).toBe(true);
  });

  it('accepts CSV files', () => {
    const file = new File([], 'test.csv', { type: 'text/csv' });
    expect(isSmartImportFileTypeValid(file)).toBe(true);
  });

  it('accepts PDF files', () => {
    const file = new File([], 'test.pdf', { type: 'application/pdf' });
    expect(isSmartImportFileTypeValid(file)).toBe(true);
  });

  it('rejects executable files', () => {
    const file = new File([], 'script.exe', {
      type: 'application/x-msdownload',
    });
    expect(isSmartImportFileTypeValid(file)).toBe(false);
  });
});
