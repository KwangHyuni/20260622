# 로또 추첨기 · Supabase 연동 명세서

| 항목 | 내용 |
|---|---|
| **문서 버전** | 1.1 |
| **작성일** | 2026-06-23 |
| **대상** | 로또 6/45 웹 추첨기 + Supabase 추첨 기록 저장 |
| **배포** | Vercel (Serverless API + 정적 프론트) |
| **작업 이력** | [WORK_HISTORY.md](./WORK_HISTORY.md) |

---

## 1. 개요

한국 로또 6/45 규칙(1~45 중 6개, 중복 없음)에 따라 번호를 추첨하고, **추첨 결과를 Supabase PostgreSQL에 자동 저장·조회**하는 웹 애플리케이션이다. 슬롯머신 UI 애니메이션, 다중 장(1~10장) 추첨, 사주 기반 AI 번호 상담(Gemini), 역대 1등 당첨 조회 기능을 포함한다.

## 2. 시스템 구성

```
[브라우저] ──GET/POST──▶ [/api/lotto-draws] ──REST──▶ [Supabase PostgREST]
     │                           │
     ├── app.js (추첨·저장·기록 UI)
     ├── chatbot.js ──POST──▶ [/api/saju-chat] ──▶ [Gemini API]
     └── 외부 API ──GET──▶ [동행복권 역대 당첨 JSON]
```

| 계층 | 기술 | 역할 |
|---|---|---|
| 프론트 | HTML, CSS, Vanilla JS | UI, 추첨 로직, API 호출 |
| API | Vercel Serverless (`api/*.js`) | Supabase·Gemini 프록시, 키 보호 |
| DB | Supabase (PostgreSQL) | 추첨 번호 영구 저장 |
| 외부 | Gemini 2.5 Flash, dhlottery JSON | 사주 상담, 당첨 이력 |

## 3. 기능 명세

| 기능 | 탭 | 설명 |
|---|---|---|
| 번호 추첨 | 번호 추첨 | 1~10장 추첨, 슬롯머신 애니메이션, 완료 후 Supabase 자동 저장 |
| 저장 기록 | 번호 추첨 (하단) | 최근 50건 조회, `batch_id` 기준 다중 장 묶음 표시 |
| 사주 번호 | 사주 번호 | 성별·생년월일 입력 → Gemini AI 추천 번호·근거 |
| 역대 1등 | 역대 1등 조회 | 회차별 당첨번호·당첨금·판매액 조회 |

**추첨 규칙:** 1~45 정수 6개, 중복 불가, 오름차순 정렬.  
**저장 단위:** 1회 추첨 = 1 `batch_id`, 장마다 1 DB 행 (`ticket_index` 1~N).

## 4. API 명세 — `/api/lotto-draws`

| 메서드 | 요청 | 응답 | 비고 |
|---|---|---|---|
| `GET` | `?limit=50` (선택, 1~100) | `{ draws: [...] }` | `created_at` 내림차순 |
| `POST` | `{ tickets: [[n1..n6], ...] }` | `{ batchId, saved }` | 1~10장, 각 6개 번호 |
| `OPTIONS` | — | 204 | CORS preflight |

**draws 항목 필드:** `id`, `numbers`(jsonb 배열), `ticket_index`, `batch_id`, `created_at`

**검증:** 각 ticket은 1~45 정수 6개, 중복 없음. 실패 시 400.

## 5. DB 스키마 — `public.lotto_draws`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint (PK) | 자동 증가 |
| `numbers` | jsonb | 6개 번호 배열 (CHECK: 길이=6) |
| `ticket_index` | smallint | 동일 추첨 내 장 번호 |
| `batch_id` | uuid | 동일 추첨 묶음 ID |
| `created_at` | timestamptz | 저장 시각 (기본 now()) |

RLS 활성화. `select`·`insert` 정책: public 허용. 스키마 정의: `supabase/schema.sql`

## 6. 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `SUPABASE_URL` | ○ | `https://{project-ref}.supabase.co` (**/rest/v1 제외**) |
| `SUPABASE_SERVICE_ROLE_KEY` | ○ | 서버 전용 (권장). anon 키 대체 가능 |
| `GEMINI_API_KEY` | △ | 사주 번호 탭 사용 시 필요 |

## 7. 주요 파일

| 경로 | 설명 |
|---|---|
| `index.html` | 페이지 구조, 탭·추첨·저장 기록 UI |
| `app.js` | 추첨·애니메이션·Supabase 저장/조회·당첨 이력 |
| `chatbot.js` | 사주 AI 상담 |
| `style.css` | HP 스타일 UI, 슬롯머신·저장 기록 스타일 |
| `api/lotto-draws.js` | Supabase REST 연동, URL 정규화·에러 처리 |
| `api/saju-chat.js` | Gemini API 연동 |
| `supabase/schema.sql` | 테이블·인덱스·RLS 생성 SQL |
| `WORK_HISTORY.md` | 작업 이력 (기능·버그·문서 변경 기록) |
| `.cursor/rules/work-history.mdc` | 작업 완료 시 이력 자동 갱신 규칙 |

## 8. 설정·실행

1. Supabase SQL Editor에서 `supabase/schema.sql` 실행  
2. Vercel Environment Variables에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등록  
3. `npx vercel dev`로 로컬 실행 (API 포함) 또는 Vercel 배포  
4. **번호 추첨** 탭 → **추첨하기** → 저장 기록 자동 갱신 확인

## 9. 오류 처리

| 오류 | 원인 | 조치 |
|---|---|---|
| `Invalid path specified in request URL` | `SUPABASE_URL`에 `/rest/v1` 포함 또는 잘못된 URL | Project URL만 사용 (코드에서 origin 자동 정규화) |
| `lotto_draws 테이블을 찾을 수 없습니다` | 스키마 미적용 | `schema.sql` 실행 |
| Supabase 미설정 | 환경 변수 누락 | Vercel Settings → Environment Variables |
| API 호출 실패 (로컬) | 정적 파일만 열음 | `vercel dev`로 API 서버 함께 실행 |

## 10. 작업 이력

기능 추가·버그 수정·설정 변경 등은 [WORK_HISTORY.md](./WORK_HISTORY.md)에 날짜별로 기록한다.  
관련 작업이 완료될 때마다 최신 항목을 문서 **맨 위**에 추가하며, API·DB·환경 변수 변경 시 본 명세서(`SPEC.md`)도 함께 갱신한다.

---

**면책:** 번호 추첨·사주 추천은 오락·참고용이며 당첨을 보장하지 않는다. 역대 당첨 데이터는 참고용이며 정확한 정보는 [동행복권](https://www.dhlottery.co.kr)에서 확인한다.
