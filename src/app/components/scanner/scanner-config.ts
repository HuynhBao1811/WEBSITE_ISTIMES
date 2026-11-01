import { Html5QrcodeCameraScanConfig } from 'html5-qrcode';

/** Omitting qrbox scans the complete video, not a square in the centre. */
export function createScanConfig(cameraId: string, facing: 'environment' | 'user'): Html5QrcodeCameraScanConfig {
  return {
    fps: 25,
    disableFlip: false,
    videoConstraints: {
      ...(cameraId ? {deviceId: {exact: cameraId}} : {facingMode: {ideal: facing}}),
      width: {ideal: 1280},
      height: {ideal: 720}
    }
  };
}
