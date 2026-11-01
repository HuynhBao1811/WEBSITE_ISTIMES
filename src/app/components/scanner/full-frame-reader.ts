import jsQR from 'jsqr';

/** A second pass reads source pixels rather than the smaller on-screen preview. */
export class FullFrameReader {
  private readonly canvas = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d', {willReadFrequently: true});
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;

  constructor(private readonly video: HTMLVideoElement,
    private readonly onCode: (code: string) => void,
    private readonly shouldRead: () => boolean = () => true) {}

  start(): void {
    this.stop();
    this.stopped = false;
    this.timer = setTimeout(() => this.read(), 250);
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private read(): void {
    if (this.stopped) return;
    try {
      if (!document.hidden && this.shouldRead() && this.context && this.video.readyState >= 2 && this.video.videoWidth) {
        const scale = Math.min(1, 1600 / Math.max(this.video.videoWidth, this.video.videoHeight));
        this.canvas.width = Math.round(this.video.videoWidth * scale);
        this.canvas.height = Math.round(this.video.videoHeight * scale);
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const image = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const code = jsQR(image.data, image.width, image.height, {inversionAttempts: 'attemptBoth'});
        if (code?.data && !this.stopped) this.onCode(code.data);
      }
    } catch { /* Unready/stopped camera frames are transient. Main reader continues. */ }
    if (!this.stopped) this.timer = setTimeout(() => this.read(), 300);
  }
}
