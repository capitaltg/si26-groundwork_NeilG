export interface Facility {
  name: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  parent_company: string;
  latitude: number;
  longitude: number;
}

export interface FacilitySearchResult {
  tri_facility_id: string;
  facility_name: string;
  city_name: string;
  state_abbr: string;
}

export interface Release {
  chemical: string;
  chem_id: string;
  year: number;
  air_release: number;
  water_release: number;
  land_release: number;
  recycled: number;
  treated: number;
  transferred_offsite: number;
  is_hazardous: boolean;
}

export interface HazardWatchRow {
  facility_id: string;
  facility_name: string;
  chemical: string;
  chem_id: string;
  year: number;
  total_release: number;
}

export interface ComplianceProgram {
  statute: string;
  status: string | null;
  inspection_count: string | null;
  formal_actions_count: string | null;
  total_penalties: string | null;
}

export interface FacilityCompliance {
  industry: string | null;
  programs: ComplianceProgram[];
}

export interface SiteSearchFacility {
  registry_id: string;
  name: string;
  city: string;
  state: string;
  programs: string[];
  compliance_status: string | null;
  significant_violation: boolean;
}

export interface SiteSearchResult {
  latitude: number | null;
  longitude: number | null;
  facilities: SiteSearchFacility[];
}
