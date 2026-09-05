import { useState, type CSSProperties } from 'react'
import type { Lang, RiskEvent } from '../lib/types'
import { makeT, pickText, timeAgo } from '../lib/i18n'
import { TYPE_META, TRANSPORT_ICON, severityBand, severityLabel, type TransportMode } from '../lib/eventMeta'
import { LocationPicker, emptyLocation, type LocationValue } from './LocationPicker'
import { fetchEvents } from '../lib/supabase'
import { analyzeRoute, routeDateRange, type RouteAnalysisResult } from '../lib/routeAnalysis'
import { toISODate } from '../lib/calendar'

interface Props {
  lang: Lang
  onToast: (msg: string) => void
}

const MODES: TransportMode[] = ['road', 'rail', 'air', 'sea']

const MODE_KEY: Record<TransportMode, 'modeRoad' | 'modeRail' | 'modeAir' | 'modeSea'> = {
  road: 'modeRoad',
  rail: 'modeRail',
  air: 'modeAir',
  sea: 'modeSea',
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; result: RouteAnalysisResult; sample: boolean }

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * 2b · 경로 분석 — 실제 `events` 데이터로 계산한다 (2026-09-05, 목업 해제).
 *
 * 계산 규칙은 `lib/routeAnalysis.ts`(= business-rules §6)에 있고, 이 파일은 화면만 그린다.
 *
 * ⚠️ **여전히 없는 것 두 가지** (→ Q-012-route-analysis-not-built):
 * ⑴ 진짜 노선 지도 — 좌표가 없어 "이 선을 따라가면 무엇에 걸리나"를 못 푼다.
 *    대신 지나는 **국가를 순서대로 늘어놓은 구간 바**를 그린다. 지도인 척하지 않는다.
 * ⑵ 대안 경로·예상 지연시간 — 계산 근거가 없다. 지어내지 않고 "준비중"으로 비워 둔다.
 */
export function RouteScreen({ lang, onToast }: Props) {
  const t = makeT(lang)

  const [mode, setMode] = useState<TransportMode>('road')
  const [origin, setOrigin] = useState<LocationValue>(emptyLocation('Germany', 'Hamburg'))
  const [dest, setDest] = useState<LocationValue>(emptyLocation('France', 'Lyon'))
  const [waypoints, setWaypoints] = useState<LocationValue[]>([])
  const [depart, setDepart] = useState(toISODate(new Date()))
  const [days, setDays] = useState(3)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const picks = [origin, ...waypoints, dest]
  const canRun = Boolean(origin.country && dest.country)

  async function run() {
    if (!canRun) {
      onToast(t('routeNeedInput'))
      return
    }
    const range = routeDateRange(depart, days)
    setPhase({ kind: 'loading' })
    const load = await fetchEvents(range.from, range.to)
    if (load.kind === 'error') {
      setPhase({ kind: 'error', message: load.message })
      return
    }
    setPhase({
      kind: 'done',
      result: analyzeRoute(load.events, picks, mode, range),
      sample: load.kind === 'sample',
    })
  }

  const result = phase.kind === 'done' ? phase.result : null
  const band = severityBand(result?.grade ?? 0)

  return (
    <div className="route-screen">
      <div className="sec-bar">
        <h2 className="sec-bar-title">{t('navRoute')}</h2>
        <p className="sec-bar-note">{t('routeScopeNote')}</p>
      </div>

      <div className="route-main">
        {/* ===== 좌: 경로 정보 입력 ===== */}
        <section className="panel route-form" aria-label={t('routeInput')}>
          <h2 className="sec-title">{t('routeInput')}</h2>

          <label className="fld-label">{t('transportType')}</label>
          <div className="mode-picker" role="group" aria-label={t('transportType')}>
            {MODES.map((m) => (
              <button
                key={m}
                className={mode === m ? 'on' : ''}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                <span className="mode-ico" aria-hidden="true">
                  {TRANSPORT_ICON[m]}
                </span>
                {t(MODE_KEY[m])}
              </button>
            ))}
          </div>

          <label className="fld-label">{t('origin')}</label>
          <LocationPicker lang={lang} value={origin} onChange={setOrigin} idPrefix="r-origin" />

          {waypoints.map((w, i) => (
            <div className="wp-row" key={`wp-${i}`}>
              <div className="wp-pick-group">
                <label className="fld-label">
                  {t('waypoint')} {i + 1}
                </label>
                <LocationPicker
                  lang={lang}
                  value={w}
                  onChange={(next) => setWaypoints(waypoints.map((old, j) => (i === j ? next : old)))}
                  idPrefix={`r-wp${i}`}
                />
              </div>
              <button
                className="wp-del"
                aria-label={t('removeWaypoint')}
                title={t('removeWaypoint')}
                onClick={() => setWaypoints(waypoints.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}

          <button className="wp-add" onClick={() => setWaypoints([...waypoints, emptyLocation()])}>
            + {t('addWaypoint')}
          </button>

          <label className="fld-label">{t('destination')}</label>
          <LocationPicker lang={lang} value={dest} onChange={setDest} idPrefix="r-dest" />

          <div className="fld-2col">
            <div>
              <label className="fld-label" htmlFor="r-date">
                {t('departDate')}
              </label>
              <input
                id="r-date"
                className="fld"
                type="date"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
              />
            </div>
            <div>
              <label className="fld-label" htmlFor="r-days">
                {t('duration')}
              </label>
              <div className="fld-suffix">
                <input
                  id="r-days"
                  className="fld"
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
                <span>{t('days')}</span>
              </div>
            </div>
          </div>

          <button className="btn primary run-btn" onClick={run} disabled={phase.kind === 'loading'}>
            {phase.kind === 'loading' ? t('routeLoading') : `${t('runAnalysis')} ▶`}
          </button>
        </section>

        {/* ===== 우: 분석 결과 ===== */}
        <section className="panel route-result" aria-label={t('analysisResult')}>
          <header className="rr-head">
            <div className="rr-head-l">
              <span className="rr-mode" aria-hidden="true">
                {TRANSPORT_ICON[mode]}
              </span>
              <span className="rr-title">
                {t(MODE_KEY[mode])} {t('basedOn')}
              </span>
              {result && (
                <span className={`grade-badge sev-${band}`}>
                  {result.grade > 0
                    ? `${severityLabel(result.grade, lang)} · ${result.grade}`
                    : t('routeGradeNone')}
                </span>
              )}
            </div>
            {result && (
              <span className="rr-meta">
                {result.from} → {result.to} · {t('routeCountsHigh')} {result.counts.high} ·{' '}
                {t('routeCountsMid')} {result.counts.mid} · {t('routeCountsLow')} {result.counts.low}
              </span>
            )}
          </header>

          {phase.kind === 'idle' && <div className="detail-empty">{t('routeIdle')}</div>}
          {phase.kind === 'loading' && <div className="detail-empty">{t('routeLoading')}</div>}
          {phase.kind === 'error' && (
            <div className="detail-empty">
              {t('routeError')} — {phase.message}
            </div>
          )}

          {result && (
            <>
              {phase.kind === 'done' && phase.sample && (
                <p className="route-note warn">{t('routeSampleNote')}</p>
              )}

              {/* 국가 구간 바 — 노선 지도가 아니라 지나는 나라를 순서대로 늘어놓은 것 */}
              <div className="leg-bar" aria-label={t('routeMap')}>
                {result.legs.map((leg, i) => (
                  <div className="leg-wrap" key={leg.country}>
                    <div className={`leg sev-${severityBand(leg.grade)}${leg.grade === 0 ? ' quiet' : ''}`}>
                      <span className="leg-country">{leg.country}</span>
                      {leg.cities.length > 0 && <span className="leg-city">{leg.cities.join(' · ')}</span>}
                      <span className="leg-grade">
                        {leg.grade > 0 ? `${leg.grade} · ${leg.count}${t('routeItems')}` : t('notApplicable')}
                      </span>
                    </div>
                    {i < result.legs.length - 1 && (
                      <span className="leg-arrow" aria-hidden="true">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* 리스크 카드 4개 — 유형별 최고 이벤트 */}
              <div className="risk-cards">
                {result.byType.map((r) => {
                  const meta = TYPE_META[r.type]
                  const none = r.top === null
                  const rb = severityBand(r.top?.severity ?? 0)
                  const style = {
                    '--bar-fg': `var(--ev-${meta.key})`,
                    '--bar-bg': `var(--ev-${meta.key}-bg)`,
                  } as CSSProperties
                  return (
                    <article key={r.type} className={`risk-card${none ? ' none' : ''}`} style={style}>
                      <span className="chip type">
                        {meta.icon} {meta.label[lang]}
                      </span>
                      {none || !r.top ? (
                        <p className="rc-none">{t('notApplicable')}</p>
                      ) : (
                        <>
                          <p className="rc-label">
                            {r.top.country} · {pickText(lang, r.top.event_name_en, r.top.event_name)}
                          </p>
                          <p className="rc-sub">
                            {r.top.date_start}
                            {r.count > 1 ? ` · +${r.count - 1}${t('routeItems')}` : ''}
                          </p>
                          <span className={`rl-sev sev-${rb}`}>{r.top.severity}</span>
                        </>
                      )}
                    </article>
                  )
                })}
              </div>

              {/* 배지에 반영된 이벤트 목록 */}
              <h3 className="sec-title alt-title">
                {t('routeRelevant')} <span className="detail-count">{result.relevant.length}</span>
              </h3>
              {result.relevant.length === 0 ? (
                <div className="detail-empty">{t('routeNoEvents')}</div>
              ) : (
                <div className="detail-list">
                  {result.relevant.map((e) => (
                    <EventCard key={e.event_id} e={e} lang={lang} />
                  ))}
                </div>
              )}

              {/* §6.1 "제외된 사건은 버리지 않는다" — 등급에서만 뺐다는 것을 밝히고 남겨 둔다 */}
              {result.excluded.length > 0 && (
                <>
                  <h3 className="sec-title alt-title">
                    {t('routeExcluded')} <span className="detail-count">{result.excluded.length}</span>
                  </h3>
                  <p className="route-note">{t('routeExcludedNote')}</p>
                  <div className="detail-list dimmed">
                    {result.excluded.map((e) => (
                      <EventCard key={e.event_id} e={e} lang={lang} />
                    ))}
                  </div>
                </>
              )}

              {/* 대안 경로 — 계산 근거가 없어 자리만 남긴다 */}
              <h3 className="sec-title alt-title">{t('altRoutes')}</h3>
              <div className="alt-card pending">
                <span className="chip">{t('altPendingChip')}</span>
                <p className="alt-pending-body">{t('altPendingBody')}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** 결과 목록의 이벤트 카드 — 캘린더의 국가별 상세와 같은 모양을 쓴다 */
function EventCard({ e, lang }: { e: RiskEvent; lang: Lang }) {
  const t = makeT(lang)
  const meta = TYPE_META[e.event_type]
  const band = severityBand(e.severity)
  const period = e.date_start === e.date_end ? e.date_start : `${e.date_start} → ${e.date_end}`
  const time =
    e.time_start && e.time_end ? `${e.time_start.slice(0, 5)}–${e.time_end.slice(0, 5)}` : t('allDay')
  const style = {
    '--bar-fg': `var(--ev-${meta.key})`,
    '--bar-bg': `var(--ev-${meta.key}-bg)`,
  } as CSSProperties

  return (
    <article className="detail-card" style={style}>
      <div className="detail-card-top">
        <span className={`rl-sev sev-${band}`}>{e.severity}</span>
        <span className="chip type">
          {meta.icon} {meta.label[lang]}
        </span>
        <span className="dt-region">
          {e.country}
          {e.region ? ` · ${e.region}` : ` · ${t('nationwide')}`}
        </span>
        {e.verified !== 'yes' && <span className="chip status-unverified">{t('unverified')}</span>}
      </div>

      <p className="detail-name">{pickText(lang, e.event_name_en, e.event_name)}</p>
      <p className="detail-meta">
        {period} · {time} · {severityLabel(e.severity, lang)}
      </p>
      <p className="detail-summary">{pickText(lang, e.summary_en, e.summary)}</p>
      {e.severity_reason && (
        <p className="detail-reason">{pickText(lang, e.severity_reason_en, e.severity_reason)}</p>
      )}
      <div className="detail-source">
        <span>{t('source')}:</span>
        {e.source_url && e.source_url !== 'manual' ? (
          <a href={e.source_url} target="_blank" rel="noreferrer">
            {hostOf(e.source_url)}
          </a>
        ) : (
          <span>{e.source_url || '—'}</span>
        )}
        <span>· {timeAgo(e.upd_dtm, lang)}</span>
      </div>
    </article>
  )
}
