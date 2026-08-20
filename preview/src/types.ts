import type { Building, BuildingType } from "./mockBuildings.js";

export type { Building, BuildingType };

export interface SearchFilters {
  district?: string;
  type?: BuildingType;
  maxPriceEok?: number;
  minAreaPyeong?: number;
}

/** A2UI 노드 — mcp-server의 A2UINodeSchema와 형태를 맞춘 최소 타입(드라이버 쪽에서 직접 검증하지 않음). */
export interface A2UINode {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  children?: string[];
  refs?: Record<string, string>;
}

export interface A2UISurface {
  root: string;
  nodes: A2UINode[];
}
