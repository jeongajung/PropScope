export type BuildingType = "아파트" | "오피스텔";

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
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

// 합성(synthetic) 건물 데이터 — 실제 실거래가/건축물대장 데이터 아님.
// 실 서비스 전환 시 국토교통부 실거래가 API + 브이월드 3D 건물 API 응답으로 교체.

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface DistrictSeed {
  district: string;
  centerLng: number;
  centerLat: number;
}

const DISTRICTS: DistrictSeed[] = [
  { district: "강남구", centerLng: 127.0276, centerLat: 37.4979 },
  { district: "마포구", centerLng: 126.9139, centerLat: 37.5495 },
];

const NAME_PREFIXES = ["테스트타워", "테스트오피스텔", "테스트아파트", "테스트파크", "테스트힐즈"];

function buildTrend(rand: () => number, priceEok: number): number[] {
  const months = 12;
  let v = priceEok * 0.86;
  const series: number[] = [];
  for (let i = 0; i < months; i++) {
    v += (rand() - 0.32) * (priceEok * 0.03);
    series.push(Math.round(Math.max(v, priceEok * 0.55) * 100) / 100);
  }
  series[months - 1] = priceEok;
  return series;
}

function generateForDistrict(seed: DistrictSeed, idOffset: number, rand: () => number): Building[] {
  const buildings: Building[] = [];
  const CELL = 0.0016;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const idNum = idOffset + row * 4 + col;
      const type: BuildingType = rand() > 0.5 ? "아파트" : "오피스텔";
      const floors = 8 + Math.floor(rand() * 25);
      const areaPyeong = type === "아파트" ? 18 + Math.floor(rand() * 22) : 10 + Math.floor(rand() * 15);
      const basePrice = type === "아파트" ? 8 + rand() * 14 : 4 + rand() * 8;
      const priceEok = Math.round(basePrice * 10) / 10;
      const jeonseEok = Math.round(priceEok * (0.55 + rand() * 0.2) * 10) / 10;
      const builtYear = 1998 + Math.floor(rand() * 26);
      const prefix = NAME_PREFIXES[idNum % NAME_PREFIXES.length];

      buildings.push({
        id: String(idNum),
        name: `${prefix} ${String.fromCharCode(65 + (idNum % 26))}동`,
        type,
        district: seed.district,
        lng: seed.centerLng + (col - 1.5) * CELL,
        lat: seed.centerLat + (row - 1) * CELL,
        floors,
        builtYear,
        areaPyeong,
        priceEok,
        jeonseEok,
        priceTrend: buildTrend(rand, priceEok),
      });
    }
  }
  return buildings;
}

const rand = seededRandom(2024);
export const mockBuildings: Building[] = DISTRICTS.flatMap((d, i) => generateForDistrict(d, i * 100, rand));
export const DISTRICT_NAMES = DISTRICTS.map((d) => d.district);
