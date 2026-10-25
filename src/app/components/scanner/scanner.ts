import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeSupportedFormats
} from 'html5-qrcode';
import { DelegateService } from '../../services/delegate.service';
import { FeedbackService } from '../../services/feedback.service';
import { QrService } from '../../services/qr.service';
import { DelegateCardComponent } from '../delegate-card/delegate-card';
import { Delegate } from '../../models/delegate.model';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, DelegateCardComponent],
  templateUrl: './scanner.html',
  styleUrl: './scanner.css'
})
export class ScannerComponent implements OnInit, OnDestroy {
  protected readonly delegateService = inject(DelegateService);
  protected readonly feedback = inject(FeedbackService);
  protected readonly qrService = inject(QrService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // Component state
  readonly isCameraScanning = signal(false);
  readonly cameraErrorMessage = signal<string | null>(null);
  readonly scanNotification = signal<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  readonly manualCode = signal('');
  readonly availableCameras = signal<Array<{ id: string; label: string }>>([]);
  readonly selectedCameraId = signal<string>('');
  readonly isCameraMirrored = signal<boolean>(false); // Mặc định KHÔNG lật gương cho camera sau điện thoại
  readonly preferredFacingMode = signal<'environment' | 'user'>('environment'); // Mặc định camera sau
  readonly isScanSuccessPulse = signal<boolean>(false);

  // Sample QR Modal for testing
  readonly showSampleQrModal = signal(false);
  readonly sampleQrImages = signal<Array<{ delegate: Delegate; qrUrl: string }>>([]);
  readonly currentSampleIndex = signal(0);

  // Debounce rapid repeat scanning of the same delegate
  private lastScannedCode = '';
  private lastScannedTime = 0;

  toggleMirror(): void {
    this.isCameraMirrored.update(v => !v);
    this.applyMirrorToVideo();
  }

  // Directly sets video CSS transform via DOM in case Angular encapsulation or dynamic library elements interfere
  applyMirrorToVideo(): void {
    const container = document.getElementById(this.scannerElementId);
    if (!container) return;
    const video = container.querySelector('video');
    if (video) {
      // Ensure playsinline for mobile Safari/Chrome
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;

      const isMirrored = this.isCameraMirrored();
      const val = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
      video.style.transform = val;
      (video.style as unknown as Record<string, string>)['-webkit-transform'] = val;
    }
  }

  async switchCameraFacing(): Promise<void> {
    const cams = this.availableCameras();
    if (cams.length > 1) {
      const currentIndex = cams.findIndex(c => c.id === this.selectedCameraId());
      const nextIndex = (currentIndex + 1) % cams.length;
      const nextCam = cams[nextIndex];
      this.selectedCameraId.set(nextCam.id);

      const nextLabel = (nextCam.label || '').toLowerCase();
      if (nextLabel.includes('front') || nextLabel.includes('trước') || nextLabel.includes('user')) {
        this.preferredFacingMode.set('user');
        this.isCameraMirrored.set(true); // Selfie camera lật gương
      } else {
        this.preferredFacingMode.set('environment');
        this.isCameraMirrored.set(false); // Camera sau KHÔNG lật gương
      }
    } else {
      const nextMode = this.preferredFacingMode() === 'environment' ? 'user' : 'environment';
      this.preferredFacingMode.set(nextMode);
      // Tự động: Camera trước thì lật gương, camera sau thì không lật
      this.isCameraMirrored.set(nextMode === 'user');
    }

    if (this.isCameraScanning()) {
      await this.stopCamera();
      await this.startCamera();
    }
  }

  private html5QrCode: Html5Qrcode | null = null;
  private readonly scannerElementId = 'qr-reader-container';

  ngOnInit(): void {
    this.initCameraList();
  }

  async openSampleQrModal(): Promise<void> {
    const delegates = this.delegateService.delegates().slice(0, 10);
    const list: Array<{ delegate: Delegate; qrUrl: string }> = [];
    for (const d of delegates) {
      const qrUrl = await this.qrService.generateQrDataUrl(d);
      list.push({ delegate: d, qrUrl });
    }
    this.sampleQrImages.set(list);
    this.showSampleQrModal.set(true);
  }

  closeSampleQrModal(): void {
    this.showSampleQrModal.set(false);
  }

  nextSampleQr(): void {
    const total = this.sampleQrImages().length;
    if (total > 0) {
      this.currentSampleIndex.set((this.currentSampleIndex() + 1) % total);
    }
  }

  prevSampleQr(): void {
    const total = this.sampleQrImages().length;
    if (total > 0) {
      this.currentSampleIndex.set((this.currentSampleIndex() - 1 + total) % total);
    }
  }

  downloadCurrentSampleQr(): void {
    const current = this.sampleQrImages()[this.currentSampleIndex()];
    if (current) {
      this.qrService.downloadQrPng(current.qrUrl, `QR_${current.delegate.mssv}_${current.delegate.fullName}.png`);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async initCameraList(): Promise<void> {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        this.availableCameras.set(devices);
        if (!this.selectedCameraId()) {
          // Look for rear/back camera keywords
          const backCamera = devices.find(d => {
            const l = (d.label || '').toLowerCase();
            return l.includes('back') || l.includes('sau') || l.includes('rear') || l.includes('environment');
          });
          if (backCamera) {
            this.selectedCameraId.set(backCamera.id);
            this.preferredFacingMode.set('environment');
            this.isCameraMirrored.set(false);
          }
          // Note: If no labeled back camera is found, keep selectedCameraId empty
          // so startCamera() uses { facingMode: { ideal: 'environment' } } which opens phone rear camera!
        }
      }
    } catch {
      // Camera permission might not be granted yet
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.isCameraScanning()) {
      await this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async startCamera(): Promise<void> {
    this.cameraErrorMessage.set(null);
    try {
      if (!this.html5QrCode) {
        // Ultra-sensitive setup: Only QR format + Native browser BarcodeDetector API for instant hardware scan
        this.html5QrCode = new Html5Qrcode(this.scannerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          verbose: false
        });
      }

      const cameraId = this.selectedCameraId();
      // On mobile devices, facingMode: { ideal: 'environment' } guarantees rear camera
      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: { ideal: this.preferredFacingMode() } };

      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 25, // 25 scans per second for high responsiveness
        disableFlip: false, // Detects both standard and mirrored QR codes
        videoConstraints: {
          facingMode: { ideal: this.preferredFacingMode() },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };

      await this.html5QrCode.start(
        cameraConfig,
        scanConfig,
        (decodedText: string) => {
          this.handleScannedCode(decodedText);
        },
        () => {
          // Frame scan error (no QR detected in frame)
        }
      );

      this.isCameraScanning.set(true);

      // Refresh camera devices list now that permission is granted
      this.initCameraList();

      // Ensure mirror transform is applied directly to the video element
      this.applyMirrorToVideo();
      setTimeout(() => this.applyMirrorToVideo(), 150);
      setTimeout(() => this.applyMirrorToVideo(), 350);
      setTimeout(() => this.applyMirrorToVideo(), 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.cameraErrorMessage.set(
        'Không thể mở camera. Vui lòng cấp quyền truy cập Camera cho trình duyệt hoặc thử tính năng "Quét thử Demo" bên dưới.'
      );
      this.isCameraScanning.set(false);
      console.error('Camera scan error:', msg);
    }
  }

  async stopCamera(): Promise<void> {
    if (this.html5QrCode && this.isCameraScanning()) {
      try {
        await this.html5QrCode.stop();
        this.isCameraScanning.set(false);
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
  }

  onCameraChange(cameraId: string): void {
    this.selectedCameraId.set(cameraId);
    if (this.isCameraScanning()) {
      this.stopCamera().then(() => this.startCamera());
    }
  }

  // Handle scanned string from camera, file, or simulation
  handleScannedCode(rawCode: string): void {
    const now = Date.now();
    // Debounce: prevent rapid re-scans of identical code within 2.5s
    if (rawCode === this.lastScannedCode && (now - this.lastScannedTime) < 2500) {
      return;
    }
    this.lastScannedCode = rawCode;
    this.lastScannedTime = now;

    // Flash green pulse on scan frame for instant tactile feedback
    this.isScanSuccessPulse.set(true);
    setTimeout(() => this.isScanSuccessPulse.set(false), 700);

    const result = this.delegateService.parseQrCode(rawCode);

    if (result.success && result.delegate) {
      if (result.alreadyCheckedIn) {
        this.feedback.playWarningSound();
        this.scanNotification.set({
          type: 'warning',
          message: `ĐỒNG CHÍ ĐÃ ĐIỂM DANH: ${result.delegate.fullName} (MSSV: ${result.delegate.mssv} - ${result.delegate.unit})`
        });
      } else {
        this.feedback.playSuccessSound();
        this.feedback.fireGrandConfetti();
        this.scanNotification.set({
          type: 'success',
          message: `XÁC THỰC THÀNH CÔNG: Chào mừng đồng chí ${result.delegate.fullName} (MSSV: ${result.delegate.mssv} - ${result.delegate.unit})`
        });
      }
    } else {
      this.feedback.playErrorSound();
      this.scanNotification.set({
        type: 'error',
        message: result.message
      });
    }

    setTimeout(() => {
      this.scanNotification.set(null);
    }, 6000);
  }

  simulateScan(mssv: string): void {
    this.handleScannedCode(mssv);
  }

  onManualSubmit(): void {
    const code = this.manualCode().trim();
    if (code) {
      this.handleScannedCode(code);
      this.manualCode.set('');
    }
  }

  triggerFileUpload(): void {
    this.fileInputRef?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode(this.scannerElementId);
      }
      const decodedText = await this.html5QrCode.scanFile(file, true);
      this.handleScannedCode(decodedText);
    } catch {
      this.feedback.playErrorSound();
      this.scanNotification.set({
        type: 'error',
        message: 'Không tìm thấy mã QR hợp lệ trong hình ảnh đã chọn.'
      });
    } finally {
      target.value = '';
    }
  }

  onToggleCheckIn(mssv: string): void {
    this.delegateService.toggleCheckIn(mssv);
    const updated = this.delegateService.getDelegateByMssv(mssv);
    if (updated?.checkedIn) {
      this.feedback.playSuccessSound();
      this.feedback.fireConfetti();
    }
  }

  onPrintCard(delegate: Delegate): void {
    window.print();
  }

  onScanNext(): void {
    this.delegateService.setCurrentDelegate(null);
    this.scanNotification.set(null);
    if (!this.isCameraScanning()) {
      this.startCamera();
    }
  }
}
