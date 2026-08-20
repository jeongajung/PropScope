import type { Building, SearchFilters, BuildingType } from '../types';
import { DISTRICT_NAMES, mockBuildings } from './mockBuildings';

/**
 * MOCK 챗봇 엔진 — 실제 LLM을 호출하지 않는 규칙 기반 시뮬레이터.
 *
 * 이 파일은 PRD 6.1 "AI 임장 챗봇"의 UX/아키텍처를 미리 만들어보기 위한 자리표시자다.
 * 실 서비스 전환 시:
 *   - parseQuery()            → Claude의 tool use(자연어 → 구조화된 검색 필터) 호출로 교체
 *   - searchBuildings()       → 위 tool의 실행부(국토부 실거래가 API 등 실 데이터 조회)로 교체
 *   - formatAssistantReply()  → LLM이 searchBuildings() 결과를 "인용"해서 응답을 생성하도록 교체
 *     (PRD 6.1의 환각 방지 원칙: 가격 등 정량 데이터는 LLM이 만들어내지 않고, 조회된 데이터만 인용)
 *
 * 지금 이 mock도 같은 원칙을 지킨다 — parseQuery가 어떤 필터를 뽑아내든, 응답 문구의 숫자는
 * 전부 실제로 필터링된 mockBuildings 배열에서 가져온다 (지어내지 않음).
 */

export function parseQuery(text: string): SearchFilters {
  const filters: SearchFilters = {};

  const district = DISTRICT_NAMES.find((d) => text.includes(d) || text.includes(d.replace('구', '')));
  if (district) filters.district = district;

  const types: BuildingType[] = ['아파트', '오피스텔'];
  const type = types.find((t) => text.includes(t));
  if (type) filters.type = type;

  const priceMatch = text.match(/(\d+(\.\d+)?)\s*억/);
  if (priceMatch) filters.maxPriceEok = Number(priceMatch[1]);

  const areaMatch = text.match(/(\d+)\s*평/);
  if (areaMatch) filters.minAreaPyeong = Number(areaMatch[1]) - 5;

  return filters;
}

export function searchBuildings(filters: SearchFilters): Building[] {
  return mockBuildings.filter((b) => {
    if (filters.district && b.district !== filters.district) return false;
    if (filters.type && b.type !== filters.type) return false;
    if (filters.maxPriceEok && b.priceEok > filters.maxPriceEok) return false;
    if (filters.minAreaPyeong && b.areaPyeong < filters.minAreaPyeong) return false;
    return true;
  });
}

export function formatAssistantReply(filters: SearchFilters, results: Building[]): string {
  const conditionParts: string[] = [];
  if (filters.district) conditionParts.push(filters.district);
  if (filters.type) conditionParts.push(filters.type);
  if (filters.maxPriceEok) conditionParts.push(`${filters.maxPriceEok}억 이하`);
  if (filters.minAreaPyeong) conditionParts.push(`${filters.minAreaPyeong + 5}평대`);
  const conditionText = conditionParts.length ? conditionParts.join(' · ') : '전체 조건';

  if (results.length === 0) {
    return `"${conditionText}" 조건에 맞는 매물을 찾지 못했어요. 조건을 조금 넓혀볼까요? (예: 가격대를 올리거나 지역을 바꿔보세요)`;
  }

  const avgPrice = Math.round((results.reduce((s, b) => s + b.priceEok, 0) / results.length) * 10) / 10;
  const sample = results.slice(0, 3).map((b) => `${b.name}(${b.priceEok}억)`).join(', ');

  return `"${conditionText}" 조건으로 ${results.length}건 찾았어요. 평균 매매 추정가는 ${avgPrice}억이고, 예를 들면 ${sample} 등이 있어요. 지도에서 건물을 클릭하면 상세 정보를 볼 수 있어요.`;
}
