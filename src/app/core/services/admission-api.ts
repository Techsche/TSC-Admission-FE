import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment.development';
import { EducationalQualification } from '../models/education-qualification';
import { environment } from '../../../environments/environment';

export interface StartApplicationResponse {
  success: boolean;

  data: {
    application_number: string;
    access_token: string;
    status: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AdmissionApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl;

  // ==========================================================
  // START APPLICATION
  // ==========================================================

  startApplication(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}applications/start/`, {});
  }

  // ==========================================================
  // GET APPLICATION
  // ==========================================================

  getApplication(applicationId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}applications/${applicationId}/`, {
      headers: this.authHeaders(),
    });
  }

  // ==========================================================
  // UPDATE APPLICATION
  // ==========================================================

  updateApplication(applicationId: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}applications/${applicationId}/`, data, {
      headers: this.authHeaders(),
    });
  }

  // ==========================================================
  // UPLOAD DOCUMENT
  // ==========================================================

  uploadDocument(applicationId: string, documentType: string, file: File): Observable<any> {
    const formData = new FormData();

    formData.append('document_type', documentType);

    formData.append('file', file, file.name);

    return this.http.post<any>(
      `${this.baseUrl}applications/${applicationId}/documents/`,
      formData,
      {
        headers: this.authHeaders(),
      },
    );
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  submitApplication(applicationId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}applications/${applicationId}/submit/`, {
      headers: this.authHeaders(),
    });
  }

  // ==========================================================
  // AUTH
  // ==========================================================

  private authHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('tsc_access_token');

    return new HttpHeaders({
      'X-Application-Token': token ?? '',
    });
  }

  // ==========================================================
  // Educational Qualifications List
  // ==========================================================

  getEducationalQualifications(): Observable<EducationalQualification[]> {
    return this.http.get<EducationalQualification[]>(`${this.baseUrl}educational-qualifications/`);
  }
}
