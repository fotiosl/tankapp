export type FuelType = 'diesel' | 'e5' | 'e10';

export interface Station {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  diesel: number | null | false;
  e5: number | null | false;
  e10: number | null | false;
  isOpen: boolean;
  houseNumber?: string;
  postCode?: number | string;
}

export interface TankerkoenigResponse {
  ok: boolean;
  license: string;
  data: string;
  status: string;
  message?: string;
  stations?: Station[];
}

export type SortMode = 'price' | 'dist';

export interface Coordinates {
  lat: number;
  lng: number;
  name?: string;
}

export interface UserSettings {
  tankVolumeLiters: number;
  consumptionPer100Km: number;
}

export interface PriceAlert {
  enabled: boolean;
  fuelType: FuelType;
  targetPrice: number;
}

export interface OpeningTime {
  text: string;
  start: string;
  end: string;
}

export interface StationDetailData {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  postCode: number | string;
  place: string;
  isOpen: boolean;
  wholeDay: boolean;
  openingTimes?: OpeningTime[];
  overrides?: string[];
}

export interface TankerkoenigDetailResponse {
  ok: boolean;
  license: string;
  data: string;
  status: string;
  message?: string;
  station?: StationDetailData;
}

export interface QuickLocation {
  id: 'home' | 'work';
  label: string;
  name: string;
  lat: number;
  lng: number;
}

export type ThemeMode = 'dark' | 'light';

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

