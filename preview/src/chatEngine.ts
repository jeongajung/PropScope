import type { Building, BuildingType, SearchFilters } from "./types.js";
import { DISTRICT_NAMES, mockBuildings } from "./mockBuildings.js";

/**
 * 결정론적(deterministic) 검색/응답 로직 — 실제 LLM을 호출하지 않는다.
 *
 * 이 드라이버는 "B' 절충안" 구조를 위한 것: MCP 프로토콜/서버/렌더러는 실제
 * a2ui-material-kit 그대로 쓰되, render_surface를 호출하는 "에이전트" 자리에
 * 진짜 LLM 대신 이 결정론적 코드를 앉힌다. 나중에 실 Claude API 키가 생기면
 * index.ts의 handleUserQuery()만 실제 LLM 호출(도구 호출로 이 검색 함수들을
 * 실행)로 교체하면 되고, MCP/렌더링 경로는 손대지 않는다.
 */

export function parseQuery(text: string): SearchFilters {
  const filters: SearchFilters = {};

  const district = DISTRICT_NAMES.find((d) => text.includes(d) || text.includes(d.replace("구", "")));
  if (district) filters.district = district;

  const types: BuildingType[] = ["아파트", "오피스텔"];
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
  const conditionText = conditionParts.length ? conditionParts.join(" · ") : "전체 조건";

  if (results.length === 0) {
    return `"${conditionText}" 조건에 맞는 매물을 찾지 못했어요. 조건을 조금 넓혀볼까요?`;
  }

  const avgPrice = Math.round((results.reduce((s, b) => s + b.priceEok, 0) / results.length) * 10) / 10;
  return `"${conditionText}" 조건으로 ${results.length}건 찾았어요. 평균 매매 추정가는 ${avgPrice}억이에요. 목록에서 건물을 눌러보시면 지도와 상세 정보가 같이 업데이트돼요.`;
}
