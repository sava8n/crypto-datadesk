// mirrors core/schemas/

export interface SurfacePoint {
  expiry: string;
  tte_years: number;
  delta: number;
  mark_iv: number;
  option_type: string;
}

export interface IVSurfaceResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: SurfacePoint[];
}

export interface CurvePoint {
  expiry: string;
  tte_years: number;
  strike: number;
  mark_iv: number;
  option_type: string;
}

export interface IVCurvesResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: CurvePoint[];
}

export interface GreekPoint {
  expiry: string;
  tte_years: number;
  strike: number;
  value: number;
  option_type: string;
}

export interface GreeksResponse {
  currency: string;
  spot: number;
  greek: string;
  as_of: string;
  points: GreekPoint[];
}
