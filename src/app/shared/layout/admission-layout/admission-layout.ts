import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { SITE_CONFIG } from '../../../core/config/site.config';

@Component({
  selector: 'app-admission-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './admission-layout.html',
  styleUrl: './admission-layout.scss',
})
export class AdmissionLayout {
  readonly site = SITE_CONFIG;

  readonly currentYear = new Date().getFullYear();

  private readonly router = inject(Router);

  get applicationNumber(): string | null {
    const segments = this.router.url.split('/').filter(Boolean);

    if (!segments.length) {
      return null;
    }

    const value = segments[0];

    if (value.startsWith('TSC-')) {
      return value;
    }

    return null;
  }
}
