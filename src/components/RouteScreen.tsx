import { useState, type CSSProperties } from 'react'
import type { Lang } from '../lib/types'
import { makeT } from '../lib/i18n'
import { TYPE_META, severityBand, severityLabel } from '../lib/eventMeta'
import { MOCK_ANALYSIS, TRANSPORT_ICON, type TransportType } from '../lib/mockRoute'
import { toISODate } from '../lib/calendar'
import { COUNTRY_POINTS } from '../lib/geo'

interface Props {
  lang: Lang
  onToast: (msg: string) => void
}

const MODES: TransportType[] = ['truck', 'rail', 'air', 'sea']
const COUNTRY_OPTIONS = [...new Set(COUNTRY_POINTS.map((p) => p.name))].sort()
const CITY_BY_COUNTRY: Record<string, string[]> = {
  Germany: ['Hamburg', 'Berlin', 'Frankfurt', 'Munich', 'Düsseldorf'],
  France: ['Lyon', 'Paris', 'Marseille', 'Le Havre', 'Strasbourg'],
  Belgium: ['Brussels', 'Antwerp', 'Ghent', 'Liège'],
  Netherlands: ['Rotterdam', 'Amsterdam', 'Eindhoven', 'Utrecht'],
  Italy: ['Milan', 'Rome', 'Naples', 'Turin'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
  Poland: ['Warsaw', 'Gdańsk', 'Katowice', 'Wrocław'],
  Czechia: ['Prague', 'Brno', 'Ostrava'],
  Austria: ['Vienna', 'Graz', 'Linz'],
  Slovakia: ['Bratislava', 'Košice'],
  Hungary: ['Budapest', 'Debrecen'],
  Romania: ['Bucharest', 'Cluj-Napoca', 'Constanța'],
  Bulgaria: ['Sofia', 'Varna', 'Plovdiv'],
  Greece: ['Athens', 'Thessaloniki', 'Piraeus'],
  Denmark: ['Copenhagen', 'Aarhus'],
  Sweden: ['Stockholm', 'Gothenburg', 'Malmö'],
  Portugal: ['Lisbon', 'Porto'],
  Ireland: ['Dublin', 'Cork'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Liverpool'],
  'Bosnia and Herzegovina': ['Sarajevo', 'Mostar'],
  'North Macedonia': ['Skopje', 'Bitola'],
  'Czech Republic': ['Prague', 'Brno'],
  Turkey: ['Istanbul', 'Ankara', 'Izmir'],
}

type LocationPick = {
  country: string
  city: string
  customCity: string
}

const makeLocationPick = (country: string, city: string): LocationPick => ({
  country,
  city,
  customCity: '',
})

/**
 * 2b · Operator 전용 — 경로 분석.
 *
 * ⚠️ **전부 목업이다.** 좌표·경로·대안 계산이 실제로 존재하지 않는다
 * (→ wiki/questions/Q-012-route-analysis-not-built.md).
 * 사용자 지시로 와이어프레임을 그대로 옮겼고, 오해를 막기 위해 목업 배너를 상시 노출한다.
 */
export function RouteScreen({ lang, onToast }: Props) {
  const t = makeT(lang)
  const a = MOCK_ANALYSIS

  const [mode, setMode] = useState<TransportType>('truck')
  const [origin, setOrigin] = useState<LocationPick>(makeLocationPick('Germany', 'Hamburg'))
  const [dest, setDest] = useState<LocationPick>(makeLocationPick('France', 'Lyon'))
  const [waypoints, setWaypoints] = useState<LocationPick[]>([])
  const [depart, setDepart] = useState(toISODate(new Date()))
  const [days, setDays] = useState(3)
  const [ran, setRan] = useState(true)

  const band = severityBand(a.gradeSeverity)

  return (
    <div className="route-screen">
      <div className="sec-bar">
        <h2 className="sec-bar-title">{t('navRoute')}</h2>
        <span className="mock-chip">⚠️ MOCKUP</span>
        <p className="sec-bar-note">{t('mockBanner')}</p>
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
                {t(`mode${m === 'truck' ? 'Road' : m === 'rail' ? 'Rail' : m === 'air' ? 'Air' : 'Sea'}`)}
              </button>
            ))}
          </div>

          <label className="fld-label">{t('origin')}</label>
          <div className="fld-2col">
            <div>
              <label className="fld-label" htmlFor="r-origin-country">
                {t('fieldCountry')}
              </label>
              <select
                id="r-origin-country"
                className="fld"
                value={origin.country}
                onChange={(e) => {
                  const nextCountry = e.target.value
                  const cities = CITY_BY_COUNTRY[nextCountry] ?? []
                  setOrigin({
                    country: nextCountry,
                    city: cities.includes(origin.city) ? origin.city : cities[0] ?? 'Other',
                    customCity: nextCountry && cities.length === 0 ? origin.customCity : '',
                  })
                }}
              >
                <option value="">{t('selectPlaceholder')}</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="fld-label" htmlFor="r-origin-city">
                {t('fieldCity')}
              </label>
              <select
                id="r-origin-city"
                className="fld"
                value={origin.city}
                onChange={(e) => {
                  const nextCity = e.target.value
                  setOrigin({ ...origin, city: nextCity, customCity: nextCity === 'Other' ? origin.customCity : '' })
                }}
                disabled={!origin.country}
              >
                <option value="">{origin.country ? t('selectPlaceholder') : '—'}</option>
                {[(CITY_BY_COUNTRY[origin.country] ?? []), ['Other']].flat().map((city) => (
                  <option key={city} value={city}>
                    {city === 'Other' ? 'Other' : city}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {origin.city === 'Other' && (
            <div className="fld-wrap">
              <label className="fld-label" htmlFor="r-origin-custom-city">
                Other city
              </label>
              <input
                id="r-origin-custom-city"
                className="fld"
                placeholder="Enter city"
                value={origin.customCity}
                onChange={(e) => setOrigin({ ...origin, customCity: e.target.value })}
              />
            </div>
          )}

          {waypoints.map((w, i) => {
            const cityOptions = [(CITY_BY_COUNTRY[w.country] ?? []), ['Other']].flat()
            return (
              <div key={i} className="wp-row">
                <div className="wp-pick-group">
                  <select
                    className="fld"
                    value={w.country}
                    onChange={(e) => {
                      const nextCountry = e.target.value
                      const cities = CITY_BY_COUNTRY[nextCountry] ?? []
                      setWaypoints(
                        waypoints.map((x, j) =>
                          j === i
                            ? {
                                country: nextCountry,
                                city: cities.includes(x.city) ? x.city : cities[0] ?? 'Other',
                                customCity: nextCountry && cities.length === 0 ? x.customCity : '',
                              }
                            : x,
                        ),
                      )
                    }}
                  >
                    <option value="">{t('selectPlaceholder')}</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    className="fld"
                    value={w.city}
                    onChange={(e) => {
                      const nextCity = e.target.value
                      setWaypoints(
                        waypoints.map((x, j) =>
                          j === i ? { ...x, city: nextCity, customCity: nextCity === 'Other' ? x.customCity : '' } : x,
                        ),
                      )
                    }}
                    disabled={!w.country}
                  >
                    <option value="">{w.country ? t('selectPlaceholder') : '—'}</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city === 'Other' ? 'Other' : city}
                      </option>
                    ))}
                  </select>
                  {w.city === 'Other' && (
                    <input
                      className="fld"
                      placeholder="Other city"
                      value={w.customCity}
                      onChange={(e) =>
                        setWaypoints(
                          waypoints.map((x, j) =>
                            j === i ? { ...x, customCity: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  )}
                </div>
                <button
                  className="wp-del"
                  aria-label="remove"
                  onClick={() => setWaypoints(waypoints.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            )
          })}

          <button
            className="wp-add"
            onClick={() => setWaypoints([...waypoints, makeLocationPick('', '')])}
          >
            + {t('addWaypoint')}
          </button>

          <label className="fld-label">{t('destination')}</label>
          <div className="fld-2col">
            <div>
              <label className="fld-label" htmlFor="r-dest-country">
                {t('fieldCountry')}
              </label>
              <select
                id="r-dest-country"
                className="fld"
                value={dest.country}
                onChange={(e) => {
                  const nextCountry = e.target.value
                  const cities = CITY_BY_COUNTRY[nextCountry] ?? []
                  setDest({
                    country: nextCountry,
                    city: cities.includes(dest.city) ? dest.city : cities[0] ?? 'Other',
                    customCity: nextCountry && cities.length === 0 ? dest.customCity : '',
                  })
                }}
              >
                <option value="">{t('selectPlaceholder')}</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="fld-label" htmlFor="r-dest-city">
                {t('fieldCity')}
              </label>
              <select
                id="r-dest-city"
                className="fld"
                value={dest.city}
                onChange={(e) => {
                  const nextCity = e.target.value
                  setDest({ ...dest, city: nextCity, customCity: nextCity === 'Other' ? dest.customCity : '' })
                }}
                disabled={!dest.country}
              >
                <option value="">{dest.country ? t('selectPlaceholder') : '—'}</option>
                {[(CITY_BY_COUNTRY[dest.country] ?? []), ['Other']].flat().map((city) => (
                  <option key={city} value={city}>
                    {city === 'Other' ? 'Other' : city}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dest.city === 'Other' && (
            <div className="fld-wrap">
              <label className="fld-label" htmlFor="r-dest-custom-city">
                Other city
              </label>
              <input
                id="r-dest-custom-city"
                className="fld"
                placeholder="Enter city"
                value={dest.customCity}
                onChange={(e) => setDest({ ...dest, customCity: e.target.value })}
              />
            </div>
          )}

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


          <button
            className="btn primary run-btn"
            onClick={() => {
              setRan(true)
              onToast(t('mockBanner'))
            }}
          >
            {t('runAnalysis')} ▶
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
                {t(`mode${mode === 'truck' ? 'Road' : mode === 'rail' ? 'Rail' : mode === 'air' ? 'Air' : 'Sea'}`)}{' '}
                {t('basedOn')}
              </span>
              <span className={`grade-badge sev-${band}`}>
                {severityLabel(a.gradeSeverity, lang)} · {a.gradeSeverity}
              </span>
            </div>
            <span className="rr-meta">
              {t('dataSources')} {a.sourceCount}
              {t('places')} · {t('updatedAgo')} {a.updatedMinutesAgo}
              {t('minutesAgoShort')}
            </span>
          </header>

          {!ran ? (
            <div className="detail-empty">{t('runAnalysis')}</div>
          ) : (
            <>
              {/* 스키마틱 경로도 — 실제 지도가 아니라 구간 개념도다 */}
              <div className="routemap" aria-label={t('routeMap')}>
                <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="rm-svg">
                  <line x1="2" y1="11" x2="98" y2="11" className="rm-base" />
                  <line x1="34" y1="11" x2="66" y2="11" className="rm-high" />
                  <line x1="66" y1="11" x2="88" y2="11" className="rm-mid" />
                </svg>
                <div className="rm-nodes">
                  {a.nodes.map((n) => (
                    <div key={n.name} className={`rm-node r-${n.risk}`} style={{ left: `${n.x}%` }}>
                      <span className="rm-dot" />
                      <span className="rm-label">
                        <b>{n.name}</b>
                        <em>{n.code}</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 리스크 카드 4개 */}
              <div className="risk-cards">
                {a.risks.map((r) => {
                  const meta = TYPE_META[r.type]
                  const rb = severityBand(r.severity)
                  const none = r.label === null
                  const style = {
                    '--bar-fg': `var(--ev-${meta.key})`,
                    '--bar-bg': `var(--ev-${meta.key}-bg)`,
                  } as CSSProperties
                  return (
                    <article
                      key={r.type}
                      className={`risk-card${none ? ' none' : ''}`}
                      style={style}
                    >
                      <span className="chip type">
                        {meta.icon} {meta.label[lang]}
                      </span>
                      {none ? (
                        <p className="rc-none">{t('notApplicable')}</p>
                      ) : (
                        <>
                          <p className="rc-label">{r.label}</p>
                          <span className={`rl-sev sev-${rb}`}>{r.severity}</span>
                        </>
                      )}
                    </article>
                  )
                })}
              </div>

              {/* 대안 경로 */}
              <h3 className="sec-title alt-title">{t('altRoutes')}</h3>
              <div className="alt-list">
                {a.alternatives.map((alt) => {
                  const ab = severityBand(alt.severity)
                  return (
                    <article className="alt-card" key={alt.id}>
                      <div className="alt-top">
                        <span className={`grade-badge sev-${ab}`}>
                          {severityLabel(alt.severity, lang)} · {alt.severity}
                        </span>
                        {alt.switchMode && (
                          <span className="alt-switch" aria-hidden="true">
                            {TRANSPORT_ICON[alt.switchMode]}
                          </span>
                        )}
                      </div>
                      <h4 className="alt-name">{alt.title}</h4>
                      <p className="alt-meta">
                        {t('extraTime')} +{alt.extraHours}
                        {t('hours')} · {alt.benefit}
                      </p>
                      <button className="btn alt-btn" onClick={() => onToast(t('altPending'))}>
                        {t('chooseAlt')}
                      </button>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
