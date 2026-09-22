import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportQrCodeDataUrl } from './qr-code-export';

describe('QR code export', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves an exported QR image as an inline PNG', async () => {
    await expect(
      exportQrCodeDataUrl({ toDataURL: (callback) => callback('encoded-image') }),
    ).resolves.toBe('data:image/png;base64,encoded-image');
  });

  it('rejects safely when the native QR callback never resolves', async () => {
    vi.useFakeTimers();
    const result = exportQrCodeDataUrl({ toDataURL: () => undefined }, 100);
    const expectation = expect(result).rejects.toThrow('QR export timed out.');
    await vi.advanceTimersByTimeAsync(100);
    await expectation;
  });

  it('rejects when the QR export ref is unavailable', async () => {
    await expect(exportQrCodeDataUrl(null)).rejects.toThrow('QR export is unavailable.');
  });
});
