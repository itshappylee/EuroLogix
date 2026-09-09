# 클라우드 에이전트 3종 — 스케줄 작업 명세

이 파이프라인은 **두 층**으로 돌아간다.

| 층 | 어디서 도나 | 무엇을 하나 | 멈추면 |
|---|---|---|---|
| **n8n 워크플로 7개** | 사용자 Mac (localhost:5678) | 수집 → 판정 → 저장 | Mac이 꺼지면 **같이 멈춘다** |
| **Claude 스케줄 작업 3개** ← 이 문서 | Anthropic 클라우드 | 감시 · 알림 · 리포트 | Mac과 무관하게 계속 돈다 |

> 🔑 **왜 이 3개가 클라우드에 있어야 하는가**
> n8n 안에도 감시자(WF-0b)가 있지만, **Mac이 꺼지면 감시자도 같이 죽는다.** 아무도 경고를 만들지 못하는
> 상태가 되고, 그건 "이상 없음"과 구분되지 않는다. 그래서 감시·알림은 Mac 밖에서 돌아야 한다.
> 2026-09-06에 실제로 이 구조가 작동했다 — Mac이 3일간 잠들어 daily 워크플로 5개가 멈췄는데,
> 클라우드에서 돌던 운영 알림 메일이 그것을 잡아냈다.

---

## 한눈에 보기

| # | 이름 | 주기 (UTC cron) | 현지 시각 | 산출물 | 수신 |
|---|---|---|---|---|---|
| A | **운영 알림 메일** | `30 6 * * *` | 매일 08:30 CEST | 이상 있을 때만 메일 | `recipients` 테이블 |
| B | **주간 리포트** | `0 6 * * 1` | 매주 월 08:00 CEST | HTML 주간 리포트 메일 | `recipients` 테이블 |
| C | **파이프라인 아침 점검** | `0 7 * * *` | 매일 09:00 CEST | 진단 + 자동 수정 + 보고 | 앱 푸시 알림 |

> ⚠️ **cron은 UTC로 저장된다.** 위 현지 시각은 서머타임(CEST, UTC+2) 기준이다.
> 겨울(CET, UTC+1)에는 각각 07:30 · 07:00 · 08:00으로 한 시간씩 당겨진다. 의도된 동작이다.

**셋의 관계**: A는 *알린다*, C는 *고친다*, B는 *결과물을 낸다*.
A와 C가 겹쳐 보이지만 성격이 다르다 — A는 수신자 전체에게 메일로 나가는 **통보**이고,
C는 사용자 본인에게만 가는 **정비 작업**(설정 오류 수정, 해소된 경고 정리)이다.

---

## A. 운영 알림 메일 — 매일 08:30

**목적**: 파이프라인이 조용히 죽었는지 알린다. **이상이 없는 날은 발송하지 않는다.**

**핵심 설계 — 오탐을 내지 않는 2단 판정**

하트비트(실행 기록)가 오래됐다고 곧바로 "멈춤"이라 하지 않는다. 데이터가 실제로 갱신됐는지 함께 본다.

| 하트비트 | 데이터 | 판정 | 성격 |
|---|---|---|---|
| 오래됨 | 26시간 내 갱신 | **하트비트 누락** | 감시 배관 문제. 워크플로는 정상 동작했다 |
| 오래됨 | 오래됨 | **진짜 침묵** | 실제 고장 |
| 최신 | — | 정상 | 보고하지 않음 |

이 구분이 없으면 "멈췄습니다" 메일이 오탐으로 쌓이고, 결국 아무도 안 읽게 된다.

**진단 규칙**: daily 워크플로가 **동시에** 침묵이면 개별 고장이 아니라 Mac 꺼짐/잠자기로 본다.
조치도 전원 어댑터·뚜껑 열어두기·Docker 실행 여부부터 제시한다.

**문구는 지어내지 않는다** — 원인·영향·조치는 전부 `config.alert_playbook`에서 가져온다.
그래서 대응 지침이 바뀌면 **코드가 아니라 config 한 행만** 고치면 된다.

**하지 않는 것**: `ops_log.ack`를 건드리지 않는다. 확인 처리는 사람이 한다.

---

## B. 주간 리포트 — 매주 월요일 08:00

**목적**: 이 파이프라인의 **최종 산출물**. 수신자가 월요일 아침에 읽는 유일한 결과물이다.

**구성 (순서 고정)**
1. 이번 주 총평 — `config.report_commentary_guide` 지침대로 작성
2. 이번 주 이벤트 — 국가별 묶음, 국가 안에서 severity 내림차순
3. 다음 주 미리보기
4. 이번 주 취소된 이벤트 (없으면 섹션 생략)
5. 데이터 신뢰도

**총평 원칙**: 표가 이미 보여주는 숫자를 반복하지 않는다. '무엇을 해야 하는가'를 쓴다.
데이터에 없는 사실(지연 일수·비용·대안 경로)은 지어내지 않는다.
공휴일만 있는 조용한 주는 통관·상하차 일정 조정 조언으로 쓰고, 억지로 위험을 만들지 않는다.

**수집이 멈춰 있으면** 총평 끝에 한 줄로 밝힌다 — 리포트가 빈 이유가 고장일 수 있기 때문이다.

---

## C. 파이프라인 아침 점검 — 매일 09:00

**목적**: 사람이 매일 로그를 뒤지지 않아도 되게, 진단하고 **고칠 수 있는 것은 고친다.**
2026-09-06에 사용자 요청으로 신설했다.

**점검 항목**: 하트비트 · 미확인 경고 · 데이터 신선도 · 격리 · 커버리지 · 승인 대기 후보

**자동으로 고쳐도 되는 것**
- 이미 해소된 경고의 `ops_log.ack` 처리 (해소를 **데이터로 확인한 것만**)
- `config`의 설정 오류 — 워크플로 이름 불일치, 주기·기준 불일치, 사실과 다른 안내 문구

**절대 하지 않는 것**
- 없는 날짜·점수를 지어내 채우지 않는다 (빈 `date_start`는 사람에게 넘긴다)
- `events`·`raw_intake`·`risk_candidates`의 실제 데이터를 지우거나 고치지 않는다
- business-rules 판정 규칙을 바꾸지 않는다

**감시 로직 자체를 의심하도록 지시해 뒀다** — 경고 문구가 데이터와 어긋나면(예: "커버리지 0개"인데
실제로는 채워져 있음) 워크플로가 아니라 감시자의 버그를 먼저 본다.
실제로 2026-09-06에 그런 오경보 원인이 세 건 나왔다: 워크플로 이름 불일치 · WF-0b의 raw_intake 조회
필터가 Bank Holiday로 고정 · WF-1d 주기 설정 불일치.

---

## 주기가 다르다는 점이 중요하다

세 작업 모두 이 표를 기준으로 침묵을 판정한다. **기준을 틀리면 오경보가 된다.**

| 워크플로 | 정상 주기 | 시각 | 하트비트 허용 |
|---|---|---|---|
| WF-1b 기상경보 · WF-1c 파업·사고·공사 | 매일 | 07:00 | 26시간 |
| WF-2c 승인·승격 | 매일 | 07:20 | 26시간 |
| WF-2 검증·판정·저장 | 매일 | 07:30 | 26시간 |
| WF-0b 조용한 실패 감지 | 매일 | 08:10 | 26시간 |
| **WF-1d 운행금지 산출** | **주 1회 (월)** | 06:40 | **176시간** |
| WF-1a 공휴일 수집 | 연 1회 | — | 판정 제외 |

> **WF-1d가 주 1회인 것은 정상이다** (사용자 확인 2026-09-06). 법령 규칙표는 매일 바뀌지 않고
> 매번 120일 창을 다시 계산하므로 매일 돌 이유가 없다. 반대로 **파업·사고·공사는 예측 불가**라
> 매일 수집이 필요하다 — WF-1c가 하루라도 빠지면 그게 진짜 문제다.

---

## 유지보수 — 여기가 실제로 어긋난다

> ⚠️ **파이프라인 규칙을 바꾸면 이 세 프롬프트도 같이 고쳐야 한다.**
> 프롬프트는 코드가 아니라서 타입 검사도 테스트도 걸리지 않는다. 조용히 낡는다.
> 2026-09-06·09-09에 실제로 앱 안내 문구·README·위키가 동작보다 뒤처져 있는 것이 연달아 발견됐고,
> 같은 일이 이 프롬프트들에도 일어난다.

**바꿀 때 같이 확인할 것**
- business-rules의 판정 규칙을 바꿨다 → B의 등급 표기·색상 기준, C의 커버리지 기대값
- 워크플로 주기를 바꿨다 → 위 주기표 (그리고 `config.expected_coverage`)
- `verified`·`status` 같은 필드 의미를 바꿨다 → B의 "데이터 신뢰도" 섹션 문구
- 새 이벤트 유형·수집원을 추가했다 → 세 프롬프트의 [배경] 절

## 복구

작업 본체는 Claude 앱의 스케줄 작업에 있다. 계정이나 스케줄을 잃으면 **부록의 프롬프트 전문으로 다시 만든다.**
필요한 연결: Supabase MCP(조회·수정) · Gmail MCP(A·B의 발송).
`recipients` 테이블의 `active = true` 행이 수신자다 — 프롬프트에 주소를 박아두지 않았다.

---

# 부록 — 프롬프트 전문 (2026-09-09 기준)

계정·스케줄을 잃었을 때 이 내용을 그대로 새 스케줄 작업에 붙여 넣으면 복구된다.
cron은 **UTC**로 입력한다.

## A. 운영 알림 메일 — cron `30 6 * * *`

```text
EuroLogix Calendar(유럽 물류 캘린더) 자동화 파이프라인의 운영 알림 메일을 보내는 작업이다. 무인 실행이므로 사람에게 되묻지 말고 아래를 그대로 수행한다.

이 작업은 클라우드에서 돌고, 감시 대상인 n8n은 사용자 Mac에서 돈다. **Mac이 꺼져 있으면 n8n 안의 감시자(WF-0b)도 같이 멈춰서 경고를 만들 주체가 없다.** 그래서 이 작업은 "쌓인 경고 전달"과 "하트비트 신선도 직접 확인"을 모두 한다.

■ 1단계 — Supabase MCP로 조회 (project_id: vfoxhpxsdwxxmkouztey)

(가) 미확인 알림
select id, to_char(ts at time zone 'Europe/Bratislava','MM-DD HH24:MI') as t,
       level, workflow, node, message, details
from ops_log where ack = false and level in ('error','warn')
order by (level='error') desc, ts desc limit 50;

(나) 하트비트 신선도
select workflow, max(ts) as last_beat,
       round(extract(epoch from (now() - max(ts)))/3600, 1) as hours_ago
from ops_log where level = 'info' group by workflow order by 2 desc;

(다) 기대 격자
select value from config where key = 'expected_coverage';

(라) 대응 지침
select value from config where key = 'alert_playbook';

(마) 수신자
select email from recipients where active = true;

(바) **데이터 신선도 — 하트비트가 없어도 실제로 일을 했는지 보는 증거**
select
  round(extract(epoch from (now() - (select max(collected_at) from raw_intake where event_type='Bank Holiday')))/3600,1) as wf1a_h,
  round(extract(epoch from (now() - (select max(collected_at) from raw_intake where event_type='Weather')))/3600,1)      as wf1b_h,
  round(extract(epoch from (now() - (select max(collected_at) from risk_candidates)))/3600,1)                            as wf1c_h,
  round(extract(epoch from (now() - (select max(upd_dtm) from events)))/3600,1)                                          as wf2_h;

■ 2단계 — 침묵 판정 (여기가 핵심이다. 오탐을 내지 말 것)

(다)의 workflows 중 cadence가 "daily"인 것마다 (나)에서 마지막 하트비트를 찾아 heartbeat_max_age_h(없으면 26)를 넘겼는지 본다. cadence가 "weekly"인 것(WF-1d)은 그 값(176)을 쓰고, "annual"인 것(WF-1a)은 판정에서 제외한다.

**하트비트가 오래됐어도 곧바로 "멈춤"으로 단정하지 않는다.** (바)의 데이터 신선도를 함께 본다:

| 하트비트 | 데이터 | 판정 | 성격 |
|---|---|---|---|
| 오래됨 | **26시간 내 갱신됨** | **하트비트 누락** — 워크플로는 정상 실행됐다 | 감시 배관 문제. 조치는 "n8n에서 해당 워크플로를 비활성화했다가 다시 활성화" |
| 오래됨 | 오래됨 | 진짜 침묵 | 아래 진단 규칙 적용 |
| 최신 | — | 정상 | 보고하지 않음 |

매핑: WF-1a→wf1a_h, WF-1b→wf1b_h, WF-1c→wf1c_h, WF-2→wf2_h. WF-2c·WF-0b·WF-1d는 대응하는 데이터 신호가 없으므로 하트비트만으로 판정한다.

> WF-1b는 Red 등급만 수집해 조용한 날엔 정상적으로 0건이다. 따라서 wf1b_h가 오래된 것은 **고장의 증거가 아니다** — 이 경우 하트비트만으로 판정한다.

**진짜 침묵일 때의 진단 규칙**: daily 워크플로가 전부 또는 대부분 동시에 침묵이면 개별 고장이 아니라 **Mac이 꺼져 있었거나 잠자기에 들어갔을 가능성이 높다.** 한 줄 요약에 그렇게 쓰고 조치로 "전원 어댑터 연결 / 노트북 뚜껑 열어두기 / Docker Desktop 실행 여부"를 먼저 제시한다.

■ 3단계 — 발송 여부

(가)가 0행이고 침묵·하트비트누락 목록도 비어 있으면 **메일을 보내지 않는다.** "이상 없음 — 발송 안 함"이라고만 답하고 끝낸다.

둘 중 하나라도 있으면 Gmail MCP(mcp__Gmail__send_message)로 (마)의 모든 주소에 발송한다.

■ 4단계 — 메일 내용

제목: ⚠️ [EuroLogix] 실패 {error}건 · 경고 {warn}건 · 침묵 {침묵}건 — {YYYY-MM-DD}
      (0인 항목은 뺀다. 하트비트 누락만 있으면 "ℹ️ [EuroLogix] 하트비트 누락 {N}건 — {날짜}"로 하고 ⚠️를 쓰지 않는다)

본문은 한국어. htmlBody와 plain body를 모두 채운다. 맨 위에 상황을 한 문장으로 요약한다.
**하트비트 누락은 "멈췄습니다"라고 쓰지 않는다.** 예: "수집·판정은 정상 동작했고, WF-2의 실행 기록만 남지 않았습니다."

순서: 진짜 침묵 → 미확인 error·warn → 하트비트 누락(맨 아래, 낮은 강조).
각 항목마다 아래 넷을 담되, (라)의 playbook JSON에 있는 문장을 쓰고 지어내지 않는다.
  1. 무엇이 멈췄나 : playbook.workflows[워크플로].domain + 마지막 실행 시각 또는 실패 노드·원문 메시지
  2. 무슨 영향인가 : playbook.workflows[워크플로].impact — **하트비트 누락이면 이 항목을 "실제 영향 없음(기록만 누락)"으로 대체한다**
  3. 왜 그런가     : playbook.workflows[워크플로].causes. 단 원문에 단서(컬럼명·HTTP 상태코드·UNIQUE 위반)가 있으면 그것을 맨 위로 올리고 이유를 한 줄 덧붙인다. 2단계에서 "Mac 꺼짐"으로 진단했으면 그것을 1번으로
  4. 어떻게 고치나 : playbook.workflows[워크플로].actions 번호 목록. 침묵이면 playbook.generic.warn_first_check를 1번으로
     — **하트비트 누락이면 이 목록 대신 딱 한 줄만 쓴다**: "n8n에서 해당 워크플로를 비활성화했다가 다시 활성화하세요. 활성 상태에서 노드를 바꾸면 n8n 메모리에 옛 정의가 남습니다."

본문 맨 아래에 playbook.generic.where_to_look 과 rerun, 그리고:
"확인·조치한 항목은 ops_log의 ack를 true로 바꾸면 다음 메일에서 빠집니다. 이상이 없는 날은 발송되지 않습니다."

htmlBody 스타일: error는 좌측 보더 #dc2626 + 배경 #fef2f2, 침묵·warn은 #f59e0b + #fffbeb, 하트비트 누락은 회색 #94a3b8 + #f8fafc. 목록은 일반 ul/ol.

■ 5단계 — ops_log의 ack는 절대 바꾸지 않는다. 사람이 직접 확인 처리한다.

■ 6단계 — 무엇을 누구에게 보냈는지(또는 왜 안 보냈는지) 한두 문장으로 요약한다.

[배경] ops_log는 n8n 워크플로가 남기는 운영 로그다. level=error는 WF-0(오류 알림)이 실행 실패 시 기록하고, level=warn은 WF-0b(조용한 실패 감지)가 매일 08:10에 기록한다. level=info는 각 워크플로가 트리거 직후 남기는 하트비트다. 수집은 WF-1a(공휴일, 연 1회)·WF-1b(기상경보, 매일 07:00)·WF-1c(파업·사고·도로공사, 매일 07:00)·WF-1d(운행금지 산출, 주 1회 월요일 06:40), 승격은 WF-2c(07:20), 판정·저장은 WF-2(07:30)다.

[문서] 이 작업의 명세는 저장소의 app/docs/scheduled-agents.md 에 있다. 파이프라인 규칙이 바뀌면 그 문서와 이 프롬프트를 함께 고쳐야 한다.
```

## B. 주간 리포트 — cron `0 6 * * 1`

```text
EuroLogix Calendar(유럽 물류 캘린더)의 **주간 HTML 리포트**를 만들어 발송하는 작업이다. 무인 실행이므로 사람에게 되묻지 말고 아래를 그대로 수행한다. 이것이 이 파이프라인의 최종 산출물이다 — 수신자가 매주 월요일 아침에 읽는 유일한 결과물이다.

■ 1단계 — Supabase MCP로 조회 (project_id: vfoxhpxsdwxxmkouztey)

(가) 이번 주·다음 주 이벤트
with wk as (select (date_trunc('week', (now() at time zone 'Europe/Bratislava')::date))::date as mon)
select case
         when e.date_start <= wk.mon+6  and e.date_end >= wk.mon    then 'this_week'
         when e.date_start <= wk.mon+13 and e.date_end >= wk.mon+7  then 'next_week'
       end as bucket,
       e.status, e.verified, e.severity, e.country, e.region, e.event_type, e.event_name,
       e.date_start, e.date_end, e.transport_mode, e.severity_reason, e.source_url
from events e, wk
where e.date_end >= wk.mon and e.date_start <= wk.mon+13
order by bucket, e.severity desc nulls last, e.country;

(나) 주 시작일 — 제목에 쓴다
select (date_trunc('week',(now() at time zone 'Europe/Bratislava')::date))::date as mon,
       (date_trunc('week',(now() at time zone 'Europe/Bratislava')::date))::date + 6 as sun;

(다) 총평 지침
select value from config where key = 'report_commentary_guide';

(라) 수신자
select email from recipients where active = true;

(마) 운영 상태 — 수집이 멈춰 있으면 리포트가 비는 이유가 된다
select workflow, round(extract(epoch from (now()-max(ts)))/3600,1) as hours_ago
from ops_log where level='info' group by workflow;

■ 2단계 — 총평 작성

(다)의 지침을 그대로 따라 "이번 주 총평"을 쓴다. 지침의 원칙과 금지사항을 어기지 말 것. 특히:
- 표가 이미 보여주는 숫자를 반복하지 말고, '무엇을 해야 하는가'를 쓴다
- 데이터에 없는 사실(지연 일수, 비용, 대안 경로)을 지어내지 않는다
- 공휴일만 있는 주는 통관·상하차 일정 조정 조언으로 쓴다. 억지로 위험을 만들지 않는다

(마)에서 매일 도는 수집 워크플로의 마지막 실행이 30시간을 넘었으면, 총평 끝에 한 줄로 밝힌다:
"※ ○○ 수집이 N시간째 멈춰 있어 이번 주 데이터가 불완전할 수 있습니다."
단 WF-1d(운행금지)는 주 1회가 정상이므로 이 판정에서 제외하고, WF-1a(공휴일)는 연 1회라 역시 제외한다.

■ 3단계 — HTML 리포트 작성 후 Gmail MCP(mcp__Gmail__send_message)로 (라)의 모든 주소에 발송

제목: 📅 [EuroLogix] 주간 리포트 {mon MM/DD}–{sun MM/DD}

본문 구성(순서 고정):
  1. 이번 주 총평            ← 2단계에서 쓴 글. 맨 위
  2. 이번 주 ({mon}–{sun})  ← status가 cancelled가 아닌 this_week 항목
  3. 다음 주 미리보기        ← next_week 항목
  4. 이번 주 취소된 이벤트    ← status='cancelled' 인 this_week 항목. 없으면 이 섹션을 생략
  5. 데이터 신뢰도           ← 아래 설명 참고

2·3번은 **국가별로 묶고, 국가 안에서는 severity 내림차순**으로 정렬한다. 각 줄 형식:
  {색상원} {severity} | {event_type} | {transport_mode} | {event_name} | {날짜} — 제목에 source_url 링크
색상: severity 1–2 🟢 / 3 🟠 / 4–5 🔴 (business-rules 기준)
transport_mode가 'unknown'이면 표시하지 않는다(전체 운송수단 관련이라는 뜻이지 정보가 아니다).
severity가 null이면 ⚪ 로 표시한다. 다만 2026-09-05에 다섯 유형 모두 판정 규칙이 생겼으므로 정상적으로는 나오지 않는다 — 나온다면 그 자체가 이상 신호이니 총평에 한 줄로 밝힌다.

5번 데이터 신뢰도 섹션 — **과장하지 말 것. 없는 문제를 만들지도, 있는 공백을 감추지도 않는다.**
- `verified`는 **사람 검수 통과 여부**다(DEC-023). 원본 URL 생존 확인이 아니다.
  기관 소스(정부·관보·공휴일 API·기상 피드)는 자동 인정, 언론 크롤링분은 관리자 승인을 거친 것만 'yes'다.
- `verified='no'` 인 항목은 애초에 캘린더에 노출되지 않으므로 (가) 결과에도 거의 없다.
  **있으면 그것만 개별로 나열한다.** 없으면 이 항목은 적지 않는다.
- `verified='failed'`(출처 신뢰 불가로 반려된 것)가 있으면 개별로 나열한다.
- 이번 주 항목이 0건이면 그 사실과 함께, 그것이 '위험이 없다'는 뜻이 아니라 수집 범위의 한계일 수 있음을 한 줄로 밝힌다 (DEC-006).
- 수집 범위의 알려진 공백을 한 줄로 덧붙인다: 코소보는 공휴일 데이터 출처가 없어 41개국만 수집되고,
  그리스·불가리아·루마니아의 운행금지는 현지 경찰 개별 공고라 자동 수집되지 않는다.

htmlBody와 plain body를 모두 채운다. htmlBody 스타일: 폭 640px 이하, 시스템 폰트, 국가는 소제목(굵게), 항목은 목록. 색상 원은 이모지로. 표 대신 목록을 쓴다(메일 클라이언트 호환). 배경색·테두리는 절제해서 쓴다.

■ 4단계 — 무엇을 누구에게 보냈는지, 이번 주 항목 수는 몇 건이었는지 두세 문장으로 요약한다.

[배경] events 테이블이 이 파이프라인의 최종 산출물이다. WF-1a(공휴일, 연 1회)·WF-1b(기상경보 Red, 매일)·WF-1c(파업·사고·도로공사 후보, 매일)·WF-1d(운행금지 산출, 주 1회 월요일)가 수집하고, WF-2(매일 07:30)가 business-rules에 따라 severity 1~5를 매겨 저장한다. 파업·사고·공사는 사람이 승인한 것만 WF-2c(07:20)를 거쳐 들어온다. severity 5는 재난재해급으로 예약된 등급이라 거의 나오지 않고, 공휴일은 대부분 1점이다.

[문서] 이 작업의 명세는 저장소의 app/docs/scheduled-agents.md 에 있다. 파이프라인 규칙이 바뀌면 그 문서와 이 프롬프트를 함께 고쳐야 한다.
```

## C. 파이프라인 아침 점검 — cron `0 7 * * *`

```text
EuroLogix Risk Sensing Calendar 파이프라인의 아침 건강 점검을 수행한다. 한국어로 보고한다. 사용자는 코딩 비전공자이므로 설명은 쉬운 말로, 결론을 먼저 쓴다.

## 배경
유럽 물류 리스크 캘린더 앱의 데이터 파이프라인이다. n8n 워크플로 7개가 Supabase에 데이터를 쌓는다.
- Supabase project_id: vfoxhpxsdwxxmkouztey (mcp__Supabase__execute_sql 사용)
- n8n은 사용자 Mac의 localhost:5678에서 돌고, **이 세션(클라우드)에서는 접근할 수 없다.** n8n 관련 조치는 사용자에게 안내만 한다.

주요 테이블: events(캘린더에 뜨는 확정 이벤트), raw_intake(수집 원본), risk_candidates(승인 대기 후보), quarantine(검증 실패), ops_log(하트비트·경고), config(설정)

**워크플로와 정상 주기** — 주기가 다르다는 점이 중요하다:
| 워크플로 | 정상 주기 | 시각 |
|---|---|---|
| WF-1c 파업·사고·공사 수집 | 매일 | 07:00 |
| WF-1b 기상경보 수집 | 매일 | 07:00 |
| WF-2c 승인·승격 | 매일 | 07:20 |
| WF-2 검증·판정·저장 | 매일 | 07:30 |
| WF-0b 조용한 실패 감지 | 매일 | 08:10 |
| WF-1d 운행금지 산출 | **주 1회(월요일)** | 06:40 |
| WF-1a 공휴일 수집 | 연 1회 | — |

WF-1d가 주 1회인 것은 정상이다 (사용자 확인 2026-09-06) — 법령 규칙표는 매일 바뀌지 않고 매번 120일 창을 다시 계산한다. **화~일요일에 WF-1d가 안 돌았다고 침묵으로 판정하지 말 것.** 반대로 파업·사고·공사는 예측 불가한 이벤트라 매일 수집이 필요하다 — WF-1c가 하루라도 빠지면 그게 진짜 문제다.

## 점검 절차
1. **하트비트**: `select workflow, max(ts) from ops_log where message='실행 시작' group by workflow` 로 워크플로별 마지막 실행 시각을 본다. `config.expected_coverage`의 `heartbeat_max_age_h`(매일 워크플로 26시간, WF-1d 176시간)를 넘긴 것만 침묵으로 본다. WF-1a는 연1회라 제외.
2. **미확인 경고**: `select ... from ops_log where coalesce(ack,false)=false and level in ('warn','error')` 를 유형별로 묶어 본다.
3. **데이터 신선도**: events / raw_intake / risk_candidates 의 최신 갱신 시각.
4. **격리**: quarantine 행이 최근에 늘었는지.
5. **커버리지**: raw_intake의 Driving Ban 국가 수(기대 11개 이상), Bank Holiday 국가 수(기대 41개 — 코소보는 공휴일 API 미지원이라 영구 제외이며 정상이다).
6. **승인 대기 후보**: `select count(*) from risk_candidates where admin_decision='pending'` 와, 승인됐지만 필수 칸이 비어 보류 중인 건수. 파업·사고·공사는 사람이 승인해야 캘린더에 오르므로 이게 쌓이면 알려준다.

## 원인 판별
- 매일 도는 워크플로 여러 개가 **같은 시간대에 동시에** 멈췄으면 개별 고장이 아니라 **Mac이 꺼졌거나 잠자기**일 가능성이 가장 높다. 이때는 개별 워크플로를 파고들지 말고 그렇게 보고한다.
- 하나만 멈췄으면 그 워크플로의 `config.alert_playbook`에 적힌 원인·조치를 참고해 좁힌다.
- 경고 문구가 데이터와 어긋나면(예: 커버리지 0개라는데 실제로는 채워져 있음) **감시 로직 자체의 버그를 의심한다.** 2026-09-06에 실제로 그런 사례가 세 건 있었다: 워크플로 이름 불일치, WF-0b의 raw_intake 조회 필터가 Bank Holiday로 고정, WF-1d 주기 설정 불일치.

## 자동으로 고쳐도 되는 것
- 이미 해소된 경고의 `ops_log.ack`를 true로 바꾸기 (해소를 데이터로 확인한 것만)
- `config`의 설정 오류 수정 — 워크플로 이름 불일치, 주기·기준 불일치, 낡아서 사실과 다른 안내 문구 등
- 위 수정을 했으면 무엇을 왜 고쳤는지 보고에 남긴다

## 절대 하지 말 것
- 없는 날짜·점수를 지어내서 채우지 않는다 (risk_candidates의 빈 date_start 등은 사람에게 넘긴다)
- events·raw_intake·risk_candidates의 실제 데이터를 지우거나 고치지 않는다
- business-rules 판정 규칙을 바꾸지 않는다
- 모르는 것을 단정하지 않는다. 확인 못 한 것은 "확인 필요"로 적는다

## 보고 형식
맨 위 3줄 요약 → 표로 워크플로별 상태(정상/침묵, 마지막 실행) → 자동으로 고친 것 → **사람이 해야 할 것**(가장 중요, 구체적으로) 순서.
전부 정상이고 고칠 것도 없으면 "이상 없음" 한두 줄로 짧게 끝낸다.

[문서] 이 작업의 명세는 저장소의 app/docs/scheduled-agents.md 에 있다. 파이프라인 규칙이 바뀌면 그 문서와 이 프롬프트를 함께 고쳐야 한다.
```

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-08-25 | A 운영 알림 메일 신설 |
| 2026-08-26 | B 주간 리포트 신설 |
| 2026-09-06 | C 파이프라인 아침 점검 신설. A·B·C 모두 WF-1d 주기(주 1회)를 반영 |
| 2026-09-09 | 이 문서 신설. B의 `verified` 설명을 DEC-023 정의로 바로잡음(원본 URL 생존 확인이라는 옛 설명 제거), A·B의 [배경] 절에 WF-1d·도로공사 반영 |
