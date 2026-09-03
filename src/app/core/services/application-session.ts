import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AdmissionApiService } from './admission-api';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ApplicationSessionService {
  private readonly admissionApi = inject(AdmissionApiService);
  private readonly http = inject(HttpClient);

  // =========================================================
  // SESSION KEYS
  // =========================================================

  private readonly APPLICATION_ID_KEY = 'tsc_application_id';

  private readonly APPLICATION_NUMBER_KEY = 'tsc_application_number';

  private readonly ACCESS_TOKEN_KEY = 'tsc_access_token';

  private readonly FORM_DATA_KEY = 'tsc_application_form';

  // =========================================================
  // DECLARATION
  // =========================================================

  private readonly _declarationPoints: string[] = [
    'I declare that all information provided in this application is true and correct.',
    'I understand that providing false or misleading information may result in cancellation of my application.',
    'I agree to submit the required supporting documents for verification.',
  ];

  get declarationPoints(): string[] {
    return this._declarationPoints;
  }

  // =========================================================
  // SESSION GETTERS
  // =========================================================

  get applicationId(): string | null {
    return sessionStorage.getItem(this.APPLICATION_ID_KEY);
  }

  get applicationNumber(): string | null {
    return sessionStorage.getItem(this.APPLICATION_NUMBER_KEY);
  }

  get accessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  // =========================================================
  // ACTIVE SESSION
  // =========================================================

  hasActiveSession(): boolean {
    const id = this.applicationId;
    const number = this.applicationNumber;
    const token = this.accessToken;

    return id !== null && !!number && !!token;
  }

  // =========================================================
  // SET SESSION
  // =========================================================

  setSession(applicationId: number, applicationNumber: string, accessToken: string): void {
    sessionStorage.setItem(this.APPLICATION_ID_KEY, String(applicationId));

    sessionStorage.setItem(this.APPLICATION_NUMBER_KEY, applicationNumber);

    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
  }

  // =========================================================
  // CLEAR SESSION
  // =========================================================

  clearSession(): void {
    sessionStorage.removeItem(this.APPLICATION_ID_KEY);

    sessionStorage.removeItem(this.APPLICATION_NUMBER_KEY);

    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);

    sessionStorage.removeItem(this.FORM_DATA_KEY);
  }

  // =========================================================
  // FORM DATA
  // =========================================================

  setFormData(data: any): void {
    sessionStorage.setItem(this.FORM_DATA_KEY, JSON.stringify(data));
  }

  getFormData(): any | null {
    const data = sessionStorage.getItem(this.FORM_DATA_KEY);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // =========================================================
  // API
  // =========================================================

  getApplication(): Observable<any> {
    const applicationId = this.applicationId;

    if (applicationId === null) {
      throw new Error('No active application.');
    }

    return this.admissionApi.getApplication(applicationId);
  }

  updateApplication(data: any): Observable<any> {
    const applicationId = this.applicationId;

    if (applicationId === null) {
      throw new Error('No active application.');
    }

    return this.admissionApi.updateApplication(applicationId, data);
  }

  uploadDocument(documentType: string, file: File): Observable<any> {
    const applicationId = this.applicationId;

    if (applicationId === null) {
      throw new Error('No active application.');
    }

    return this.admissionApi.uploadDocument(applicationId, documentType, file);
  }

  submitApplication(): Observable<any> {
    const applicationId = this.applicationId;

    if (applicationId === null) {
      throw new Error('No active application.');
    }

    return this.admissionApi.submitApplication(applicationId);
  }

  // =========================================================
  // FILE PREVIEW
  // =========================================================

  getFile(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob',
    });
  }
}
