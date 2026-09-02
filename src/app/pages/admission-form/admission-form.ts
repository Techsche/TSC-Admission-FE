import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { AdmissionApiService } from '../../core/services/admission-api';
import { ApplicationSessionService } from '../../core/services/application-session';

@Component({
  selector: 'app-admission-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admission-form.html',
  styleUrl: './admission-form.scss',
})
export class AdmissionForm implements OnInit {
  private readonly fb = inject(FormBuilder);

  private readonly admissionApi = inject(AdmissionApiService);

  private readonly session = inject(ApplicationSessionService);

  private readonly router = inject(Router);

  private readonly cdr = inject(ChangeDetectorRef);

  // ==========================================================
  // STATE
  // ==========================================================

  loading = true;

  submitting = false;

  saving = false;

  errorMessage = '';

  applicationNumber = '';

  currentStep = 1;

  readonly totalSteps = 5;

  // ==========================================================
  // FILE STATE
  // ==========================================================

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

  isSubmitting: boolean = false;

  showSuccess: boolean = false;

  submissionError = '';
  // ==========================================================
  // DECLARATION
  // ==========================================================

  declarationPoints: string[] = [];

  // ==========================================================
  // FORM
  // ==========================================================

  readonly studentForm = this.fb.nonNullable.group({
    // --------------------------------------------------------
    // Student
    // --------------------------------------------------------

    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    email: ['', [Validators.required, Validators.email]],

    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    // --------------------------------------------------------
    // Parent
    // --------------------------------------------------------

    fatherName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    fatherMobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    motherName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    motherMobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],

    // --------------------------------------------------------
    // Current Address
    // --------------------------------------------------------

    currentAddressLine1: ['', [Validators.required, Validators.maxLength(150)]],

    currentAddressLine2: ['', [Validators.maxLength(150)]],

    currentCity: ['', [Validators.required, Validators.maxLength(100)]],

    currentDistrict: ['', [Validators.required, Validators.maxLength(100)]],

    currentState: ['', [Validators.required, Validators.maxLength(100)]],

    currentPincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],

    // --------------------------------------------------------
    // Permanent Address
    // --------------------------------------------------------

    sameAddress: [false],

    permanentAddressLine1: ['', [Validators.required, Validators.maxLength(150)]],

    permanentAddressLine2: ['', [Validators.maxLength(150)]],

    permanentCity: ['', [Validators.required, Validators.maxLength(100)]],

    permanentDistrict: ['', [Validators.required, Validators.maxLength(100)]],

    permanentState: ['', [Validators.required, Validators.maxLength(100)]],

    permanentPincode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],

    // --------------------------------------------------------
    // Education & Documents
    // --------------------------------------------------------

    highestQualification: ['', Validators.required],

    qualificationCertificate: this.fb.control<File | null>(null, Validators.required),

    aadhaar: this.fb.control<File | null>(null, Validators.required),

    photo: this.fb.control<File | null>(null, Validators.required),

    signature: this.fb.control<File | null>(null, Validators.required),

    // --------------------------------------------------------
    // Declaration
    // --------------------------------------------------------

    declarationAccepted: [false, Validators.requiredTrue],
  });

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.declarationPoints = this.session.declarationPoints;

    this.initializeApplication();

    this.setupAddressSync();
  }

  // ==========================================================
  // APPLICATION INITIALIZATION
  // ==========================================================

  initializeApplication(): void {
    if (this.session.hasActiveSession()) {
      this.applicationNumber = this.session.applicationNumber!;

      this.loading = false;

      this.updateUrl();

      return;
    }

    this.createApplication();
  }

  // ==========================================================
  // CREATE APPLICATION
  // ==========================================================

  private createApplication(): void {
    this.loading = true;

    this.errorMessage = '';

    this.admissionApi.startApplication().subscribe({
      next: (response) => {
        if (
          !response.success ||
          !response.data?.application_number ||
          !response.data?.access_token
        ) {
          this.loading = false;

          this.errorMessage = 'Unable to create your application.';

          return;
        }

        this.session.setSession(response.data.application_number, response.data.access_token);

        this.applicationNumber = response.data.application_number;

        this.loading = false;

        this.updateUrl();
      },

      error: (error) => {
        this.loading = false;

        this.errorMessage = 'Unable to connect to the admission server. Please try again.';
      },
    });
  }

  // ==========================================================
  // URL
  // ==========================================================

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

  // ==========================================================
  // FORM HELPER
  // ==========================================================

  isInvalid(controlName: string): boolean {
    const control = this.studentForm.get(controlName);

    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ==========================================================
  // ADDRESS SYNC
  // ==========================================================

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

  private disablePermanentAddress(): void {
    const controls = this.studentForm.controls;

    controls.permanentAddressLine1.disable();

    controls.permanentAddressLine2.disable();

    controls.permanentCity.disable();

    controls.permanentDistrict.disable();

    controls.permanentState.disable();

    controls.permanentPincode.disable();
  }

  private enablePermanentAddress(): void {
    const controls = this.studentForm.controls;

    controls.permanentAddressLine1.enable();

    controls.permanentAddressLine2.enable();

    controls.permanentCity.enable();

    controls.permanentDistrict.enable();

    controls.permanentState.enable();

    controls.permanentPincode.enable();
  }

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

  // ==========================================================
  // FILE VALIDATION
  // ==========================================================

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

  // ==========================================================
  // IMAGE DIMENSIONS
  // ==========================================================

  private validateImageDimensions(
    file: File,
    minWidth: number,
    minHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const image = new Image();

      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);

        if (image.width < minWidth || image.height < minHeight) {
          resolve(`Image must be at least ${minWidth} × ${minHeight}px.`);

          return;
        }

        if (image.width > maxWidth || image.height > maxHeight) {
          resolve(`Image must not exceed ${maxWidth} × ${maxHeight}px.`);

          return;
        }

        resolve(null);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        resolve('Unable to read this image.');
      };

      image.src = objectUrl;
    });
  }

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

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

    // ========================================================
    // QUALIFICATION
    // ========================================================

    if (type === 'qualification') {
      const error = this.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      this.qualificationFile = file;
      this.qualificationFileName = file.name;

      this.studentForm.controls.qualificationCertificate.setValue(file);
      this.studentForm.controls.qualificationCertificate.markAsTouched();
      this.studentForm.controls.qualificationCertificate.markAsDirty();

      return;
    }

    // ========================================================
    // AADHAAR
    // ========================================================

    if (type === 'aadhaar') {
      const error = this.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 10);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      this.aadhaarFile = file;
      this.aadhaarFileName = file.name;

      this.studentForm.controls.aadhaar.setValue(file);
      this.studentForm.controls.aadhaar.markAsTouched();
      this.studentForm.controls.aadhaar.markAsDirty();

      return;
    }

    // ========================================================
    // PHOTO
    // ========================================================

    if (type === 'photo') {
      const error = this.validateFile(file, ['image/jpeg', 'image/png'], 2);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      const dimensionError = await this.validateImageDimensions(file, 300, 400, 2000, 2000);

      if (dimensionError) {
        this.fileErrors[type] = dimensionError;
        input.value = '';
        return;
      }

      // --------------------------------------------------------
      // Everything below happens AFTER the async validation.
      // Defer it to the next browser task.
      // --------------------------------------------------------

      setTimeout(() => {
        // Remove old preview
        if (this.photoPreviewUrl) {
          URL.revokeObjectURL(this.photoPreviewUrl);
        }

        // Store file
        this.photoFile = file;
        this.photoFileName = file.name;

        // Update form
        const control = this.studentForm.controls.photo;

        control.setValue(file);
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();

        // Create preview
        this.photoPreviewUrl = URL.createObjectURL(file);
      }, 0);
      this.cdr.detectChanges();

      return;
    }

    // ========================================================
    // SIGNATURE
    // ========================================================

    if (type === 'signature') {
      const error = this.validateFile(file, ['image/jpeg', 'image/png'], 1);

      if (error) {
        this.fileErrors[type] = error;
        input.value = '';
        return;
      }

      const dimensionError = await this.validateImageDimensions(file, 400, 150, 2000, 1000);

      if (dimensionError) {
        this.fileErrors[type] = dimensionError;
        input.value = '';
        return;
      }

      // --------------------------------------------------------
      // Defer state/form changes
      // --------------------------------------------------------

      setTimeout(() => {
        // Remove old preview
        if (this.signaturePreviewUrl) {
          URL.revokeObjectURL(this.signaturePreviewUrl);
          // this.signaturePreviewUrl = null;
        }

        // Store file
        this.signatureFile = file;
        this.signatureFileName = file.name;

        // Update form
        const control = this.studentForm.controls.signature;

        control.setValue(file);
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();

        // Create preview
        this.signaturePreviewUrl = URL.createObjectURL(file);
      }, 0);

      this.cdr.detectChanges();

      return;
    }
  }

  // ==========================================================
  // REMOVE FILE
  // ==========================================================

  removeFile(type: 'qualification' | 'aadhaar' | 'photo' | 'signature'): void {
    this.fileErrors[type] = '';

    switch (type) {
      case 'qualification':
        this.qualificationFile = null;

        this.qualificationFileName = '';

        this.studentForm.controls.qualificationCertificate.setValue(null);

        break;

      case 'aadhaar':
        this.aadhaarFile = null;

        this.aadhaarFileName = '';

        this.studentForm.controls.aadhaar.setValue(null);

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
  }

  // ==========================================================
  // CONTINUE / PREVIEW
  // ==========================================================

  continue(): void {
    // --------------------------------------------------------
    // STEP VALIDATION
    // --------------------------------------------------------

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

      4: ['highestQualification', 'qualificationCertificate', 'aadhaar', 'photo', 'signature'],

      5: ['declarationAccepted'],
    };

    const controls = controlsByStep[this.currentStep] ?? [];

    let valid = true;

    for (const controlName of controls) {
      const control = this.studentForm.get(controlName);

      if (!control) {
        continue;
      }

      if (control.invalid) {
        control.markAsTouched();
        valid = false;
      }
    }

    // --------------------------------------------------------
    // STOP IF CURRENT STEP IS INVALID
    // --------------------------------------------------------

    if (!valid) {
      return;
    }

    // --------------------------------------------------------
    // SAVE CURRENT FORM DATA
    // --------------------------------------------------------

    this.session.setFormData(this.studentForm.getRawValue());

    // --------------------------------------------------------
    // STEP 5 = OPEN PREVIEW
    // --------------------------------------------------------

    if (this.currentStep === 5) {
      this.openPreview();
      return;
    }

    // --------------------------------------------------------
    // NEXT STEP
    // --------------------------------------------------------

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  // ==========================================================
  // PREVIOUS
  // ==========================================================

  previous(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // ==========================================================
  // PREVIEW
  // ==========================================================

  async openPreview(): Promise<void> {
    // Save form fields
    this.session.setFormData(this.studentForm.getRawValue());

    // Save uploaded files
    await this.session.setFiles({
      qualification: this.qualificationFile,
      aadhaar: this.aadhaarFile,
      photo: this.photoFile,
      signature: this.signatureFile,
    });

    // Open preview only AFTER IndexedDB save is complete
    window.open(`/${this.applicationNumber}/preview`, '_blank');
  }

  // ==========================================================
  // Final Submit
  // ==========================================================

  async finalSubmit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    if (!this.studentForm.controls.declarationAccepted.value) {
      this.studentForm.controls.declarationAccepted.markAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    try {
      const formValue = this.studentForm.getRawValue();

      // Your existing FormData creation
      const payload = new FormData();

      payload.append('full_name', formValue.fullName);
      payload.append('email', formValue.email);
      payload.append('mobile', formValue.mobile);

      if (this.qualificationFile) {
        payload.append(
          'qualification_certificate',
          this.qualificationFile,
          this.qualificationFile.name,
        );
      }

      if (this.aadhaarFile) {
        payload.append('aadhaar', this.aadhaarFile, this.aadhaarFile.name);
      }

      if (this.photoFile) {
        payload.append('photo', this.photoFile, this.photoFile.name);
      }

      if (this.signatureFile) {
        payload.append('signature', this.signatureFile, this.signatureFile.name);
      }

      // Your existing API call
      this.session.submitApplication(payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess = true;
          } else {
            this.errorMessage = 'Submission failed. Please try again.';
          }

          this.submitting = false;
        },

        error: (error) => {
          this.errorMessage = 'Unable to submit your application. Please try again.';
          this.submitting = false;
        },
      });

      // Success handling
      // this.showSuccess = true;
    } catch (error) {
      this.errorMessage = 'Unable to submit your application. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  ngOnDestroy(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }

    if (this.signaturePreviewUrl) {
      URL.revokeObjectURL(this.signaturePreviewUrl);
    }
  }
}
