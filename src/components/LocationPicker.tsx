import type { Lang } from '../lib/types'
import { makeT } from '../lib/i18n'
import { COUNTRIES, OTHER_CITY, cityOptions } from '../lib/locations'

/** 나라 + 도시(+ 직접 입력) 한 벌. 세 화면이 같은 모양을 쓰도록 값도 한 덩어리로 다닌다 */
export interface LocationValue {
  country: string
  city: string
  /** city가 'Other'일 때만 쓰인다 */
  customCity: string
}

export const emptyLocation = (country = '', city = ''): LocationValue => ({ country, city, customCity: '' })

interface Props {
  lang: Lang
  value: LocationValue
  onChange: (next: LocationValue) => void
  /** 같은 화면에 여러 벌이 놓이므로 id가 겹치지 않게 접두사를 받는다 */
  idPrefix: string
  /** 라벨을 감춘 압축형(경유지 줄 등)에서 쓴다 */
  compact?: boolean
}

/**
 * 위험 보고·경로 분석이 함께 쓰는 국가/도시 선택기.
 *
 * 나라를 바꾸면 도시는 그 나라의 첫 대표 도시로 옮겨간다 — 이전 나라의 도시가 남아
 * "Germany · Lyon" 같은 조합이 저장되는 것을 막는다.
 */
export function LocationPicker({ lang, value, onChange, idPrefix, compact = false }: Props) {
  const t = makeT(lang)
  const cities = cityOptions(value.country)

  function pickCountry(country: string) {
    const next = cityOptions(country)
    onChange({ country, city: next[0] ?? '', customCity: '' })
  }

  function pickCity(city: string) {
    onChange({ ...value, city, customCity: city === OTHER_CITY ? value.customCity : '' })
  }

  return (
    <>
      <div className="fld-2col">
        <div>
          {!compact && (
            <label className="fld-label" htmlFor={`${idPrefix}-country`}>
              {t('fieldCountry')}
            </label>
          )}
          <select
            id={`${idPrefix}-country`}
            className="fld"
            aria-label={compact ? t('fieldCountry') : undefined}
            value={value.country}
            onChange={(e) => pickCountry(e.target.value)}
          >
            <option value="">{t('selectPlaceholder')}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          {!compact && (
            <label className="fld-label" htmlFor={`${idPrefix}-city`}>
              {t('fieldCity')}
            </label>
          )}
          <select
            id={`${idPrefix}-city`}
            className="fld"
            aria-label={compact ? t('fieldCity') : undefined}
            value={value.city}
            onChange={(e) => pickCity(e.target.value)}
            disabled={!value.country}
          >
            <option value="">{value.country ? t('selectPlaceholder') : '—'}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city === OTHER_CITY ? t('otherCity') : city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {value.city === OTHER_CITY && (
        <input
          id={`${idPrefix}-custom-city`}
          className="fld lp-custom"
          aria-label={t('otherCity')}
          placeholder={t('otherCityPlaceholder')}
          value={value.customCity}
          onChange={(e) => onChange({ ...value, customCity: e.target.value })}
        />
      )}
    </>
  )
}
