import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ApplicationSessionService } from '../../core/services/application-session';
import { AdmissionFormData } from '../../core/models/application-data';
import { DatePipe } from '@angular/common';

import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-application-preview',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './application-preview.html',
  styleUrl: './application-preview.scss',
})
export class ApplicationPreview implements OnInit, OnDestroy {
  private readonly session = inject(ApplicationSessionService);

  private readonly sanitizer = inject(DomSanitizer);

  application: AdmissionFormData | null = null;

  qualificationFile: File | null = null;
  aadhaarFile: File | null = null;
  photoFile: File | null = null;
  signatureFile: File | null = null;

  photoPreviewUrl = signal<SafeUrl | null>(null);
  signaturePreviewUrl = signal<SafeUrl | null>(null);
  qualificationPdfUrl = signal<SafeResourceUrl | null>(null);
  aadhaarPdfUrl = signal<SafeResourceUrl | null>(null);

  private qualificationBlobUrl: string | null = null;
  private aadhaarBlobUrl: string | null = null;
  private photoBlobUrl: string | null = null;
  private signatureBlobUrl: string | null = null;

  applicationNumber = '';

  declarationPoints = this.session.declarationPoints;

  applicationDate = new Date();

  ngOnInit(): void {
    this.loadApplication();
  }

  private async loadApplication(): Promise<void> {
    // -----------------------------
    // FORM DATA
    // -----------------------------

    this.application = this.session.getFormData();

    // -----------------------------
    // FILES
    // -----------------------------

    const files = await this.session.getFiles();
    this.qualificationFile = files.qualification;

    this.aadhaarFile = files.aadhaar;

    this.photoFile = files.photo;

    this.signatureFile = files.signature;

    // -----------------------------
    // APPLICATION NUMBER
    // -----------------------------

    this.applicationNumber = this.session.applicationNumber ?? '';

    // -----------------------------
    // CREATE PREVIEW URLs
    // -----------------------------

    this.createPreviewUrls();
  }

  private createPreviewUrls(): void {
    if (this.photoFile) {
      this.photoBlobUrl = URL.createObjectURL(this.photoFile);

      this.photoPreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.photoBlobUrl));
    }

    if (this.signatureFile) {
      this.signatureBlobUrl = URL.createObjectURL(this.signatureFile);

      this.signaturePreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.signatureBlobUrl));
    }

    if (this.qualificationFile) {
      this.qualificationBlobUrl = URL.createObjectURL(this.qualificationFile);

      this.qualificationPdfUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(this.qualificationBlobUrl),
      );
    }

    if (this.aadhaarFile) {
      this.aadhaarBlobUrl = URL.createObjectURL(this.aadhaarFile);

      this.aadhaarPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.aadhaarBlobUrl));
    }
  }

  ngOnDestroy(): void {
    if (this.photoBlobUrl) {
      URL.revokeObjectURL(this.photoBlobUrl);
    }

    if (this.signatureBlobUrl) {
      URL.revokeObjectURL(this.signatureBlobUrl);
    }

    if (this.qualificationBlobUrl) {
      URL.revokeObjectURL(this.qualificationBlobUrl);
    }

    if (this.aadhaarBlobUrl) {
      URL.revokeObjectURL(this.aadhaarBlobUrl);
    }
  }
}
