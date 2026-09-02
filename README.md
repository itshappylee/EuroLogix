# EuroLogix Calendar — 웹 앱

와이어프레임 v2의 **2c(리스크 캘린더)** 구현. (2a 역할 선택은 폐기 → `../wiki/decisions/DEC-010-drop-role-gate.md`)
사양 원본은 `../wiki/spec/screen-spec.md`, 데이터 구조는 `../wiki/spec/data-model.md`.

스택: React 19 + TypeScript + Vite (→ `../wiki/decisions/DEC-007-web-stack-react-vite.md`) + `@supabase/supabase-js`

---

## 실행

Node는 `~/.local/node`에 설치돼 있고 `~/.zshrc`에 PATH가 등록돼 있다.
새 터미널에서는 바로 되고, 안 되면 `export PATH="$HOME/.local/node/bin:$PATH"`.

```bash
cd "Projects/EuroLogix Calendar/app"
npm install     # 최초 1회
npm run dev     # http://localhost:5173
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run lint` | oxlint |
| `npm run check:calendar` | **캘린더 레이아웃 회귀 점검** — 달 밖 주·severity 우선 표시 단정 포함 (브라우저 없이) |

---

## Supabase 연결

**연결 안 해도 실행된다.** 키가 없으면 `src/lib/sampleData.ts`의 샘플 14건으로 렌더되고
화면 상단에 "샘플 데이터로 표시 중" 배너가 뜬다.

실데이터를 붙이려면:

```bash
cp .env.example .env.local
# .env.local 을 직접 열어서 값 입력 (대화창에 붙여넣지 말 것)
```

Supabase 대시보드 → Project Settings → API 에서:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon` / `publishable` → `VITE_SUPABASE_ANON_KEY`

> ⚠️ **`service_role` 키는 절대 넣지 않는다.** RLS를 통째로 우회하는 키라
> 프론트엔드 번들에 들어가면 브라우저 개발자도구에 그대로 노출된다.
> → `../wiki/questions/Q-016-key-storage-actual.md`

### 로그 확인하기

`app/src`는 `lib/log.ts`를 통해 콘솔 + Supabase `client_logs` 테이블에 이중으로 남긴다 (→ `../wiki/decisions/DEC-008-client-logging-layer.md`).

- **콘솔**: 브라우저 개발자도구 그대로 확인
- **`client_logs`**: Supabase 대시보드 → Table Editor. anon은 insert만 가능(select 불가)이라 앱에서 직접 조회 화면은 없다

**최초 1회, `client_logs` 테이블을 아직 안 만들었다면** Supabase 대시보드 SQL Editor에서 `DEC-008-client-logging-layer.md`의 SQL을 그대로 실행한다. 안 만든 상태로 앱을 써도 동작은 하지만(콘솔 로그는 정상), 저장 시도가 매번 실패해 `[log.persist] client_logs insert 실패`가 콘솔에 추가로 찍힌다.

### RLS 정책이 필요할 수 있다

`events`는 RLS가 켜져 있고, 지금까지는 n8n이 `service_role`로 우회해 왔다.
anon 키로 붙는 이 앱은 **SELECT 정책이 없으면 에러 없이 0건**을 받는다.

그 상황을 조용히 "이벤트 없음"으로 보여주면 위험하므로,
0건일 때는 별도 배너로 **"RLS 정책이 필요할 수 있다"**고 표시하도록 만들어 뒀다.

> 🔴 **주의 — 이 앱은 사내용이다** (→ 사용자 확인 2026-08-12, `../wiki/questions/Q-022-access-control-gap.md`).
>
> 흔히 쓰는 아래 정책은 **쓰면 안 된다.** anon 키는 브라우저 번들에 그대로 들어가므로,
> 이 정책을 걸면 **URL을 아는 사람은 누구나 사내 물류 리스크 데이터를 전부 읽을 수 있다.**
>
> ```sql
> -- ❌ 사내용에는 부적절
> create policy "public read events" on public.events
>   for select to anon using (true);
> ```
>
> 올바른 방향은 **Supabase Auth + `authenticated` 역할 한정 정책**이거나 **사내망 한정 배포**다.
> 어느 쪽으로 갈지는 아직 정해지지 않았다 → `Q-022`.
>
> 로컬 개발(`npm run dev`) 중에는 노출이 없다. **배포하는 순간 실효화된다.**

---

## 구조

```
src/
├─ App.tsx                  2c 직행 (2a 폐기)
├─ styles.css               전체 스타일 (라이트/다크 대응)
├─ lib/
│  ├─ types.ts              events 테이블과 1:1 대응하는 타입
│  ├─ calendar.ts           ★ 월 격자 + "기간 막대·중첩 시 줄 쌓기" 레이아웃 계산
│  ├─ eventMeta.ts          유형별 색·아이콘, severity 3색 매핑
│  ├─ i18n.ts               KR/EN 사전
│  ├─ supabaseClient.ts     Supabase 클라이언트 생성만 (supabase.ts/log.ts 공용, 순환참조 방지용 분리)
│  ├─ supabase.ts           조회 (미설정 시 샘플로 폴백)
│  ├─ log.ts                로그 계층 — 콘솔 + client_logs (→ DEC-008)
│  └─ sampleData.ts         business-rules "계산 예시" 기반 샘플 14건
└─ components/
   ├─ Header.tsx            로고 자리·KR/EN 토글
   ├─ CalendarScreen.tsx    2c 전체
   ├─ MonthGrid.tsx         ★ 캘린더 격자와 막대 렌더
   ├─ Legend.tsx            2c 범례
   └─ DayDetail.tsx         2c 우측 상세 패널
```

---

## 사양과 다르게 만든 것 / 아직 안 한 것

원문(와이어프레임)에 없어서 **판단으로 넣었거나 비워둔** 것들이다.
위키 `Q-020`에 같은 내용을 질문으로 등록해 뒀다.

| 항목 | 상태 | 이유 |
|---|---|---|
| **국가 필터** | ✅ 근거 있음 | 임원보고서 4-1이 "국가별, 리스크 유형별 필터"를 명시한다 (2026-08-12 정정). **유형별 필터는 아직 미구현** |
| **한 주 최대 3줄 + "+N"** | ➕ 추가함 | 중첩이 많을 때 셀이 무한정 길어지는 걸 막으려고. 와이어프레임엔 규칙 없음 |
| **PIN·역할 선택** | ❌ 폐기 | DEC-010. 검증하지 않는 PIN은 잘못된 안심이었다. 접근제어는 Q-022로 분리 |
| **연별 보기** | ⬜ 미구현 | 와이어프레임 "다음 단계"에 있는 항목 |
| **위험 보고 패널 (2d)** | ⬜ 미구현 | 다음 단계. 버튼은 있고 누르면 안내만 뜬다 |
| **Operator 경로 분석 탭 (2b)** | ⬜ 미구현 | Q-012 — 백엔드 자체가 없다 |
| **`status=cancelled` 별도 표시** | ⚠️ 사양 위반 | WF-3은 "본문에서 빼되 별도 표시"인데 앱은 통째로 버린다 → Q-024 |
| **시간대 변환·`verified` 라벨** | ⚠️ 사양 위반 | → Q-024 |
| **Incident 유형 색** | ➕ 추가함 | DB CHECK엔 있는데 와이어프레임 범례엔 없다. 임의로 보라색 배정 |
| `severity = 0` | 표시 안 함 | business-rules Driving Ban Step 0 "야간 금지 → 캘린더 미표시" |
| `status = cancelled` | 조회 제외 | ⚠️ **사양과 어긋남** — WF-3은 "별도 표시"를 요구한다 → Q-024 |
