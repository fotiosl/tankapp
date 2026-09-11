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
