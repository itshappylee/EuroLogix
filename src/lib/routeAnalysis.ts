import type { EventType, RiskEvent } from './types'
import { isActiveRisk } from './changes'
import type { TransportMode } from './eventMeta'

/**
 * 2b 경로 분석의 계산 규칙.
 *
 * 근거: wiki/spec/business-rules.md §6 "여러 이벤트를 하나의 등급으로 — 집계 규칙 v1"
 *
 * ```
 * ① 롤업        여러 행 → 하나의 사건        (WF-2가 이미 함)
 * ② 개별 점수    사건마다 §1~5로 1~5점        (WF-2가 이미 함)
 * ③ 관련성 필터  운송 타입에 안 맞는 건 제외   (§6.1 — 여기서)
 * ④ 대표값       남은 것 중 최댓값            (§6.2 — 여기서)
 * ```
 *
 * ⚠️ **지리 축은 국가 단위다** (→ DEC-022-country-level-matching).
 * `events`에 좌표가 없어 "경로 위에 있는가"를 판정할 수 없으므로, 사용자가 고른
 * 출발·경유·도착 **국가에 속하면 전부 걸린다.** 마르세유 파업이 파리–릴 경로에도
 * 잡히는 과다 경보를 감수한다 — 놓치는 것보다 낫기 때문이다.
 *
 * ⚠️ **여기서 계산하지 않는 것**: 대안 경로, 예상 지연시간, 실제 노선.
 * 셋 다 좌표·경로 계산이 있어야 하는데 없다 (→ Q-012-route-analysis-not-built).
 * 지어내느니 화면에서 "준비중"으로 비워 둔다.
 */

/** 경로 위험 등급을 계산할 때 쓰는 운송 타입. `events.transport_mode`의 값과 같다 */
export type RouteMode = TransportMode

/** 한 국가 구간 — 화면의 국가 구간 바 한 칸 */
export interface RouteLeg {
  country: string
  /** 표시용. 같은 나라를 여러 번 지나면 도시가 여럿일 수 있다 */
  cities: string[]
  /** 그 나라에서의 최고 severity. 관련 이벤트가 없으면 0 */
  grade: number
  /** 그 나라의 관련 이벤트 수 */
  count: number
}

/** 유형별 카드 한 장 */
export interface RouteTypeRisk {
  type: EventType
  /** 그 유형 중 가장 높은 이벤트. 없으면 null → "해당 없음" */
  top: RiskEvent | null
  count: number
}

export interface RouteAnalysisResult {
  /** 경로가 지나는 국가 (입력 순서, 중복 제거) */
  countries: string[]
  legs: RouteLeg[]
  /** §6.2 대표값 = 관련 있는 사건들의 최댓값. 하나도 없으면 0 */
  grade: number
  /** 최댓값의 단점 보완 — 건수 분포를 병기한다 (§6.2) */
  counts: { high: number; mid: number; low: number }
  /** 배지에 반영된 이벤트. severity 내림차순 */
  relevant: RiskEvent[]
  /**
   * 운송 타입이 안 맞아 배지에서 뺀 이벤트.
   * §6.1 "제외된 사건은 버리지 않는다" — 화면에서는 계속 보여준다.
   */
  excluded: RiskEvent[]
  byType: RouteTypeRisk[]
  /** 이 분석이 실제로 조회한 날짜 범위 */
  from: string
  to: string
}

/** 카드 순서 — screen-spec 2b의 리스크 카드 4개. Incident는 파업과 같은 칸에 묶지 않고 별도로 센다 */
export const ROUTE_CARD_TYPES: EventType[] = ['Strike', 'Driving Ban', 'Bank Holiday', 'Weather']

/** 출발·경유·도착에서 국가 목록을 뽑는다. 빈 값과 중복은 버리고 입력 순서를 지킨다 */
export function routeCountries(picks: { country: string }[]): string[] {
  const out: string[] = []
  for (const p of picks) {
    const c = p.country?.trim()
    if (c && !out.includes(c)) out.push(c)
  }
  return out
}

/** 출발일 + 기간(일) → 조회 범위. 3일이면 출발일 포함 3일이므로 +2일까지다 */
export function routeDateRange(depart: string, days: number): { from: string; to: string } {
  const d = new Date(`${depart}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return { from: depart, to: depart }
  const span = Math.max(1, Math.floor(days || 1))
  const end = new Date(d.getTime() + (span - 1) * 86400000)
  return { from: depart, to: end.toISOString().slice(0, 10) }
}

/**
 * §6.1 관련성 필터 — 운송 타입 축.
 *
 * - **공휴일은 항상 관련 있다.** 위키에 `transport_mode` 규정이 없고, 어차피 1점이라
 *   최댓값을 차지할 일이 거의 없다 (§6.1 [미확정] 항목).
 * - **비어 있거나 `unknown`이면 포함한다.** 모르는 것을 조용히 빼면 위험이 없는 것처럼
 *   보이게 된다 (§6.1 "`transport_mode`가 비어 있으면").
 */
export function isModeRelevant(event: RiskEvent, mode: RouteMode): boolean {
  if (event.event_type === 'Bank Holiday') return true
  const raw = (event.transport_mode ?? '').trim().toLowerCase()
  if (!raw || raw === 'unknown') return true
  return raw
    .split(',')
    .map((m) => m.trim())
    .includes(mode)
}

/**
 * §6 ③④ — 관련성 필터 후 최댓값.
 *
 * `events`는 이미 기간으로 걸러서 넘어온다고 본다(`fetchEvents(from, to)`).
 * 여기서는 국가·운송 타입·표시 여부만 본다.
 */
export function analyzeRoute(
  events: RiskEvent[],
  picks: { country: string; city: string }[],
  mode: RouteMode,
  range: { from: string; to: string },
): RouteAnalysisResult {
  const countries = routeCountries(picks)
  const onRoute = events.filter((e) => isActiveRisk(e) && countries.includes(e.country))

  const relevant: RiskEvent[] = []
  const excluded: RiskEvent[] = []
  for (const e of onRoute) {
    if (isModeRelevant(e, mode)) relevant.push(e)
    else excluded.push(e)
  }
  const bySeverity = (a: RiskEvent, b: RiskEvent) =>
    b.severity - a.severity || a.date_start.localeCompare(b.date_start)
  relevant.sort(bySeverity)
  excluded.sort(bySeverity)

  // §6.2 대표값 — 합산도 평균도 아닌 최댓값. 위험은 상쇄되지 않는다
  const grade = relevant.reduce((max, e) => Math.max(max, e.severity), 0)

  const counts = { high: 0, mid: 0, low: 0 }
  for (const e of relevant) {
    if (e.severity >= 4) counts.high++
    else if (e.severity === 3) counts.mid++
    else counts.low++
  }

  const legs: RouteLeg[] = countries.map((country) => {
    const cities = [
      ...new Set(picks.filter((p) => p.country === country && p.city).map((p) => p.city)),
    ]
    const mine = relevant.filter((e) => e.country === country)
    return {
      country,
      cities,
      grade: mine.reduce((max, e) => Math.max(max, e.severity), 0),
      count: mine.length,
    }
  })

  const byType: RouteTypeRisk[] = ROUTE_CARD_TYPES.map((type) => {
    const mine = relevant.filter((e) => e.event_type === type)
    return { type, top: mine[0] ?? null, count: mine.length }
  })

  return { countries, legs, grade, counts, relevant, excluded, byType, from: range.from, to: range.to }
}
