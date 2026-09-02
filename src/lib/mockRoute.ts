import type { EventType } from './types'

/**
 * ⚠️⚠️ 2b 경로 분석 화면 전용 **목업 데이터**. 실제 시스템에 이런 기능이 없다.
 *
 * `events` 테이블에는 **좌표도, 경로 개념도, `affected_nodes`도 없다**
 * (→ wiki/spec/data-model.md "아직 없는 것", wiki/questions/Q-012-route-analysis-not-built.md).
 * 따라서 이 화면이 보여주는 경로·지도·대안·예상 지연시간은 **전부 지어낸 값**이며,
 * 백엔드가 생기면 API 계약도 이 모양이 아닐 가능성이 높다.
 *
 * 사용자 지시로 "와이어프레임 그대로 목업"을 만든 것이다 (2026-08-13).
 * 화면 상단에 목업 배너를 상시 노출해 오해를 막는다.
 */

export type TransportType = 'truck' | 'rail' | 'air' | 'sea'

export interface RouteRisk {
  type: EventType
  /** 없으면 "해당 없음" */
  label: string | null
  severity: number
  country: string | null
}

export interface AltRoute {
  id: string
  title: string
  severity: number
  extraHours: number
  benefit: string
  switchMode?: TransportType
}

export interface RouteAnalysis {
  gradeSeverity: number
  sourceCount: number
  updatedMinutesAgo: number
  /** 스키마틱 경로도의 정류점. x는 0~100 비율 */
  nodes: { code: string; name: string; x: number; risk: 'none' | 'mid' | 'high' }[]
  risks: RouteRisk[]
  alternatives: AltRoute[]
}

/** 와이어프레임 2b의 예시(함부르크 DE → 리옹 FR)를 그대로 옮긴 목업 */
export const MOCK_ANALYSIS: RouteAnalysis = {
  gradeSeverity: 4,
  sourceCount: 4,
  updatedMinutesAgo: 10,
  nodes: [
    { code: 'DE', name: 'Hamburg', x: 0, risk: 'none' },
    { code: 'DE', name: 'Frankfurt', x: 34, risk: 'high' },
    { code: 'FR', name: 'Strasbourg', x: 66, risk: 'mid' },
    { code: 'FR', name: 'Lyon', x: 100, risk: 'none' },
  ],
  risks: [
    { type: 'Strike', label: 'FR 화물노조 파업 (7/12)', severity: 4, country: 'France' },
    { type: 'Driving Ban', label: 'DE 일요일 트럭 제한', severity: 3, country: 'Germany' },
    { type: 'Bank Holiday', label: null, severity: 0, country: null },
    { type: 'Weather', label: '알프스 폭우 주의', severity: 2, country: 'France' },
  ],
  alternatives: [
    {
      id: 'alt-a',
      title: '스위스 경유 (트럭 유지)',
      severity: 3,
      extraHours: 4,
      benefit: '파업 구간 회피',
    },
    {
      id: 'alt-b',
      title: '기차 전환',
      severity: 2,
      extraHours: 6,
      benefit: '도로 리스크 전체 회피',
      switchMode: 'rail',
    },
  ],
}

export const TRANSPORT_ICON: Record<TransportType, string> = {
  truck: '🚚',
  rail: '🚆',
  air: '✈️',
  sea: '🚢',
}
