export interface Building {
  id: string;
  name: string;
  type: string;
  district: string;
  lng: number;
  lat: number;
  floors: number;
  builtYear: number;
  areaPyeong: number;
  priceEok: number;
  jeonseEok: number;
  priceTrend: number[];
}
