import { Routes } from '@angular/router';
import { AdmissionForm } from './pages/admission-form/admission-form';
import { AdmissionLayout } from './shared/layout/admission-layout/admission-layout';
import { ApplicationPreview } from './pages/application-preview/application-preview';
import { ApplicationSuccess } from './pages/application-success/application-success';

export const routes: Routes = [
  {
    path: '',
    component: AdmissionLayout,

    children: [
      {
        path: '',
        component: AdmissionForm,
      },

      {
        path: ':applicationNumber',
        component: AdmissionForm,
      },
      {
        path: ':applicationNumber/preview',
        component: ApplicationPreview,
      },

      {
        path: ':applicationNumber/success',
        component: ApplicationSuccess,
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
