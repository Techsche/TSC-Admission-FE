import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdmissionFormData } from '../models/application-data';

@Injectable({
  providedIn: 'root',
})
export class ApplicationSessionService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = 'https://admission-api.techschecampus.com/wp-json/admission/v1';

  private readonly APPLICATION_NUMBER_KEY = 'ts_application_number';

  private readonly ACCESS_TOKEN_KEY = 'ts_access_token';

  private formData: AdmissionFormData | null = null;

  private readonly FORM_DATA_KEY = 'ts_application_form_data';

  private readonly DB_NAME = 'TechscheAdmissionDB';

  private readonly DB_VERSION = 1;

  private readonly FILE_STORE = 'applicationFiles';

  private files: {
    qualification: File | null;
    aadhaar: File | null;
    photo: File | null;
    signature: File | null;
  } = {
    qualification: null,
    aadhaar: null,
    photo: null,
    signature: null,
  };

  declarationPoints: string[] = [
    'I declare that all information provided in this application is true, complete and correct to the best of my knowledge.',

    'I understand that the information and documents submitted may be verified by Techsche Campus.',

    'I agree to produce the original certificates and documents whenever required for verification.',

    'I understand that furnishing false, incorrect or misleading information may result in rejection of my application or cancellation of admission.',

    'I agree to abide by the rules, regulations, policies and academic requirements of Techsche Campus.',

    'I understand that submission of this application does not automatically guarantee admission.',

    'I authorize Techsche Campus to use the information and documents provided for admission processing and related academic or administrative purposes.',

    'I confirm that the uploaded photograph, signature and documents belong to me and are genuine.',

    'I undertake to notify Techsche Campus if any information provided in this application changes or is found to be incorrect.',

    'I have carefully reviewed the information entered in this application and confirm that it is ready for submission.',
  ];

  get applicationNumber(): string | null {
    return sessionStorage.getItem(this.APPLICATION_NUMBER_KEY);
  }

  get accessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  hasActiveSession(): boolean {
    return !!(this.applicationNumber && this.accessToken);
  }

  setSession(applicationNumber: string, accessToken: string): void {
    sessionStorage.setItem(this.APPLICATION_NUMBER_KEY, applicationNumber);

    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
  }

  clearSession(): void {
    sessionStorage.removeItem(this.APPLICATION_NUMBER_KEY);

    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  // ==========================================================
  // Form Data
  // ==========================================================

  setFormData(data: AdmissionFormData): void {
    this.formData = {
      ...data,
    };

    sessionStorage.setItem(this.FORM_DATA_KEY, JSON.stringify(this.formData));
  }

  getFormData(): AdmissionFormData {
    if (this.formData) {
      return this.formData;
    }

    const storedData = sessionStorage.getItem(this.FORM_DATA_KEY);

    if (!storedData) {
      return {} as AdmissionFormData;
    }

    try {
      this.formData = JSON.parse(storedData);

      return this.formData ?? ({} as AdmissionFormData);
    } catch (error) {
      return {} as AdmissionFormData;
    }
  }
  // ==========================================================
  // Files
  // ==========================================================

  async setFiles(files: {
    qualification: File | null;
    aadhaar: File | null;
    photo: File | null;
    signature: File | null;
  }): Promise<void> {
    // Keep files available in the current Angular instance
    this.files = files;

    const db = await this.openFileDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.FILE_STORE, 'readwrite');

      const store = transaction.objectStore(this.FILE_STORE);

      // ========================================================
      // QUALIFICATION
      // ========================================================

      if (files.qualification) {
        store.put(files.qualification, 'qualification');
      } else {
        store.delete('qualification');
      }

      // ========================================================
      // AADHAAR
      // ========================================================

      if (files.aadhaar) {
        store.put(files.aadhaar, 'aadhaar');
      } else {
        store.delete('aadhaar');
      }

      // ========================================================
      // PHOTO
      // ========================================================

      if (files.photo) {
        store.put(files.photo, 'photo');
      } else {
        store.delete('photo');
      }

      // ========================================================
      // SIGNATURE
      // ========================================================

      if (files.signature) {
        store.put(files.signature, 'signature');
      } else {
        store.delete('signature');
      }

      // ========================================================
      // TRANSACTION COMPLETE
      // ========================================================

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      // ========================================================
      // TRANSACTION ERROR
      // ========================================================

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  async getFiles(): Promise<{
    qualification: File | null;
    aadhaar: File | null;
    photo: File | null;
    signature: File | null;
  }> {
    const db = await this.openFileDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.FILE_STORE, 'readonly');
      const store = transaction.objectStore(this.FILE_STORE);

      const qualificationRequest = store.get('qualification');
      const aadhaarRequest = store.get('aadhaar');
      const photoRequest = store.get('photo');
      const signatureRequest = store.get('signature');

      transaction.oncomplete = () => {
        const files = {
          qualification: qualificationRequest.result ?? null,
          aadhaar: aadhaarRequest.result ?? null,
          photo: photoRequest.result ?? null,
          signature: signatureRequest.result ?? null,
        };

        this.files = files;

        db.close();

        resolve(files);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  // ==========================================================
  // Clear
  // ==========================================================

  async clear(): Promise<void> {
    this.formData = null;

    sessionStorage.removeItem(this.FORM_DATA_KEY);

    this.files = {
      qualification: null,
      aadhaar: null,
      photo: null,
      signature: null,
    };

    const db = await this.openFileDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.FILE_STORE, 'readwrite');

      const store = transaction.objectStore(this.FILE_STORE);

      store.clear();

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  // ---------------------------------------------------------
  // FINAL SUBMIT
  // ---------------------------------------------------------

  submitApplication(payload: FormData): Observable<any> {
    console.log('Submitting application with payload:', payload);
    return this.http.post(`${this.API_URL}/applications/submit`, payload);
  }

  private openFileDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(this.FILE_STORE)) {
          db.createObjectStore(this.FILE_STORE);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}
