export interface Company {
  name: string;
  businessId: string;
  industry: string;
  location: string;
  employees?: number;
  entrepreneur?: number;
  revenue?: string;
  ownerForm?: string;
  services?: string[];
  contact: {
    website?: string;
    email?: string;
    phone?: string;
  };
}

export interface KPI {
  scope1_kg: number;
  scope1_kg_raw?: number;
  scope2_kg: number;
  scope2_kg_raw?: number;
  scope2_t_raw?: number;
  scope3_kg?: number;
  scope3_kg_raw?: number;
  scope3_status: string;
  electricity_kwh: number;
  electricity_kwh_raw?: number;
  emissionFactor_g_per_kwh: number;
  source: string;
}

export interface YearData {
  year: number;
  reportingPeriod: string;
  kpi: KPI;
  disclosures?: {
    general?: string;
    environmental?: string;
    social?: string;
    governance?: string;
  };
}

export interface BasicModule {
  id: string;
  title: string;
  description: string;
  details: string;
  status: 'raportoitu' | 'vähäinen' | 'ei sovellettavissa';
  applicability: 'korkea' | 'kohtalainen' | 'vähäinen';
  group: string;
}

export interface ExtendedModule {
  id: string;
  title: string;
  description: string;
  details: string;
  status: string;
  applicability: string;
  group: string;
}

export interface Source {
  name: string;
  url: string;
  description: string;
}

export interface MaterialityItem {
  id: string;
  module_type: string;
  module_title: string;
  group: string;
  materiality_topic: string;
  impact: number;
  financial: number;
  stakeholder: number;
  score: number;
  classification: string;
}

export interface MaterialityData {
  year: number;
  items: MaterialityItem[];
}

export interface SustainabilityData {
  company: Company;
  years: YearData[];
  modules: {
    basic: BasicModule[];
    extended: ExtendedModule[];
  };
  sources?: Source[];
  materiality?: MaterialityData[];
}
