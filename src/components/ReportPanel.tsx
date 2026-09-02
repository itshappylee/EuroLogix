import { useEffect, useRef, useState } from 'react'
import type { EventType, Lang } from '../lib/types'
import { submitReport } from '../lib/candidates'
import { TRANSPORT_ICON, TRANSPORT_MODES, TYPE_META, type TransportMode } from '../lib/eventMeta'
import { makeT } from '../lib/i18n'
import { toISODate } from '../lib/calendar'

interface Props {
  lang: Lang
  countries: string[]
  date: Date | null
  /** 로그인한 사람의 이메일. null이면 제출할 수 없다 (쓰기는 authenticated 전용 → Q-022) */
  reporter: string | null
  onClose: () => void
  onSignIn: () => void
  onSubmitted: (msg: string) => void
}

/** 와이어프레임 2d — 위험 유형 4개 중 1개 선택 (Incident는 목록에 없다) */
const REPORT_TYPES: EventType[] = ['Driving Ban', 'Strike', 'Weather', 'Bank Holiday']

/** 30분 단위 선택 리스트 */
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

/**
 * 2d · 위험 보고 — 캘린더 위 플로팅 패널.
 *
 * 와이어프레임: "전부 선택식. 직접 타이핑 없음(오타 방지)". 상세 내용만 자유 텍스트.
 *
 * ✅ **2026-08-27부터 실제로 저장된다.** Q-021이 지적한 세 가지를 다 풀었다:
 *   1. `risk_candidates.category` CHECK에 `driving_ban`·`weather`·`bank_holiday` 추가
 *   2. `time_start`/`time_end` 컬럼 추가 — 운행금지는 business-rules §4가 시간대로 점수를 매긴다
 *   3. RLS에 `authenticated` 쓰기 정책 추가 (읽기는 anon 공개 유지 → DEC-020, Q-022)
 *
 * 저장은 `risk_candidates`로 간다. **바로 캘린더에 뜨지 않는다** — 승인을 거쳐야 한다.
 * 그게 DEC-023(verified = 사람 검수 통과)의 요지다.
 *
 * 로그인하지 않으면 제출 버튼이 잠긴다. 폼을 다 채운 뒤에 막히면 입력을 잃으므로
 * 이유와 로그인 버튼을 하단에 함께 둔다.
 */
export function ReportPanel({ lang, countries, date, reporter, onClose, onSignIn, onSubmitted }: Props) {
  const t = makeT(lang)
  const ref = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)

  const [type, setType] = useState<EventType | null>(null)
  /** 'all' = 전체. `events.transport_mode`는 복수값(`road,rail`)이 가능하지만 보고는 단일 선택으로 둔다 */
  const [transport, setTransport] = useState<TransportMode | 'all'>('all')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [day, setDay] = useState(toISODate(date ?? new Date()))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  /** 유형·나라·날짜는 없으면 후보로서 의미가 없다. 시간과 상세는 선택 */
  const complete = Boolean(type && country && day)

  async function send() {
    if (!type || !reporter) return
    setBusy(true)
    setErr(null)
    const msg = await submitReport({
      type,
      transport: transport === 'all' ? null : transport,
      country,
      city,
      day,
      from,
      to,
      detail,
      reporter,
    })
    setBusy(false)
    if (msg) setErr(msg)
    else {
      onSubmitted(t('reportSubmitted'))
      onClose()
    }
  }

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !ref.current) return
      // 포커스 트랩 — 패널 밖으로 탭이 새면 뒤 화면을 읽게 된다
      const f = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, select, textarea, [href]',
      )
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-title"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div>
            <h2 id="rp-title">{t('reportTitle')}</h2>
            <p className="sheet-sub">{t('reportSubtitle')}</p>
          </div>
          <button className="sheet-x" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </header>

        <div className="sheet-body">
          <label className="fld-label">{t('fieldRiskType')}</label>
          <div className="type-picker" role="group" aria-label={t('fieldRiskType')}>
            {REPORT_TYPES.map((rt, i) => {
              const meta = TYPE_META[rt]
              return (
                <button
                  key={rt}
                  ref={i === 0 ? firstRef : undefined}
                  className={type === rt ? 'on' : ''}
                  aria-pressed={type === rt}
                  onClick={() => setType(rt)}
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label[lang]}
                </button>
              )
            })}
          </div>

          {/* 운송수단 — events.transport_mode와 대응.
              risk_candidates.transport_mode는 2026-08-20 확장에서 추가돼 지금은 그대로 저장된다 */}
          <label className="fld-label">{t('fieldTransport')}</label>
          <div className="mode-picker five" role="group" aria-label={t('fieldTransport')}>
            <button
              className={transport === 'all' ? 'on' : ''}
              aria-pressed={transport === 'all'}
              onClick={() => setTransport('all')}
            >
              <span className="mode-ico" aria-hidden="true">
                ◍
              </span>
              {t('modeAll')}
            </button>
            {TRANSPORT_MODES.map((m) => (
              <button
                key={m}
                className={transport === m ? 'on' : ''}
                aria-pressed={transport === m}
                onClick={() => setTransport(m)}
              >
                <span className="mode-ico" aria-hidden="true">
                  {TRANSPORT_ICON[m]}
                </span>
                {t(m === 'road' ? 'modeRoad' : m === 'rail' ? 'modeRail' : m === 'air' ? 'modeAir' : 'modeSea')}
              </button>
            ))}
          </div>

          <div className="fld-2col">
            <div>
              <label className="fld-label" htmlFor="rp-country">
                {t('fieldCountry')}
              </label>
              <select
                id="rp-country"
                className="fld"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">{t('selectPlaceholder')}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="fld-label" htmlFor="rp-city">
                {t('fieldCity')}
              </label>
              <select
                id="rp-city"
                className="fld"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!country}
              >
                <option value="">{country ? t('selectPlaceholder') : '—'}</option>
              </select>
            </div>
          </div>

          <div className="fld-2col">
            <div>
              <label className="fld-label" htmlFor="rp-date">
                {t('fieldDate')}
              </label>
              <input
                id="rp-date"
                className="fld"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
            <div>
              <label className="fld-label">{t('fieldTimeRange')}</label>
              <div className="time-range">
                <select
                  className="fld"
                  aria-label={`${t('fieldTimeRange')} from`}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  <option value="">--:--</option>
                  {TIMES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <span>–</span>
                <select
                  className="fld"
                  aria-label={`${t('fieldTimeRange')} to`}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <option value="">--:--</option>
                  {TIMES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <label className="fld-label" htmlFor="rp-detail">
            {t('fieldDetail')}
          </label>
          <textarea
            id="rp-detail"
            className="fld"
            rows={3}
            placeholder={t('detailPlaceholder')}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>

        <footer className="sheet-foot">
          {/* 로그인 안 된 상태에서 폼을 채우게 두면 마지막에 막혀 입력을 잃는다.
              막는 이유와 해결 경로를 같은 자리에 둔다 */}
          {!reporter && (
            <div className="blocked-note" role="note">
              <strong>🔒 {t('loginRequired')}</strong>
              <button className="btn tiny" onClick={onSignIn}>
                {t('signIn')}
              </button>
            </div>
          )}
          {err && (
            <div className="blocked-note" role="alert">
              <strong>⛔ {err}</strong>
            </div>
          )}
          <div className="sheet-actions">
            <button className="btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              className="btn primary"
              onClick={send}
              disabled={!reporter || !complete || busy}
              title={!reporter ? t('loginRequired') : !complete ? t('needCountryDateType') : undefined}
            >
              {busy ? t('submitting') : t('submit')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
