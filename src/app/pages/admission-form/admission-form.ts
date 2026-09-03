import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { AdmissionApiService } from '../../core/services/admission-api';
import { ApplicationSessionService } from '../../core/services/application-session';
import { EducationalQualification } from '../../core/models/education-qualification';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-admission-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admission-form.html',
  styleUrl: './admission-form.scss',
})
export class AdmissionForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly admissionApi = inject(AdmissionApiService);
  private readonly session = inject(ApplicationSessionService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // =========================================================
  // LOADING STATES
  // =========================================================

  loading = true;

  /**
   * General API saving state.
   */
  saving = false;

  /**
   * Dedicated Continue button loading state.
   *
   * This prevents the button from getting stuck in
   * "Saving..." when an API request fails.
   */
  isSavingStep = false;

  /**
   * Final submit loading state.
   */
  submitting = false;

  /**
   * Document upload state.
   */
  uploadingDocuments = false;

  // =========================================================
  // GENERAL STATE
  // =========================================================

  errorMessage = '';

  applicationNumber = '';

  currentStep = 1;

  readonly totalSteps = 5;

  uploadingDocumentType: string | null = null;

  readonly uploadingTypes = new Set<string>();

  // =========================================================
  // FILE STATE
  // =========================================================

  qualificationFile: File | null = null;
  aadhaarFile: File | null = null;
  photoFile: File | null = null;
  signatureFile: File | null = null;

  qualificationFileName = '';
  aadhaarFileName = '';
  photoFileName = '';
  signatureFileName = '';

  fileErrors: Record<string, string> = {};

  photoPreviewUrl = '';

  signaturePreviewUrl = '';

  educationalQualifications: EducationalQualification[] | [] = [];

  existingDocuments: Record<string, any> = {};

  existingQualificationFileUrl = '';
  existingAadhaarFileUrl = '';
  existingPhotoFileUrl = '';
  existingSignatureFileUrl = '';

  // =========================================================
  // DECLARATION
  // =========================================================

  declarationPoints: string[] = [];

  // =========================================================
  // FORM
  // =========================================================

  readonly studentForm = this.fb.nonNullable.group({
    // -------------------------------------------------------
    // STEP 1 - STUDENT
    // -------------------------------------------------------

    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    email: ['', [Validators.required, Validators.email]],

    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    // -------------------------------------------------------
    // STEP 2 - PARENT / GUARDIAN
    // -------------------------------------------------------

    fatherName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    fatherMobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    motherName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    motherMobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    // -------------------------------------------------------
    // STEP 3 - CURRENT ADDRESS
    // -------------------------------------------------------

    currentAddressLine1: ['', [Validators.required, Validators.maxLength(150)]],

    currentAddressLine2: ['', [Validators.maxLength(150)]],

    currentCity: ['', [Validators.required, Validators.maxLength(100)]],

    currentDistrict: ['', [Validators.required, Validators.maxLength(100)]],

    currentState: ['', [Validators.required, Validators.maxLength(100)]],

    currentPincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],

    // -------------------------------------------------------
    // SAME ADDRESS
    // -------------------------------------------------------

    sameAddress: [false],

    // -------------------------------------------------------
    // PERMANENT ADDRESS
    // -------------------------------------------------------

    permanentAddressLine1: ['', [Validators.required, Validators.maxLength(150)]],

    permanentAddressLine2: ['', [Validators.maxLength(150)]],

    permanentCity: ['', [Validators.required, Validators.maxLength(100)]],

    permanentDistrict: ['', [Validators.required, Validators.maxLength(100)]],

    permanentState: ['', [Validators.required, Validators.maxLength(100)]],

    permanentPincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],

    // -------------------------------------------------------
    // STEP 4 - EDUCATION
    // -------------------------------------------------------

    highestQualification: ['', Validators.required],

    qualificationCertificate: this.fb.control<File | null>(null, Validators.required),

    aadhaar: this.fb.control<File | null>(null, Validators.required),

    photo: this.fb.control<File | null>(null, Validators.required),

    signature: this.fb.control<File | null>(null, Validators.required),

    // -------------------------------------------------------
    // STEP 5 - DECLARATION
    // -------------------------------------------------------

    declarationAccepted: [false, Validators.requiredTrue],
  });

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.declarationPoints = this.session.declarationPoints;

    this.loadEducationalQualifications();

    this.initializeApplication();

    this.setupAddressSync();
  }

  // =========================================================
  // Educational Qualifications List
  // =========================================================

  private loadEducationalQualifications(): void {
    this.admissionApi.getEducationalQualifications().subscribe({
      next: (response) => {
        this.educationalQualifications = Array.isArray(response) ? response : (response ?? []);
      },

      error: (error) => {
        this.educationalQualifications = [];

        this.errorMessage = 'Unable to load educational qualifications. Please refresh the page.';
      },
    });
  }

  // =========================================================
  // APPLICATION INITIALIZATION
  // =========================================================

  initializeApplication(): void {
    this.errorMessage = '';

    /*
     * Existing application
     */
    if (this.session.hasActiveSession()) {
      this.applicationNumber = this.session.applicationNumber ?? '';

      this.updateUrl();

      this.loadExistingApplication();

      return;
    }

    /*
     * New application
     */
    this.createApplication();
  }

  // =========================================================
  // LOAD EXISTING APPLICATION
  // =========================================================

  private loadExistingApplication(): void {
    this.loading = true;

    this.admissionApi.getApplication(this.session.applicationId!).subscribe({
      next: (response) => {
        const data = response?.data ?? response;

        if (data) {
          this.populateForm(data);
        }

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error?.error?.detail || 'Unable to load your application. Please try again.';

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // CREATE APPLICATION
  // =========================================================

  private createApplication(): void {
    this.loading = true;

    this.errorMessage = '';

    this.admissionApi.startApplication().subscribe({
      next: (response) => {
        if (
          !response?.success ||
          !response?.data?.id ||
          !response?.data?.application_number ||
          !response?.data?.access_token
        ) {
          this.loading = false;

          this.errorMessage = 'Unable to create your application.';

          this.cdr.detectChanges();

          return;
        }

        this.session.setSession(
          response.data.id,
          response.data.application_number,
          response.data.access_token,
        );

        this.applicationNumber = response.data.application_number;

        this.loading = false;

        this.updateUrl();

        this.cdr.detectChanges();
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage =
          error?.error?.detail || 'Unable to connect to the admission server. Please try again.';

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // POPULATE FORM
  // =========================================================

  private populateForm(data: any): void {
    const currentAddress = data?.current_address ?? null;
    const permanentAddress = data?.permanent_address ?? null;
    const education = data?.education ?? null;

    const highestQualification =
      education?.highest_qualification?.id ??
      data?.highest_qualification?.id ??
      data?.highest_qualification ??
      '';

    this.studentForm.patchValue(
      {
        fullName: data?.full_name ?? '',
        email: data?.email ?? '',
        mobile: data?.mobile ?? '',

        fatherName: data?.father_name ?? '',
        fatherMobile: data?.father_mobile ?? '',
        motherName: data?.mother_name ?? '',
        motherMobile: data?.mother_mobile ?? '',

        currentAddressLine1: currentAddress?.address_line1 ?? '',
        currentAddressLine2: currentAddress?.address_line2 ?? '',
        currentCity: currentAddress?.city ?? '',
        currentDistrict: currentAddress?.district ?? '',
        currentState: currentAddress?.state ?? '',
        currentPincode: currentAddress?.pincode ?? '',

        permanentAddressLine1: permanentAddress?.address_line1 ?? '',
        permanentAddressLine2: permanentAddress?.address_line2 ?? '',
        permanentCity: permanentAddress?.city ?? '',
        permanentDistrict: permanentAddress?.district ?? '',
        permanentState: permanentAddress?.state ?? '',
        permanentPincode: permanentAddress?.pincode ?? '',

        sameAddress: data?.same_address ?? false,

        highestQualification,

        declarationAccepted: data?.declaration_accepted ?? false,
      },
      {
        emitEvent: false,
      },
    );

    // Restore existing documents from API
    this.restoreExistingDocuments(data);

    if (this.studentForm.controls.sameAddress.value) {
      this.copyCurrentToPermanent();
      this.disablePermanentAddress();
    } else {
      this.enablePermanentAddress();
    }

    this.studentForm.markAsPristine();

    this.cdr.detectChanges();
  }

  private restoreExistingDocuments(data: any): void {
    const documents = Array.isArray(data?.documents) ? data.documents : [];

    this.existingDocuments = {};

    this.existingQualificationFileUrl = '';
    this.existingAadhaarFileUrl = '';
    this.existingPhotoFileUrl = '';
    this.existingSignatureFileUrl = '';

    // Existing server files are NOT browser File objects.
    this.qualificationFile = null;
    this.aadhaarFile = null;
    this.photoFile = null;
    this.signatureFile = null;

    this.photoPreviewUrl = '';
    this.signaturePreviewUrl = '';

    const backendUrl = environment.backEndUrl;

    for (const document of documents) {
      const type = document?.document_type;
      const fileUrl = document?.file;

      if (!type || !fileUrl) {
        continue;
      }

      this.existingDocuments[type] = document;

      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${backendUrl}${fileUrl}`;

      switch (type) {
        case 'qualification':
          this.existingQualificationFileUrl = fullUrl;

          this.qualificationFileName = this.getFileName(fileUrl);

          break;

        case 'aadhaar':
          this.existingAadhaarFileUrl = fullUrl;

          this.aadhaarFileName = this.getFileName(fileUrl);

          break;

        case 'photo':
          this.existingPhotoFileUrl = fullUrl;

          this.photoPreviewUrl = fullUrl;

          this.photoFileName = this.getFileName(fileUrl);

          break;

        case 'signature':
          this.existingSignatureFileUrl = fullUrl;

          this.signaturePreviewUrl = fullUrl;

          this.signatureFileName = this.getFileName(fileUrl);

          break;
      }
    }

    this.cdr.detectChanges();
  }

  private getFileName(url: string): string {
    try {
      return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '');
    } catch {
      return url.split('/').pop()?.split('?')[0] ?? '';
    }
  }

  // =========================================================
  // UPDATE URL
  // =========================================================

  private updateUrl(): void {
    if (!this.applicationNumber) {
      return;
    }

    if (this.router.url !== `/${this.applicationNumber}`) {
      this.router.navigate(['/', this.applicationNumber], {
        replaceUrl: true,
      });
    }
  }

  // =========================================================
  // INVALID CONTROL
  // =========================================================

  isInvalid(controlName: string): boolean {
    const control = this.studentForm.get(controlName);

    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // =========================================================
  // ADDRESS SYNC
  // =========================================================

  private setupAddressSync(): void {
    const sameAddressControl = this.studentForm.controls.sameAddress;

    const current = this.studentForm.controls;

    sameAddressControl.valueChanges.subscribe((sameAddress) => {
      if (sameAddress) {
        this.copyCurrentToPermanent();

        this.disablePermanentAddress();
      } else {
        this.enablePermanentAddress();

        current.permanentAddressLine1.reset();
        current.permanentAddressLine2.reset();
        current.permanentCity.reset();
        current.permanentDistrict.reset();
        current.permanentState.reset();
        current.permanentPincode.reset();
      }
    });

    const currentAddressFields = [
      'currentAddressLine1',
      'currentAddressLine2',
      'currentCity',
      'currentDistrict',
      'currentState',
      'currentPincode',
    ];

    for (const fieldName of currentAddressFields) {
      const control = this.studentForm.get(fieldName);

      control?.valueChanges.subscribe(() => {
        if (!sameAddressControl.value) {
          return;
        }

        this.copyCurrentToPermanent();
      });
    }
  }

  // =========================================================
  // DISABLE PERMANENT ADDRESS
  // =========================================================

  private disablePermanentAddress(): void {
    const controls = this.studentForm.controls;

    controls.permanentAddressLine1.disable();
    controls.permanentAddressLine2.disable();
    controls.permanentCity.disable();
    controls.permanentDistrict.disable();
    controls.permanentState.disable();
    controls.permanentPincode.disable();
  }

  // =========================================================
  // ENABLE PERMANENT ADDRESS
  // =========================================================

  private enablePermanentAddress(): void {
    const controls = this.studentForm.controls;

    controls.permanentAddressLine1.enable();
    controls.permanentAddressLine2.enable();
    controls.permanentCity.enable();
    controls.permanentDistrict.enable();
    controls.permanentState.enable();
    controls.permanentPincode.enable();
  }

  // =========================================================
  // COPY ADDRESS
  // =========================================================

  private copyCurrentToPermanent(): void {
    const controls = this.studentForm.controls;

    controls.permanentAddressLine1.setValue(controls.currentAddressLine1.value, {
      emitEvent: false,
    });

    controls.permanentAddressLine2.setValue(controls.currentAddressLine2.value, {
      emitEvent: false,
    });

    controls.permanentCity.setValue(controls.currentCity.value, {
      emitEvent: false,
    });

    controls.permanentDistrict.setValue(controls.currentDistrict.value, {
      emitEvent: false,
    });

    controls.permanentState.setValue(controls.currentState.value, {
      emitEvent: false,
    });

    controls.permanentPincode.setValue(controls.currentPincode.value, {
      emitEvent: false,
    });
  }

  // =========================================================
  // FILE VALIDATION
  // =========================================================

  private validateFile(file: File, allowedTypes: string[], maxSizeMB: number): string | null {
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please select a supported file.';
    }

    const maxBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxBytes) {
      return `File size must not exceed ${maxSizeMB} MB.`;
    }

    return null;
  }

  // =========================================================
  // FILE SELECT
  // =========================================================

  async onFileSelected(
    event: Event,
    type: 'qualification' | 'aadhaar' | 'photo' | 'signature',
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.fileErrors[type] = '';

    // -------------------------------------------------------
    // QUALIFICATION
    // -------------------------------------------------------

    if (type === 'qualification') {
      const error = this.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      this.qualificationFile = file;
      this.qualificationFileName = file.name;

      const control = this.studentForm.controls.qualificationCertificate;

      control.setValue(file);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();

      this.cdr.detectChanges();
      return;
    }

    // -------------------------------------------------------
    // AADHAAR
    // -------------------------------------------------------

    if (type === 'aadhaar') {
      const error = this.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      this.aadhaarFile = file;
      this.aadhaarFileName = file.name;

      const control = this.studentForm.controls.aadhaar;

      control.setValue(file);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();

      this.cdr.detectChanges();
      return;
    }

    // -------------------------------------------------------
    // PHOTO
    // -------------------------------------------------------

    if (type === 'photo') {
      const error = this.validateFile(file, ['image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      // Revoke previous preview URL
      if (this.photoPreviewUrl) {
        URL.revokeObjectURL(this.photoPreviewUrl);
      }

      this.photoFile = file;
      this.photoFileName = file.name;

      const control = this.studentForm.controls.photo;

      control.setValue(file);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();

      this.photoPreviewUrl = URL.createObjectURL(file);

      this.cdr.detectChanges();
      return;
    }

    // -------------------------------------------------------
    // SIGNATURE
    // -------------------------------------------------------

    if (type === 'signature') {
      const error = this.validateFile(file, ['image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      // Revoke previous preview URL
      if (this.signaturePreviewUrl) {
        URL.revokeObjectURL(this.signaturePreviewUrl);
      }

      this.signatureFile = file;
      this.signatureFileName = file.name;

      const control = this.studentForm.controls.signature;

      control.setValue(file);
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();

      this.signaturePreviewUrl = URL.createObjectURL(file);

      this.cdr.detectChanges();
      return;
    }
  }

  // =========================================================
  // REMOVE FILE
  // =========================================================

  removeFile(type: 'qualification' | 'aadhaar' | 'photo' | 'signature'): void {
    /*
     * Do not allow removing a file while it is uploading.
     */
    if (this.uploadingTypes.has(type)) {
      return;
    }

    this.fileErrors[type] = '';

    switch (type) {
      case 'qualification':
        this.qualificationFile = null;

        this.qualificationFileName = '';

        this.studentForm.controls.qualificationCertificate.setValue(null);

        this.studentForm.controls.qualificationCertificate.markAsDirty();

        this.studentForm.controls.qualificationCertificate.updateValueAndValidity();

        break;

      case 'aadhaar':
        this.aadhaarFile = null;

        this.aadhaarFileName = '';

        this.studentForm.controls.aadhaar.setValue(null);

        this.studentForm.controls.aadhaar.markAsDirty();

        this.studentForm.controls.aadhaar.updateValueAndValidity();

        break;

      case 'photo':
        if (this.photoPreviewUrl) {
          URL.revokeObjectURL(this.photoPreviewUrl);

          this.photoPreviewUrl = '';
        }

        this.photoFile = null;

        this.photoFileName = '';

        this.studentForm.controls.photo.setValue(null);

        this.studentForm.controls.photo.markAsDirty();

        this.studentForm.controls.photo.updateValueAndValidity();

        break;

      case 'signature':
        if (this.signaturePreviewUrl) {
          URL.revokeObjectURL(this.signaturePreviewUrl);

          this.signaturePreviewUrl = '';
        }

        this.signatureFile = null;

        this.signatureFileName = '';

        this.studentForm.controls.signature.setValue(null);

        this.studentForm.controls.signature.markAsDirty();

        this.studentForm.controls.signature.updateValueAndValidity();

        break;
    }

    this.cdr.detectChanges();
  }

  // -------------------------------------------------------
  // Validate Document
  // -------------------------------------------------------

  private validateDocuments(): boolean {
    let valid = true;

    this.fileErrors = {};

    if (!this.qualificationFile && !this.existingQualificationFileUrl) {
      this.fileErrors['qualification'] = 'Qualification certificate is required.';
      valid = false;
    }

    if (!this.aadhaarFile && !this.existingAadhaarFileUrl) {
      this.fileErrors['aadhaar'] = 'Aadhaar document is required.';
      valid = false;
    }

    if (!this.photoFile && !this.existingPhotoFileUrl) {
      this.fileErrors['photo'] = 'Passport size photo is required.';
      valid = false;
    }

    if (!this.signatureFile && !this.existingSignatureFileUrl) {
      this.fileErrors['signature'] = 'Signature is required.';
      valid = false;
    }

    return valid;
  }

  // =========================================================
  // CONTINUE
  // =========================================================
  continue(): void {
    if (this.isSavingStep || this.submitting || this.uploadingDocuments) {
      return;
    }

    this.errorMessage = '';

    const controlsByStep: Record<number, string[]> = {
      1: ['fullName', 'email', 'mobile'],

      2: ['fatherName', 'fatherMobile', 'motherName', 'motherMobile'],

      3: [
        'currentAddressLine1',
        'currentCity',
        'currentDistrict',
        'currentState',
        'currentPincode',

        'permanentAddressLine1',
        'permanentCity',
        'permanentDistrict',
        'permanentState',
        'permanentPincode',
      ],

      4: ['highestQualification'],

      5: ['declarationAccepted'],
    };

    const controls = controlsByStep[this.currentStep] ?? [];

    let valid = true;

    // -------------------------------------------------------
    // NORMAL FORM VALIDATION
    // -------------------------------------------------------

    for (const controlName of controls) {
      const control = this.studentForm.get(controlName);

      if (control?.invalid) {
        control.markAsTouched();
        valid = false;
      }
    }

    // -------------------------------------------------------
    // DOCUMENT VALIDATION
    // -------------------------------------------------------

    if (this.currentStep === 4) {
      if (!this.validateDocuments()) {
        valid = false;
      }
    }

    // -------------------------------------------------------
    // STOP IF INVALID
    // -------------------------------------------------------

    if (!valid) {
      this.cdr.detectChanges();
      return;
    }

    // -------------------------------------------------------
    // SAVE FORM DATA
    // -------------------------------------------------------

    this.session.setFormData(this.studentForm.getRawValue());

    // -------------------------------------------------------
    // STEP 4
    // -------------------------------------------------------

    if (this.currentStep === 4) {
      this.saveStep4AndContinue();
      return;
    }

    // -------------------------------------------------------
    // STEP 5
    // -------------------------------------------------------

    if (this.currentStep === 5) {
      this.openPreview();
      return;
    }

    // -------------------------------------------------------
    // OTHER STEPS
    // -------------------------------------------------------

    this.saveFormDataAndContinue();
  }

  // =========================================================
  // SAVE STEP 1-3
  // =========================================================

  private saveFormDataAndContinue(): void {
    /*
     * IMPORTANT:
     *
     * Set the dedicated loader BEFORE API call.
     */
    this.isSavingStep = true;

    this.saving = true;

    this.errorMessage = '';

    const payload = this.getCurrentStepPayload();

    this.cdr.detectChanges();

    this.session.updateApplication(payload).subscribe({
      next: () => {
        /*
         * ALWAYS reset loader first.
         */
        this.isSavingStep = false;

        this.saving = false;

        this.currentStep++;

        this.cdr.detectChanges();
      },

      error: (error) => {
        /*
         * CRITICAL:
         *
         * Reset BOTH states when API fails.
         */
        this.isSavingStep = false;

        this.saving = false;

        this.errorMessage =
          error?.error?.detail || 'Unable to save your application. Please try again.';

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // STEP 4 SAVE + UPLOAD
  // =========================================================

  private saveStep4AndContinue(): void {
    this.isSavingStep = true;

    this.saving = true;

    this.errorMessage = '';

    const value = this.studentForm.getRawValue();

    const qualification = this.qualificationFile;

    const aadhaar = this.aadhaarFile;

    const photo = this.photoFile;

    const signature = this.signatureFile;

    this.cdr.detectChanges();

    this.session
      .updateApplication({
        highest_qualification: value.highestQualification,
      })
      .subscribe({
        next: () => {
          /*
           * Database save completed.
           *
           * Continue button remains in loading state
           * while documents upload.
           */
          this.saving = false;

          this.uploadAllDocuments(qualification, aadhaar, photo, signature);
        },

        error: (error) => {
          this.isSavingStep = false;

          this.saving = false;

          this.uploadingDocuments = false;

          this.errorMessage =
            error?.error?.detail || 'Unable to save your qualification. Please try again.';

          this.cdr.detectChanges();
        },
      });
  }

  // =========================================================
  // UPLOAD DOCUMENTS
  // =========================================================

  private uploadAllDocuments(
    qualification: File | null,
    aadhaar: File | null,
    photo: File | null,
    signature: File | null,
  ): void {
    const uploads = [
      {
        type: 'qualification',
        file: qualification,
      },

      {
        type: 'aadhaar',
        file: aadhaar,
      },

      {
        type: 'photo',
        file: photo,
      },

      {
        type: 'signature',
        file: signature,
      },
    ].filter(
      (
        item,
      ): item is {
        type: string;
        file: File;
      } => item.file !== null,
    );

    if (uploads.length === 0) {
      this.uploadingDocuments = false;

      this.saving = false;

      this.isSavingStep = false;

      this.currentStep++;

      this.cdr.detectChanges();

      return;
    }

    /*
     * Start document uploading.
     */
    this.uploadingDocuments = true;

    this.saving = true;

    this.isSavingStep = true;

    this.errorMessage = '';

    this.uploadingTypes.clear();

    for (const upload of uploads) {
      this.uploadingTypes.add(upload.type);
    }

    this.cdr.detectChanges();

    let completed = 0;

    let failed = false;

    for (const upload of uploads) {
      this.uploadingDocumentType = upload.type;

      this.session.uploadDocument(upload.type, upload.file).subscribe({
        next: () => {
          completed++;

          this.uploadingTypes.delete(upload.type);

          /*
           * All documents uploaded.
           */
          if (completed === uploads.length) {
            this.uploadingDocuments = false;

            this.saving = false;

            this.isSavingStep = false;

            this.uploadingDocumentType = null;

            this.currentStep++;

            this.cdr.detectChanges();

            return;
          }

          this.cdr.detectChanges();
        },

        error: (error) => {
          /*
           * Prevent multiple error handlers
           * from resetting the state repeatedly.
           */
          if (failed) {
            return;
          }

          failed = true;

          this.uploadingDocuments = false;

          this.saving = false;

          this.isSavingStep = false;

          this.uploadingTypes.clear();

          this.uploadingDocumentType = null;

          this.errorMessage =
            error?.error?.detail || `Unable to upload ${upload.type}. Please try again.`;

          this.cdr.detectChanges();
        },
      });
    }
  }

  // =========================================================
  // DOCUMENT UPLOAD CHECK
  // =========================================================

  isDocumentUploading(type: string): boolean {
    return this.uploadingTypes.has(type);
  }

  // =========================================================
  // PREVIOUS
  // =========================================================

  previous(): void {
    if (this.isSavingStep || this.submitting || this.uploadingDocuments) {
      return;
    }

    if (this.currentStep > 1) {
      this.currentStep--;

      this.errorMessage = '';

      this.cdr.detectChanges();
    }
  }

  // =========================================================
  // STEP PAYLOAD
  // =========================================================

  private getCurrentStepPayload(): any {
    const value = this.studentForm.getRawValue();

    switch (this.currentStep) {
      // -----------------------------------------------------
      // STEP 1
      // -----------------------------------------------------

      case 1:
        return {
          full_name: value.fullName,

          email: value.email,

          mobile: value.mobile,
        };

      // -----------------------------------------------------
      // STEP 2
      // -----------------------------------------------------

      case 2:
        return {
          father_name: value.fatherName,

          father_mobile: value.fatherMobile,

          mother_name: value.motherName,

          mother_mobile: value.motherMobile,
        };

      // -----------------------------------------------------
      // STEP 3
      // -----------------------------------------------------

      case 3:
        return {
          current_address_line1: value.currentAddressLine1,

          current_address_line2: value.currentAddressLine2,

          current_city: value.currentCity,

          current_district: value.currentDistrict,

          current_state: value.currentState,

          current_pincode: value.currentPincode,

          permanent_address_line1: value.permanentAddressLine1,

          permanent_address_line2: value.permanentAddressLine2,

          permanent_city: value.permanentCity,

          permanent_district: value.permanentDistrict,

          permanent_state: value.permanentState,

          permanent_pincode: value.permanentPincode,

          same_address: value.sameAddress,
        };

      // -----------------------------------------------------
      // STEP 4
      // -----------------------------------------------------

      case 4:
        return {
          highest_qualification: value.highestQualification,
        };

      // -----------------------------------------------------
      // STEP 5
      // -----------------------------------------------------

      case 5:
        return {
          declaration_accepted: value.declarationAccepted,
        };

      default:
        return {};
    }
  }

  // =========================================================
  // PREVIEW
  // =========================================================
  async openPreview(): Promise<void> {
    if (this.isSavingStep || this.submitting || this.uploadingDocuments) {
      return;
    }

    this.errorMessage = '';

    // Save the latest form state in session
    this.session.setFormData(this.studentForm.getRawValue());

    // Navigate to preview page
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/', this.applicationNumber, 'preview']),
    );

    window.open(url, '_blank');
  }

  // =========================================================
  // FINAL SUBMIT
  // =========================================================

  finalSubmit(): void {
    if (this.submitting || this.isSavingStep || this.uploadingDocuments) {
      return;
    }

    const declaration = this.studentForm.controls.declarationAccepted;

    // ---------------------------------------------------------
    // VALIDATE DECLARATION
    // ---------------------------------------------------------

    if (!declaration.value) {
      declaration.markAsTouched();

      this.cdr.detectChanges();

      return;
    }

    // ---------------------------------------------------------
    // START SUBMISSION
    // ---------------------------------------------------------

    this.submitting = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    // ---------------------------------------------------------
    // SAVE DECLARATION FIRST
    // ---------------------------------------------------------

    this.session
      .updateApplication({
        declaration_accepted: true,
      })
      .subscribe({
        next: () => {
          // -----------------------------------------------------
          // SUBMIT APPLICATION
          // -----------------------------------------------------

          this.session.submitApplication().subscribe({
            next: (response) => {
              this.submitting = false;
              this.cdr.detectChanges();
              if (response) {
                // Save number before clearing session
                const submittedApplicationNumber = this.applicationNumber;

                // ---------------------------------------------------
                // CLEAR CURRENT APPLICATION SESSION
                // ---------------------------------------------------

                this.session.clearSession();

                this.router.navigate(['/', submittedApplicationNumber, 'success']);
              } else {
                this.errorMessage = 'Unable to submit your application. Please try again.';
              }
            },

            error: (error) => {
              this.submitting = false;

              this.errorMessage =
                error?.error?.detail || 'Unable to submit your application. Please try again.';

              this.cdr.detectChanges();
            },
          });
        },

        error: (error) => {
          this.submitting = false;

          this.errorMessage =
            error?.error?.detail || 'Unable to save the declaration. Please try again.';

          this.cdr.detectChanges();
        },
      });
  }
  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }

    if (this.signaturePreviewUrl) {
      URL.revokeObjectURL(this.signaturePreviewUrl);
    }
  }
}
