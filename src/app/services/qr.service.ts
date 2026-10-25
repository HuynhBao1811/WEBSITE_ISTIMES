import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import { Delegate } from '../models/delegate.model';

@Injectable({
  providedIn: 'root'
})
export class QrService {
  constructor() {}

  // Generate QR code using MSSV as the primary payload
  async generateQrDataUrl(delegate: Delegate): Promise<string> {
    const payload = delegate.mssv.trim().toUpperCase();

    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H', // High error correction level for reliable badge scanning
        margin: 2,
        width: 360,
        color: {
          dark: '#003b73',
          light: '#ffffff'
        }
      });
    } catch {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320
      });
    }
  }

  async generateSimpleQr(text: string): Promise<string> {
    const payload = text.trim().toUpperCase();
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#003b73',
        light: '#ffffff'
      }
    });
  }

  downloadQrPng(dataUrl: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  }
}
