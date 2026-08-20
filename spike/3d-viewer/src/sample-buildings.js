// 스파이크용 합성(synthetic) 건물 데이터 — 실제 지적/실거래 데이터 아님.
// 강남역 인근 좌표를 기준으로 임의 배치한 예시 필지 그리드.
const BASE_LNG = 127.0276;
const BASE_LAT = 37.4979;
const CELL = 0.0011; // 격자 간격(도) — 대략 100m 내외

const NAMES = [
  '테스트타워 A', '테스트타워 B', '테스트오피스텔 C', '테스트아파트 D',
  '테스트타워 E', '테스트오피스텔 F', '테스트아파트 G', '테스트타워 H',
  '테스트오피스텔 I', '테스트아파트 J', '테스트타워 K', '테스트오피스텔 L',
];

function makeFootprint(cx, cy, w, h) {
  return [[
    [cx - w, cy - h],
    [cx + w, cy - h],
    [cx + w, cy + h],
    [cx - w, cy + h],
    [cx - w, cy - h],
  ]];
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);

const features = [];
let id = 0;
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 4; col++) {
    const cx = BASE_LNG + (col - 1.5) * CELL;
    const cy = BASE_LAT + (row - 1) * CELL;
    const w = 0.0003 + rand() * 0.00015;
    const h = 0.0003 + rand() * 0.00015;
    const floors = 8 + Math.floor(rand() * 25);
    const heightMeters = floors * 3.1;
    const type = rand() > 0.5 ? '아파트' : '오피스텔';
    const priceEok = Math.round((6 + rand() * 14) * 10) / 10; // 매매 추정가(억)
    const jeonseEok = Math.round(priceEok * (0.55 + rand() * 0.2) * 10) / 10;
    const builtYear = 1998 + Math.floor(rand() * 26);

    features.push({
      type: 'Feature',
      id: id,
      geometry: { type: 'Polygon', coordinates: makeFootprint(cx, cy, w, h) },
      properties: {
        id,
        name: NAMES[id % NAMES.length],
        type,
        floors,
        heightMeters: Math.round(heightMeters),
        builtYear,
        priceEok,
        jeonseEok,
      },
    });
    id++;
  }
}

export const buildingsGeoJSON = {
  type: 'FeatureCollection',
  features,
};

export const MAP_CENTER = [BASE_LNG, BASE_LAT];
