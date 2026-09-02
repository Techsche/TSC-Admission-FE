export interface AdmissionFormData {
  fullName: string;
  email: string;
  mobile: string;

  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;

  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentDistrict: string;
  currentState: string;
  currentPincode: string;

  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentCity: string;
  permanentDistrict: string;
  permanentState: string;
  permanentPincode: string;

  sameAddress: boolean;

  highestQualification: string;

  declarationAccepted: boolean;
}
