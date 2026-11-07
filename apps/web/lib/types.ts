export type WorkflowStatus = 'REGISTERED' | 'IN_REVIEW' | 'VALIDATED' | 'ISSUED' | 'REJECTED';

export type BirthRecord = {
  id: string; record_number: string; last_name: string; first_names: string;
  sex: 'M' | 'F'; birth_date: string; nationality: string; district: string;
  municipality: string; place_of_birth: string; father_name: string;
  mother_name: string; address: string; declarant_name: string;
  status: WorkflowStatus; created_at: string;
};

export type CitizenInput = {
  last_name: string;
  first_names: string;
  sex: 'M' | 'F';
  birth_date: string;
  nationality: string;
  birth_place: string;
};

export type Citizen = CitizenInput & {
  id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  commune: { id: string; code: string; name: string };
  centre: { id: string; code: string; name: string };
  birth_records: Array<{
    id: string;
    record_number: string;
    status: WorkflowStatus;
    created_at: string;
  }>;
};

export type CinCase = {
  id: string; file_number: string; last_name: string; first_names: string;
  birth_date: string; birth_place: string; address: string; district: string;
  profession: string; father_name: string; mother_name: string;
  has_birth_certificate: boolean; has_residence_proof: boolean;
  photos_count: number; status: WorkflowStatus; created_at: string;
};

export type RecentRequest = {
  id: string; number: string; type: 'Naissance' | 'CIN'; citizen: string;
  status: WorkflowStatus; created_at: string; url: string;
};

export type DashboardData = {
  citizens: number;
  declarations: number;
  validated_acts: number;
  documents_delivered: number;
  births: number;
  cin_cases: number;
  pending: number;
  delivered: number;
  recent: RecentRequest[];
};

export type BirthCreate = {
  last_name: string; first_names: string; sex: 'M' | 'F';
  birth_date: string; nationality: string; district: string;
  municipality: string; place_of_birth: string;
  father_name: string; mother_name: string; address: string;
  declarant_name: string;
};

export type CinCreate = {
  last_name: string; first_names: string; birth_date: string;
  birth_place: string; address: string; district: string;
  profession: string; father_name: string; mother_name: string;
  has_birth_certificate: boolean; has_residence_proof: boolean; photos_count: number;
};
