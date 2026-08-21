import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { ApiService, apiError } from '../../core/services/api.service';
import { API } from '../../core/models/endpoints';
import { ToastService } from '../../core/services/toast.service';
import { NetroIcon } from '../../ui/icon';

@Component({
  selector: 'app-punch-evidence-modal',
  standalone: true,
  imports: [NgIf, NetroIcon],
  template: `
    <div class="evidence-modal-backdrop" (click)="onCancel()">
      <div class="evidence-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ title }}</h3>
            <p class="modal-subtitle">{{ subtitle }}</p>
          </div>
          <button type="button" class="btn-close" (click)="onCancel()" title="Close">
            <netro-icon name="x" [size]="18" />
          </button>
        </div>

        <!-- Mode: SIGNATURE -->
        <div *ngIf="mode === 'SIGNATURE'" class="modal-body">
          <div class="signature-canvas-container">
            <canvas
              #signatureCanvas
              width="460"
              height="200"
              class="signature-canvas"
              (mousedown)="startDrawing($event)"
              (mousemove)="draw($event)"
              (mouseup)="stopDrawing()"
              (mouseleave)="stopDrawing()"
              (touchstart)="startDrawingTouch($event)"
              (touchmove)="drawTouch($event)"
              (touchend)="stopDrawing()"
            ></canvas>
          </div>
          <div class="signature-toolbar">
            <button type="button" class="btn-secondary" (click)="clearSignature()">
              <netro-icon name="trash" [size]="14" /> Clear
            </button>
            <p class="hint-text">Sign with your mouse, trackpad, or finger</p>
          </div>
        </div>

        <!-- Mode: CAMERA or UPLOAD -->
        <div *ngIf="mode !== 'SIGNATURE'" class="modal-body">
          <!-- Live Camera Stream -->
          <div *ngIf="isCameraActive() && !previewUrl()" class="camera-stream-wrap">
            <video #videoElement autoplay playsinline class="camera-video"></video>
            <button type="button" class="btn-snap" (click)="captureSnapshot()" [disabled]="uploading()">
              <div class="snap-ring"></div>
            </button>
          </div>

          <!-- Captured/Uploaded Preview -->
          <div *ngIf="previewUrl()" class="preview-wrap">
            <img [src]="previewUrl()" alt="Captured Evidence" class="preview-img" />
            <div class="preview-overlay" *ngIf="!uploading()">
              <button type="button" class="btn-retake" (click)="retake()">
                <netro-icon name="refresh" [size]="14" /> Retake / Choose Another
              </button>
            </div>
          </div>

          <!-- Fallback File Upload Selector when camera is off -->
          <div *ngIf="!isCameraActive() && !previewUrl()" class="upload-dropzone">
            <netro-icon name="camera" [size]="32" class="dropzone-icon" />
            <p class="dropzone-title">Capture or upload photo</p>
            <p class="dropzone-desc">Take a photo using your webcam or select a file from your device</p>
            <div class="dropzone-actions">
              <button type="button" class="btn-primary" (click)="startCamera()">
                <netro-icon name="camera" [size]="16" /> Open Camera
              </button>
              <label class="btn-secondary file-label">
                <netro-icon name="document" [size]="16" /> Browse File
                <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" (change)="onFileSelected($event)" />
              </label>
            </div>
          </div>

          <!-- Upload Status Indicator -->
          <div *ngIf="uploading()" class="uploading-banner">
            <netro-icon name="spinner" [size]="16" [spin]="true" />
            <span>Uploading evidence securely to Cloudflare R2...</span>
          </div>

          <div *ngIf="errorMsg()" class="error-banner">
            {{ errorMsg() }}
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button type="button" class="btn-cancel" (click)="onCancel()" [disabled]="uploading()">
            Cancel
          </button>
          <button
            type="button"
            class="btn-confirm"
            [disabled]="uploading() || (!previewUrl() && !hasSignature())"
            (click)="onConfirm()"
          >
            <netro-icon [name]="uploading() ? 'spinner' : 'check'" [size]="16" [spin]="uploading()" />
            <span>Confirm & Attach</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .evidence-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }
    .evidence-modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
    }
    .btn-close:hover { color: #0f172a; }
    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .camera-stream-wrap {
      position: relative;
      width: 100%;
      height: 300px;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .btn-snap {
      position: absolute;
      bottom: 16px;
      width: 54px;
      height: 54px;
      border-radius: 27px;
      background: rgba(255, 255, 255, 0.9);
      border: 3px solid #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .snap-ring {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #6366f1;
    }
    .preview-wrap {
      position: relative;
      width: 100%;
      max-height: 300px;
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #e2e8f0;
    }
    .preview-img {
      max-width: 100%;
      max-height: 280px;
      object-fit: contain;
    }
    .preview-overlay {
      position: absolute;
      bottom: 12px;
      right: 12px;
    }
    .upload-dropzone {
      width: 100%;
      padding: 36px 20px;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .dropzone-icon {
      color: #6366f1;
      margin-bottom: 12px;
    }
    .dropzone-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }
    .dropzone-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 20px;
      max-width: 320px;
    }
    .dropzone-actions {
      display: flex;
      gap: 10px;
    }
    .btn-primary {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1.5px solid #cbd5e1;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-retake {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .file-label {
      cursor: pointer;
    }
    .signature-canvas-container {
      width: 100%;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      background: #fdfdfd;
      cursor: crosshair;
      touch-action: none;
    }
    .signature-canvas {
      width: 100%;
      height: 200px;
      display: block;
    }
    .signature-toolbar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hint-text {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }
    .uploading-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #4f46e5;
      font-weight: 500;
    }
    .error-banner {
      width: 100%;
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 12.5px;
      font-weight: 500;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }
    .btn-cancel {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      padding: 9px 16px;
      cursor: pointer;
      border-radius: 8px;
    }
    .btn-confirm {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class PunchEvidenceModalComponent implements OnDestroy {
  @Input() title = 'Attach Evidence';
  @Input() subtitle = 'Provide the required photo or signature to complete your punch';
  @Input() mode: 'CAMERA' | 'SIGNATURE' | 'UPLOAD' = 'CAMERA';
  @Input() fieldKey = 'selfie';
  @Input() entityId = 'web-punch';

  @Output() confirmed = new EventEmitter<{ publicUrl: string; fileKey: string; fieldKey: string }>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly isCameraActive = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly fileKey = signal<string>('');
  readonly uploading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly hasSignature = signal(false);

  private mediaStream: MediaStream | null = null;
  private isDrawing = false;
  private ctx: CanvasRenderingContext2D | null = null;

  ngOnDestroy(): void {
    this.stopCamera();
  }

  startCamera(): void {
    this.errorMsg.set(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMsg.set('Webcam access is not supported by your browser.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        this.mediaStream = stream;
        this.isCameraActive.set(true);
        setTimeout(() => {
          if (this.videoElement) {
            this.videoElement.nativeElement.srcObject = stream;
          }
        }, 50);
      })
      .catch((err) => {
        this.errorMsg.set('Could not access camera. Please verify camera permissions or choose a file.');
        console.warn('Camera error:', err);
      });
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
  }

  captureSnapshot(): void {
    if (!this.videoElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.stopCamera();

    canvas.toBlob((blob) => {
      if (blob) {
        this.uploadBlob(blob);
      }
    }, 'image/jpeg', 0.85);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadBlob(file);
  }

  retake(): void {
    if (this.fileKey()) {
      this.api.delete(API.uploadsDeleteFile, { fileKey: this.fileKey() }).subscribe();
    }
    this.previewUrl.set(null);
    this.fileKey.set('');
    this.errorMsg.set(null);
  }

  private uploadBlob(blob: Blob): void {
    this.uploading.set(true);
    this.errorMsg.set(null);

    // 1. Request presigned URL from backend
    this.api
      .post<{ uploadUrl: string; fileKey: string; publicUrl: string }>(API.uploadsPresignedUrl, {
        purpose: 'attendance',
        contentType: 'image/jpeg',
        entityId: this.entityId || 'web-punch',
      })
      .subscribe({
        next: (res) => {
          if (!res.data) {
            this.uploading.set(false);
            this.errorMsg.set('Could not obtain upload URL.');
            return;
          }
          const { uploadUrl, fileKey, publicUrl } = res.data;
          // 2. Direct binary upload to R2
          fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/jpeg' },
          })
            .then((uploadRes) => {
              if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);
              this.uploading.set(false);
              this.previewUrl.set(publicUrl || URL.createObjectURL(blob));
              this.fileKey.set(fileKey);
            })
            .catch((err) => {
              this.uploading.set(false);
              this.errorMsg.set(err.message || 'Failed to upload photo to storage.');
            });
        },
        error: (err) => {
          this.uploading.set(false);
          this.errorMsg.set(apiError(err, 'Failed to request upload signature.'));
        },
      });
  }

  // ── Signature Canvas Handlers ──
  private initSignatureContext(): void {
    if (!this.signatureCanvas || this.ctx) return;
    const canvas = this.signatureCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.strokeStyle = '#0f172a';
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
  }

  startDrawing(e: MouseEvent): void {
    this.initSignatureContext();
    if (!this.ctx || !this.signatureCanvas) return;
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  draw(e: MouseEvent): void {
    if (!this.isDrawing || !this.ctx || !this.signatureCanvas) return;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.stroke();
    this.hasSignature.set(true);
  }

  startDrawingTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!e.touches[0]) return;
    this.initSignatureContext();
    if (!this.ctx || !this.signatureCanvas) return;
    this.isDrawing = true;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  }

  drawTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || !this.ctx || !this.signatureCanvas || !e.touches[0]) return;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.ctx.stroke();
    this.hasSignature.set(true);
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    if (!this.signatureCanvas || !this.ctx) return;
    const canvas = this.signatureCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasSignature.set(false);
  }

  onConfirm(): void {
    if (this.mode === 'SIGNATURE') {
      if (!this.signatureCanvas) return;
      const canvas = this.signatureCanvas.nativeElement;
      canvas.toBlob((blob) => {
        if (blob) {
          this.uploading.set(true);
          this.api
            .post<{ uploadUrl: string; fileKey: string; publicUrl: string }>(API.uploadsPresignedUrl, {
              purpose: 'attendance',
              contentType: 'image/jpeg',
              entityId: this.entityId || 'web-punch',
            })
            .subscribe({
              next: (res) => {
                if (!res.data) {
                  this.uploading.set(false);
                  this.errorMsg.set('Could not obtain upload URL.');
                  return;
                }
                const { uploadUrl, fileKey, publicUrl } = res.data;
                fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } })
                  .then((uploadRes) => {
                    if (!uploadRes.ok) throw new Error('Signature upload failed');
                    this.confirmed.emit({ publicUrl, fileKey, fieldKey: this.fieldKey });
                  })
                  .catch((err) => {
                    this.uploading.set(false);
                    this.errorMsg.set(err.message || 'Signature upload error');
                  });
              },
              error: (err) => {
                this.uploading.set(false);
                this.errorMsg.set(apiError(err, 'Failed to upload signature.'));
              },
            });
        }
      }, 'image/jpeg', 0.9);
      return;
    }

    if (this.previewUrl() && this.fileKey()) {
      this.confirmed.emit({
        publicUrl: this.previewUrl()!,
        fileKey: this.fileKey(),
        fieldKey: this.fieldKey,
      });
    }
  }

  onCancel(): void {
    this.stopCamera();
    this.cancelled.emit();
  }
}
