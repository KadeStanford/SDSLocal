export interface QrCodeDataRef {
  readonly toDataURL?: (callback: (data: string) => void) => void;
}

export function exportQrCodeDataUrl(ref: QrCodeDataRef | null, timeoutMs = 5_000) {
  return new Promise<string>((resolve, reject) => {
    if (!ref?.toDataURL) {
      reject(new Error('QR export is unavailable.'));
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('QR export timed out.'));
    }, timeoutMs);

    try {
      ref.toDataURL((data) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (!data) {
          reject(new Error('QR export returned no image data.'));
          return;
        }
        resolve(`data:image/png;base64,${data}`);
      });
    } catch (error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    }
  });
}
