# 작업 이력

로또 추첨기 프로젝트의 변경·작업 기록입니다. 관련 기능을 수정·추가할 때마다 **최신 항목을 맨 위**에 추가합니다.

| 문서 | 설명 |
|---|---|
| [SPEC.md](./SPEC.md) | 기능·API·DB 명세 |
| 본 문서 | 작업 이력 (CHANGELOG) |

---

## 2026-06-23 — Git 자동 push 커밋 메시지 한글 깨짐 수정

| 항목 | 내용 |
|---|---|
| **작업 유형** | 버그 수정 |
| **변경 파일** | `.cursor/hooks/auto-push.ps1` |

**작업 내용**
- Cursor `stop` 훅의 `auto-push.ps1`에서 `git commit -m` 사용 시 Windows CP949 인코딩으로 한글이 `?먮룞 ?낅줈??` 형태로 저장되던 문제 수정
- 원인: Windows PowerShell 5.1이 BOM 없는 UTF-8 `.ps1` 파일의 한글 리터럴을 CP949로 읽음
- 조치: 커밋 메시지 `"자동 업로드"`를 UTF-8 바이트 배열로 조립 후 `git commit -F`(UTF-8 무 BOM 파일)로 전달

---

## 2026-06-23 — 작업 이력 문서 및 자동 갱신 규칙 추가

| 항목 | 내용 |
|---|---|
| **작업 유형** | 문서 · 규칙 |
| **담당** | AI Agent |
| **변경 파일** | `WORK_HISTORY.md` (신규), `.cursor/rules/work-history.mdc` (신규), `SPEC.md` |

**작업 내용**
- 프로젝트 작업 이력을 `WORK_HISTORY.md`로 분리·정리
- 관련 작업 완료 시 이력을 갱신하도록 Cursor 규칙(`.cursor/rules/work-history.mdc`) 추가
- `SPEC.md`에 작업 이력 문서 링크 추가

---

## 2026-06-23 — 프로젝트 명세서(SPEC.md) 작성

| 항목 | 내용 |
|---|---|
| **작업 유형** | 문서 |
| **담당** | AI Agent |
| **변경 파일** | `SPEC.md` (신규) |

**작업 내용**
- 시스템 구성, 기능·API·DB 스키마, 환경 변수, 설정·오류 처리를 1장 분량 명세서로 정리

---

## 2026-06-23 — Supabase URL 경로 오류(PGRST125) 수정

| 항목 | 내용 |
|---|---|
| **작업 유형** | 버그 수정 |
| **담당** | AI Agent |
| **변경 파일** | `api/lotto-draws.js`, `.env.example` |

**작업 내용**
- `SUPABASE_URL`에 `/rest/v1`이 포함될 때 발생하던 `Invalid path specified in request URL` 오류 해결
- URL을 `origin`만 사용하도록 정규화 (`normalizeSupabaseUrl`)
- `Accept-Profile` / `Content-Profile: public` 헤더 추가
- PGRST125·PGRST205 등 Supabase 오류별 한국어 안내 메시지 추가
- `.env.example`에 Project URL 형식 주의사항 명시

---

## 2026-06-23 — Supabase 추첨 번호 저장 기능 구현

| 항목 | 내용 |
|---|---|
| **작업 유형** | 기능 추가 |
| **담당** | AI Agent |
| **변경 파일** | `api/lotto-draws.js`, `supabase/schema.sql`, `app.js`, `index.html`, `style.css`, `.env.example` |

**작업 내용**
- 추첨 완료 시 번호를 Supabase `lotto_draws` 테이블에 자동 저장
- `GET/POST /api/lotto-draws` Vercel Serverless API 구현
- DB 스키마: `numbers`(jsonb), `ticket_index`, `batch_id`, `created_at`, RLS 정책
- UI: 저장된 추첨 기록 섹션, 저장 성공/실패 상태 표시, `batch_id` 기준 다중 장 묶음 조회
- 환경 변수: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (또는 `SUPABASE_ANON_KEY`)

---

## (기존) — 로또 추첨기 웹 앱 기본 기능

| 항목 | 내용 |
|---|---|
| **작업 유형** | 초기 구현 |
| **변경 파일** | `index.html`, `app.js`, `style.css`, `chatbot.js`, `api/saju-chat.js`, `vercel.json`, `DESIGN.md` |

**작업 내용**
- 로또 6/45 번호 추첨 (1~10장, 슬롯머신 UI 애니메이션)
- 사주 기반 AI 번호 상담 (Gemini API, `/api/saju-chat`)
- 역대 1등 당첨 조회 (외부 JSON API)
- HP 디자인 시스템 기반 UI (`DESIGN.md`)

---

## 이력 작성 형식 (템플릿)

새 작업 추가 시 아래 형식을 복사해 **문서 최상단**(구분선 `---` 아래)에 붙입니다.

```markdown
## YYYY-MM-DD — 작업 제목

| 항목 | 내용 |
|---|---|
| **작업 유형** | 기능 추가 / 버그 수정 / 문서 / 리팩터링 / 설정 |
| **담당** | (선택) |
| **변경 파일** | `path/to/file` |

**작업 내용**
- 변경 사항 bullet 목록
```
