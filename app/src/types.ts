export type BuildingType = '아파트' | '오피스텔';

export interface Building {
  id: number;
  name: string;
  type: BuildingType;
  district: string;
  lng: number;
  lat: number;
  floors: number;
  heightMeters: number;
  builtYear: number;
  areaPyeong: number;
  priceEok: number; // 매매 추정가 (억원)
  jeonseEok: number; // 전세 추정가 (억원)
  priceTrend: number[]; // 최근 12개월 매매가 추이 (합성 데이터)
}

export interface SearchFilters {
  district?: string;
  type?: BuildingType;
  maxPriceEok?: number;
  minAreaPyeong?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
