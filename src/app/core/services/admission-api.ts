import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  private readonly apiUrl = 'https://admission-api.techschecampus.com/wp-json/admission/v1';

  startApplication(): Observable<StartApplicationResponse> {
    return this.http.post<StartApplicationResponse>(`${this.apiUrl}/applications/start`, {});
  }
}
