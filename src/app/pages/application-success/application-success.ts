import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-application-success',
  standalone: true,
  templateUrl: './application-success.html',
  styleUrl: './application-success.scss',
})
export class ApplicationSuccess {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  applicationNumber = '';

  constructor() {
    this.applicationNumber = this.route.snapshot.paramMap.get('applicationNumber') ?? '';
  }
}
