import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';

import { DatePipe } from '@angular/common';

import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';

import { ApplicationSessionService } from '../../core/services/application-session';
import { AdmissionFormData } from '../../core/models/application-data';
// import { environment } from '../../../environments/environment';
import { environment } from '../../../environments/environment.development';

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

  // ---------------------------------------------------------
  // APPLICATION DATA
  // ---------------------------------------------------------

  application: AdmissionFormData | null = null;

  applicationNumber = '';

  applicationDate = new Date();

  declarationPoints = this.session.declarationPoints;

  // ---------------------------------------------------------
  // DOCUMENT PREVIEW URLS
  // ---------------------------------------------------------

  photoPreviewUrl = signal<SafeUrl | null>(null);

  signaturePreviewUrl = signal<SafeUrl | null>(null);

  qualificationPdfUrl = signal<SafeResourceUrl | null>(null);

  aadhaarPdfUrl = signal<SafeResourceUrl | null>(null);

  // ---------------------------------------------------------
  // DOCUMENT URLS
  // ---------------------------------------------------------

  private photoBlobUrl: string | null = null;

  private signatureBlobUrl: string | null = null;

  private qualificationBlobUrl: string | null = null;

  private aadhaarBlobUrl: string | null = null;

  // ---------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------

  ngOnInit(): void {
    this.loadApplication();
  }

  // ---------------------------------------------------------
  // LOAD APPLICATION
  // ---------------------------------------------------------

  private loadApplication(): void {
    const applicationId = this.session.applicationId;

    if (!applicationId) {
      return;
    }

    this.applicationNumber = this.session.applicationNumber ?? '';

    // -------------------------------------------------------
    // GET LATEST APPLICATION FROM BACKEND
    // -------------------------------------------------------

    this.session.getApplication().subscribe({
      next: (data: any) => {
        this.application = this.mapApplicationData(data);

        this.applicationNumber = data?.application_number ?? this.applicationNumber;

        this.applicationDate = data?.created_at ? new Date(data.created_at) : new Date();

        this.createDocumentPreviewUrls(data);
      },

      error: () => {},
    });
  }

  // ---------------------------------------------------------
  // MAP BACKEND RESPONSE
  // ---------------------------------------------------------

  private mapApplicationData(data: any): AdmissionFormData {
    const currentAddress = data?.current_address ?? null;

    const permanentAddress = data?.permanent_address ?? null;

    const education = data?.education ?? null;

    return {
      ...data,

      // -----------------------------------------------------
      // STUDENT
      // -----------------------------------------------------

      fullName: data?.full_name ?? '',

      email: data?.email ?? '',

      mobile: data?.mobile ?? '',

      // -----------------------------------------------------
      // PARENTS
      // -----------------------------------------------------

      fatherName: data?.father_name ?? '',

      fatherMobile: data?.father_mobile ?? '',

      motherName: data?.mother_name ?? '',

      motherMobile: data?.mother_mobile ?? '',

      // -----------------------------------------------------
      // CURRENT ADDRESS
      // -----------------------------------------------------

      currentAddressLine1: currentAddress?.address_line1 ?? '',

      currentAddressLine2: currentAddress?.address_line2 ?? '',

      currentCity: currentAddress?.city ?? '',

      currentDistrict: currentAddress?.district ?? '',

      currentState: currentAddress?.state ?? '',

      currentPincode: currentAddress?.pincode ?? '',

      // -----------------------------------------------------
      // PERMANENT ADDRESS
      // -----------------------------------------------------

      permanentAddressLine1: permanentAddress?.address_line1 ?? '',

      permanentAddressLine2: permanentAddress?.address_line2 ?? '',

      permanentCity: permanentAddress?.city ?? '',

      permanentDistrict: permanentAddress?.district ?? '',

      permanentState: permanentAddress?.state ?? '',

      permanentPincode: permanentAddress?.pincode ?? '',

      // -----------------------------------------------------
      // SAME ADDRESS
      // -----------------------------------------------------

      sameAddress: data?.same_address ?? false,

      // -----------------------------------------------------
      // EDUCATION
      // -----------------------------------------------------

      highestQualification:
        education?.highest_qualification?.qualification ??
        education?.highest_qualification?.id ??
        data?.highest_qualification ??
        '',

      // -----------------------------------------------------
      // DECLARATION
      // -----------------------------------------------------

      declarationAccepted: data?.declaration_accepted ?? false,
    } as AdmissionFormData;
  }

  // ---------------------------------------------------------
  // DOCUMENT PREVIEW URLS
  // ---------------------------------------------------------

  private createDocumentPreviewUrls(data: any): void {
    const documents = Array.isArray(data?.documents) ? data.documents : [];

    const getDocumentUrl = (documentType: string): string => {
      const document = documents.find((item: any) => item?.document_type === documentType);

      return `${environment.backEndUrl}${document?.file ?? ''}`;
    };

    const qualificationUrl = getDocumentUrl('qualification');

    const aadhaarUrl = getDocumentUrl('aadhaar');

    const photoUrl = getDocumentUrl('photo');

    const signatureUrl = getDocumentUrl('signature');

    if (qualificationUrl) {
      this.loadAsBlob(qualificationUrl, 'qualification');
    }

    if (aadhaarUrl) {
      this.loadAsBlob(aadhaarUrl, 'aadhaar');
    }

    if (photoUrl) {
      this.loadAsBlob(photoUrl, 'photo');
    }

    if (signatureUrl) {
      this.loadAsBlob(signatureUrl, 'signature');
    }
  }

  private loadAsBlob(url: string, type: 'qualification' | 'aadhaar' | 'photo' | 'signature'): void {
    this.session.getFile(url).subscribe({
      next: (blob: Blob) => {
        const blobUrl = URL.createObjectURL(blob);

        switch (type) {
          case 'qualification':
            this.qualificationBlobUrl = blobUrl;

            this.qualificationPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
            break;

          case 'aadhaar':
            this.aadhaarBlobUrl = blobUrl;

            this.aadhaarPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
            break;

          case 'photo':
            this.photoBlobUrl = blobUrl;

            this.photoPreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
            break;

          case 'signature':
            this.signatureBlobUrl = blobUrl;

            this.signaturePreviewUrl.set(this.sanitizer.bypassSecurityTrustUrl(blobUrl));
            break;
        }
      },

      error: () => {},
    });
  }

  // ---------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------

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
