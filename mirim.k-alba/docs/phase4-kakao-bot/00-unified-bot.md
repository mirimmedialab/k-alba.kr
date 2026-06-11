# K-ALBA 카카오톡 통합 봇 명세서 (00-unified-bot)

> @kalba **단일 채널 · 단일 봇** 통합 시나리오. 기존 5개 봇 시나리오(01~05)를 페르소나 분기 구조로 통합 재구성.
> 생성: Phase 4 가이드(통합 봇 결정) 기준 · 총 **91개 블록**(ENTRY 1 + 페르소나 90)

---

## 1. 통합 봇 작동 원리

이전 설계는 페르소나별 5개 채널/봇이었으나, 운영 단순화를 위해 **@kalba 1개 채널 + 1개 통합 봇**으로 변경되었습니다. 사용자 첫 진입 시 `BLOCK_0_ENTRY`에서 페르소나를 한 번 선택하면, 선택값이 사용자 정보(`persona`)에 저장되어 해당 페르소나 시나리오로 분기합니다. **재진입 시에는 ENTRY를 건너뛰고 곧바로 각 페르소나의 MAIN 메뉴**로 진입합니다.

```
[BLOCK_0_ENTRY] 페르소나 선택 (진입 선택지 4개)
   ├─ 🌏 외국인  → persona=worker  → BLOCK_01_WORKER_WELCOME  (재진입: BLOCK_03_WORKER_MAIN)
   ├─ 💼 사장님  → persona=boss    → BLOCK_63_BOSS_WELCOME    (재진입: BLOCK_64_BOSS_MAIN)
   ├─ 🎓 유학생  → persona=student → BLOCK_49_STUDENT_WELCOME (재진입: BLOCK_50_STUDENT_MAIN)
   └─ 🏫 학교    → persona=staff   → BLOCK_79_STAFF_WELCOME   (재진입: BLOCK_80_STAFF_MAIN)

계약서(BLOCK_31~48)는 별도 진입이 아니라 알바생/사장님 흐름의 하위 단계로 진입:
   BLOCK_13/16/23(외국인)·BLOCK_77(사장님)·BLOCK_52(유학생) → BLOCK_31_CONTRACT_WELCOME
```

## 2. 사용자 정보 필드 (페르소나 기억용)

OpenBuilder → [설정] → [사용자 정보]에 다음 2개 필드를 추가합니다.

| 필드 | 타입 | 값 | 용도 |
|---|---|---|---|
| `persona` | 텍스트 | worker / boss / student / staff | 페르소나 분기·기억 (진입 4종) |
| `lang` | 텍스트 | ko / en / vi / zh / uz / mn / ja | 응답 언어 |

보존 기간: 무제한 (사용자가 채널을 떠나지 않는 한 유지).

> 분기는 빠른답변의 `extra: { set_persona: "worker" }` 형태로 자동 처리됩니다. 매뉴얼 조건문은 각 MAIN 블록에만 둡니다.

## 3. 페르소나별 블록 ID 매핑

| 페르소나 | 블록 범위 | 블록 수 | 진입(WELCOME) | 메인(MAIN) | 참조 원본 |
|---|---|---|---|---|---|
| 외국인 알바생 | #1~30 | 30 | BLOCK_01_WORKER_WELCOME | BLOCK_03_WORKER_MAIN | 01-main-bot.md |
| 계약서(공통) | #31~48 | 18 | BLOCK_31_CONTRACT_WELCOME | (목록=BLOCK_44) | 02-contract-bot.md |
| 유학생 | #49~62 | 14 | BLOCK_49_STUDENT_WELCOME | BLOCK_50_STUDENT_MAIN | 03-student-bot.md |
| 사장님 | #63~78 | 16 | BLOCK_63_BOSS_WELCOME | BLOCK_64_BOSS_MAIN | 04-boss-bot.md |
| 학교 담당자 | #79~90 | 12 | BLOCK_79_STAFF_WELCOME | BLOCK_80_STAFF_MAIN | 05-staff-bot.md |
| **합계** | **#0~90** | **91 (ENTRY 포함)** | | | 00-unified-bot.md |

> 번호는 Phase 4 가이드 본문이 참조하는 ID(`BLOCK_63_BOSS_WELCOME` 등)와 1:1로 일치합니다.

## 4. 페르소나 분기 조건 (MAIN 블록)

각 페르소나의 MAIN 메뉴 블록에 다음 조건을 추가해, 재진입 사용자가 자신의 페르소나 메뉴로 바로 가게 합니다.

```
user.persona == "worker"  → BLOCK_03_WORKER_MAIN
user.persona == "boss"    → BLOCK_64_BOSS_MAIN
user.persona == "student" → BLOCK_50_STUDENT_MAIN
user.persona == "staff"   → BLOCK_80_STAFF_MAIN
user.persona == null      → BLOCK_0_ENTRY (페르소나 선택)
```

> 계약서(contract)는 보통 외국인/사장님 흐름에서 진입하므로 별도 MAIN 없이 BLOCK_31_CONTRACT_WELCOME을 허브로 사용합니다.

## 5. 스킬 서버 연결 규약

모든 스킬은 다음으로 호출됩니다 (Phase 4-C 스킬 서버, 5-2-skill-server 적용 후 활성화).

```
POST https://k-alba.kr/api/kakao/skill/{skill_name}
Authorization: Bearer {KAKAO_SKILL_TOKEN}
Content-Type: application/json
```

| 스킬 endpoint | 연결 블록 |
|---|---|
| `search-jobs` | BLOCK_06_WORKER_SEARCH_REGION_INPUT, BLOCK_07_WORKER_SEARCH_RESULTS |
| `job-detail` | BLOCK_08_WORKER_JOB_DETAIL |
| `apply-job` | BLOCK_09_WORKER_APPLY_INTRO, BLOCK_11_WORKER_APPLY_CONFIRM |
| `my-applications` | BLOCK_12_WORKER_MY_APPLICATIONS, BLOCK_14_WORKER_APPLICATION_STATUS_DETAIL |
| `set-language` | BLOCK_02_WORKER_LANG |
| `get-contracts` | BLOCK_13_WORKER_MY_CONTRACTS, BLOCK_39_CONTRACT_VIEW, BLOCK_44_CONTRACT_MY_CONTRACTS |
| `get-applicants` | BLOCK_73_BOSS_APPLICANTS |
| `accept-applicant` | BLOCK_75_BOSS_ACCEPT_FLOW |
| `reject-applicant` | BLOCK_76_BOSS_REJECT_FLOW |
| `check-business` | BLOCK_65_BOSS_AUTH_CHECK |
| `get-partwork` | BLOCK_51_STUDENT_ELIGIBILITY_CHECK, BLOCK_52_STUDENT_APPLY_INTRO, BLOCK_55_STUDENT_MY_PARTWORK |
| `contact-staff` | BLOCK_59_STUDENT_CONTACT_STAFF |
| `staff-pending` | BLOCK_82_STAFF_REVIEW_LIST, BLOCK_83_STAFF_REVIEW_DETAIL, BLOCK_85_STAFF_REQUEST_DOCS, BLOCK_86_STAFF_REJECT_REASON |

→ 연결 스킬 **13종** (5-2-skill-server의 13개 endpoint와 일치).

## 6. 알림톡 트리거 매핑 (Phase 4-B 연동)

| 템플릿 | 발송 시점 블록 | 수신자 |
|---|---|---|
| KALBA_001 지원 도착 | BLOCK_11_WORKER_APPLY_CONFIRM | 사장님 |
| KALBA_002 합격 | BLOCK_75_BOSS_ACCEPT_FLOW | 알바생 |
| KALBA_003 거절 | BLOCK_76_BOSS_REJECT_FLOW | 알바생 |
| KALBA_004 계약서 서명 요청 | BLOCK_38_CONTRACT_CREATE_SEND | 양측 |
| KALBA_005 계약서 완료 | BLOCK_42_CONTRACT_SIGN_COMPLETE | 양측 |
| KALBA_006 시간제취업 결과 | BLOCK_84_STAFF_SIGN_REDIRECT | 학생 |

## 7. 전체 블록 명세 (91개)

> 입력 편의를 위한 요약입니다. 응답 전문·빠른답변 매핑은 동봉한 입력 시트(xlsx)를 함께 사용하세요.


### [진입] #0

#### 0. `BLOCK_0_ENTRY` — 페르소나 선택 (시작/웰컴 블록)
- **의도/트리거**: (자동 트리거 — 첫 진입) / 안녕, 시작, hi, hello, 처음
- **발화 예시**: 안녕, 안녕하세요, 시작, 메뉴, hi, hello, 처음이에요 / (다국어) xin chào, 你好, salom, сайн уу, こんにちは
- **응답**:
    👋 안녕하세요!  
    K-ALBA에 오신 것을 환영합니다 ✨  
      
    외국인 친화 알바 매칭 플랫폼입니다.  
    먼저 어떤 분이신지 알려주세요.
- **빠른답변**:
  - 🌏 알바 찾는 외국인이에요 → BLOCK_01_WORKER_WELCOME (set persona=worker)
  - 💼 사장님이에요 → BLOCK_63_BOSS_WELCOME (set persona=boss)
  - 🎓 유학생이에요 (D-2/D-4) → BLOCK_49_STUDENT_WELCOME (set persona=student)
  - 🏫 학교 담당자예요 → BLOCK_79_STAFF_WELCOME (set persona=staff)
- **조건/비고**: 진입 선택지 4개(계약서 제외). user.persona == null 일 때만 표시. 재진입 시 각 페르소나 MAIN으로 자동 분기. 계약서(#31~48)는 별도 진입이 아니라 알바생/사장님 흐름의 하위 단계(BLOCK_13/16/23/77→BLOCK_31)로 진입


### [외국인 알바생] #1~30

#### 1. `BLOCK_01_WORKER_WELCOME` — WELCOME (외국인 진입)
- **의도/트리거**: (ENTRY 자동, persona=worker)
- **발화 예시**: (앞 블록 자동)
- **응답**:
    👋 안녕하세요!  
    K-ALBA에 오신 것을 환영합니다 ✨  
      
    외국인을 위한 한국 알바 매칭 플랫폼이에요.  
    먼저 사용하실 언어를 선택해 주세요.
- **빠른답변**:
  - 🇰🇷 한국어 → BLOCK_02 (lang=ko)
  - 🇺🇸 English → BLOCK_02 (lang=en)
  - 🇻🇳 Tiếng Việt → BLOCK_02 (lang=vi)
  - 🇨🇳 中文 → BLOCK_02 (lang=zh)
  - 🇺🇿 O'zbek → BLOCK_02 (lang=uz)
  - 🇲🇳 Монгол → BLOCK_02 (lang=mn)
  - 🇯🇵 日本語 → BLOCK_02 (lang=ja)

#### 2. `BLOCK_02_WORKER_LANG` — LANG_SELECT (언어 저장)
- **의도/트리거**: (앞 블록 자동 호출)
- **발화 예시**: 파라미터: user_id={sys.user.id}, lang={extra.lang}
- **응답**:
    → 스킬 호출 후 BLOCK_03_WORKER_MAIN(메인 메뉴)으로 이동
- **빠른답변**:
  - (자동 진행 → BLOCK_03_WORKER_MAIN)
- **연결 스킬**: `/api/kakao/skill/set-language`
- **조건/비고**: user.lang 미설정 시

#### 3. `BLOCK_03_WORKER_MAIN` — MAIN_MENU (외국인 메인 메뉴)
- **의도/트리거**: 인사, 메뉴, 시작
- **발화 예시**: 안녕, 메뉴, 처음부터, Hi, Hello
- **응답**:
    무엇을 도와드릴까요? 😊  
      
    아래 버튼에서 선택하세요!
- **빠른답변**:
  - 🔍 알바 찾기 → BLOCK_04
  - 📋 내 지원 내역 → BLOCK_12
  - 📄 내 계약서 → BLOCK_13
  - 🎓 시간제취업(학생) → BLOCK_17
  - ❓ 자주 묻는 질문 → BLOCK_20
  - 📞 상담사 연결 → BLOCK_26
- **조건/비고**: user.persona == 'worker' (재진입 시 ENTRY 건너뛰고 이 블록)

#### 4. `BLOCK_04_WORKER_SEARCH_INTRO` — SEARCH_INTRO (비자 선택)
- **의도/트리거**: ACTION_SEARCH_JOB
- **발화 예시**: 알바 찾기, 구직, 일자리, 찾아줘, 어떤 알바 있어, find jobs
- **응답**:
    알바를 찾아드릴게요! 🔍  
      
    먼저 비자 종류를 알려주세요.  
    (비자별로 가능한 알바가 달라요)
- **빠른답변**:
  - D-2(유학) → BLOCK_05
  - D-4(어학) → BLOCK_05
  - E-9(비전문) → BLOCK_05
  - F-2(거주) → BLOCK_05
  - F-4(재외동포) → BLOCK_05
  - F-6(결혼) → BLOCK_05
  - H-2(방문취업) → BLOCK_05
  - 비자 무관 → BLOCK_05

#### 5. `BLOCK_05_WORKER_SEARCH_REGION` — SEARCH_REGION (지역 선택)
- **의도/트리거**: (앞 블록 자동)
- **발화 예시**: 파라미터: visa={sys.context.visa}
- **응답**:
    어느 지역에서 일하실 건가요? 📍
- **빠른답변**:
  - 서울 강남 → BLOCK_07
  - 서울 마포 → BLOCK_07
  - 경기 일산 → BLOCK_07
  - 부산 → BLOCK_07
  - 전국 → BLOCK_07
  - 직접 입력 → BLOCK_06

#### 6. `BLOCK_06_WORKER_SEARCH_REGION_INPUT` — SEARCH_REGION_INPUT (지역 직접 입력)
- **의도/트리거**: (자유 텍스트)
- **발화 예시**: 파라미터: sys_text
- **응답**:
    → 입력 지역으로 검색 실행 후 BLOCK_07과 동일 출력
- **빠른답변**:
  - (자동 진행 → BLOCK_07)
- **연결 스킬**: `/api/kakao/skill/search-jobs`

#### 7. `BLOCK_07_WORKER_SEARCH_RESULTS` — SEARCH_RESULTS (검색 결과 카르셀)
- **의도/트리거**: (앞 블록 자동)
- **발화 예시**: 파라미터: visa, region, user_lang
- **응답**:
    [스킬 동적생성] carousel(basicCard) 최대10: 공고명/시급·근무·비자/썸네일  
    버튼: 상세보기(→BLOCK_08,job_id), 지원하기(→BLOCK_09,job_id)
- **빠른답변**:
  - 🔄 다른 조건 → BLOCK_04
  - 🏠 메인 메뉴 → BLOCK_03
- **연결 스킬**: `/api/kakao/skill/search-jobs`

#### 8. `BLOCK_08_WORKER_JOB_DETAIL` — JOB_DETAIL (알바 상세)
- **의도/트리거**: (결과에서 선택)
- **발화 예시**: 파라미터: job_id, user_lang
- **응답**:
    [스킬 동적생성] basicCard: 💰시급 ⏰근무 📍위치 🛂가능비자 / 업무·한국어수준·시작일
- **빠른답변**:
  - 🚀 지원하기 → BLOCK_09
  - 🌐 웹에서 보기 (webLink: k-alba.kr/jobs/{id})
  - 🔙 다시 검색 → BLOCK_04
- **연결 스킬**: `/api/kakao/skill/job-detail`

#### 9. `BLOCK_09_WORKER_APPLY_INTRO` — APPLY_INTRO (지원 시작·자격검증)
- **의도/트리거**: ACTION_APPLY_JOB
- **발화 예시**: 이 알바 지원하기, 지원할게요 / 파라미터: job_id
- **응답**:
    [통과] ✨ 좋아요! 사장님에게 한 마디 남겨주세요(선택,100자).  
    [미달] 😔 이 알바는 지원 불가. 사유: {failure_reason}
- **빠른답변**:
  - 기본 메시지로 지원 → BLOCK_11
  - 직접 작성 → BLOCK_10
  - (미달 시) 다른 알바 찾기 → BLOCK_04
- **연결 스킬**: `/api/kakao/skill/apply-job`
- **조건/비고**: 자격·중복지원·프로필 완성도 검증

#### 10. `BLOCK_10_WORKER_APPLY_MESSAGE_INPUT` — APPLY_MESSAGE_INPUT (지원 메시지 입력)
- **의도/트리거**: (자유 텍스트)
- **발화 예시**: 파라미터: sys_text
- **응답**:
    → 입력 후 BLOCK_11로 이동
- **빠른답변**:
  - (자동 진행 → BLOCK_11)

#### 11. `BLOCK_11_WORKER_APPLY_CONFIRM` — APPLY_CONFIRM (지원 확정)
- **의도/트리거**: (앞 블록 자동)
- **발화 예시**: 파라미터: job_id, user_id, message
- **응답**:
    ✅ 지원 완료!  
    사장님이 곧 연락드릴 거예요.  
    결과는 카카오톡으로 알림 받을 수 있어요.(보통 1-3일)
- **빠른답변**:
  - 📋 내 지원 내역 → BLOCK_12
  - 🔍 다른 알바 찾기 → BLOCK_04
- **연결 스킬**: `/api/kakao/skill/apply-job`
- **조건/비고**: 알림톡 KALBA_001(사장님에게) 트리거

#### 12. `BLOCK_12_WORKER_MY_APPLICATIONS` — MY_APPLICATIONS (내 지원 내역)
- **의도/트리거**: STATUS_MY_APPLICATION
- **발화 예시**: 내 지원, 지원 결과, 어떻게 됐어요, 확인
- **응답**:
    [있음] listCard: 공고명/상태(✅합격·⏳검토중·❌불합격)+지원일  
    [없음] 아직 지원한 알바가 없어요. 새 알바를 찾아보시겠어요? 🔍
- **빠른답변**:
  - (있음) 전체 보기 (webLink: k-alba.kr/my/applications)
  - (없음) 알바 찾기 → BLOCK_04
- **연결 스킬**: `/api/kakao/skill/my-applications`

#### 13. `BLOCK_13_WORKER_MY_CONTRACTS` — MY_CONTRACTS (내 계약서)
- **의도/트리거**: STATUS_MY_CONTRACT
- **발화 예시**: 내 계약서, 계약 어디까지
- **응답**:
    계약서 작성·서명은 계약서 메뉴에서 진행해 주세요!  
    (통합 봇: BLOCK_31 계약서 흐름으로 연결)
- **빠른답변**:
  - 📄 계약서 보기 → BLOCK_31
  - 🏠 메인 메뉴 → BLOCK_03
- **연결 스킬**: `/api/kakao/skill/get-contracts`
- **조건/비고**: 통합 봇: 외부 채널 대신 BLOCK_31 분기

#### 14. `BLOCK_14_WORKER_APPLICATION_STATUS_DETAIL` — APPLICATION_STATUS_DETAIL (지원 상세 상태)
- **의도/트리거**: (내 지원에서 선택)
- **발화 예시**: 파라미터: application_id
- **응답**:
    [합격] 🎉 합격! 다음: 근로계약서 작성 / 시작일·장소·시간  
    [검토중] ⏳ 사장님 검토 중. 보통 1-3일.
- **빠른답변**:
  - (합격) 📄 계약서 작성 → BLOCK_16
  - (합격) 🌐 사장님과 채팅 (webLink: k-alba.kr/chat)
- **연결 스킬**: `/api/kakao/skill/my-applications`

#### 15. `BLOCK_15_WORKER_PROFILE_UPDATE` — PROFILE_UPDATE (프로필 수정 안내)
- **의도/트리거**: 프로필, 내 정보 수정
- **발화 예시**: 프로필, 내 정보 수정, 사진 바꾸기
- **응답**:
    프로필 수정은 웹사이트에서 더 편리해요!  
    사진·경력·위치를 한 번에. 📝
- **빠른답변**:
  - 🌐 프로필 수정 (webLink: k-alba.kr/profile)
  - 🏠 메인 메뉴 → BLOCK_03

#### 16. `BLOCK_16_WORKER_REDIRECT_TO_CONTRACT` — REDIRECT_TO_CONTRACT (계약서 흐름 연결)
- **의도/트리거**: (합격 상세에서)
- **발화 예시**: (자동)
- **응답**:
    계약서 작성을 도와드릴게요! 📄
- **빠른답변**:
  - 📄 계약서 시작 → BLOCK_31
- **조건/비고**: 통합 봇: 계약서 페르소나 분기

#### 17. `BLOCK_17_WORKER_PARTWORK_INTRO` — PARTWORK_INTRO (시간제취업 안내)
- **의도/트리거**: INFO_PARTWORK
- **발화 예시**: 시간제취업, 유학생 알바 허가, 허가 받기, PartWork
- **응답**:
    🎓 시간제취업(학생 알바 허가)  
    D-2/D-4 유학생만 신청 가능.  
    절차: 1.계약서 2.학생메뉴 신청 3.학교 검토·서명 4.출입국 제출 5.허가증(약2주)
- **빠른답변**:
  - 🚀 신청 시작 → BLOCK_49
  - ❓ 더 자세히 → BLOCK_19
  - 🏠 메인 메뉴 → BLOCK_03

#### 18. `BLOCK_18_WORKER_PARTWORK_REDIRECT` — PARTWORK_REDIRECT (학생 흐름 연결)
- **의도/트리거**: (시간제취업에서)
- **발화 예시**: (자동)
- **응답**:
    학생 메뉴에서 시간제취업을 도와드릴게요! 🎓
- **빠른답변**:
  - 🎓 학생 메뉴 → BLOCK_49
- **조건/비고**: 통합 봇: 학생 페르소나 분기

#### 19. `BLOCK_19_WORKER_PARTWORK_FAQ` — PARTWORK_FAQ (시간제취업 FAQ)
- **의도/트리거**: (안내에서)
- **발화 예시**: (자동)
- **응답**:
    Q.D-4도 가능? A.네, 입국 6개월 경과 후. (D-4 한도는 D-2와 다르니 국제처 확인)  
    Q.주당 몇 시간(D-2)? A.TOPIK 5급↑(또는 사회통합 5단계) 35h / TOPIK 4급·영어트랙 30h / TOPIK 4급 미만·유효기간 만료 15h(평일+주말 포함).  
    Q.주말·방학은? A.유효한 TOPIK 4급↑(영어트랙 IELTS 5.5↑)이면 학기 중 공휴일·주말·방학 무제한.  
    Q.비용? A.무료. ※정확한 시간은 소속 대학 국제처/하이코리아에서 최종 확인.
- **빠른답변**:
  - 🚀 신청하기 → BLOCK_49
- **조건/비고**: 허용시간: 2026.03 출입국/대학 공지 기준(TOPIK 급수별 15/30/35). 시뮬레이터의 20/30 모델은 구버전 오류

#### 20. `BLOCK_20_WORKER_FAQ` — FAQ (메인 FAQ)
- **의도/트리거**: 자주 묻는 질문, FAQ, 도움말
- **발화 예시**: 자주 묻는 질문, FAQ, 도움말
- **응답**:
    listCard '❓ FAQ': 비자별 가능알바→BLOCK_21 / 최저시급→22 / 계약서 의무→23 / 답이 안와요→24 / K-ALBA란→25
- **빠른답변**:
  - (listCard 항목 링크로 각 FAQ 블록 연결)

#### 21. `BLOCK_21_WORKER_FAQ_VISA` — FAQ_VISA (비자별 가능 여부)
- **의도/트리거**: (FAQ 항목)
- **발화 예시**: (자동)
- **응답**:
    🛂 비자별 가능: ✅무제한 F-2/F-4/F-5/F-6 / ⚠️허가필요 D-2/D-4 / ⚠️변경신고 E-9/H-2 / ❌불가 D-1/D-3/B

#### 22. `BLOCK_22_WORKER_FAQ_WAGE` — FAQ_WAGE (최저시급)
- **의도/트리거**: (FAQ 항목)
- **발화 예시**: (자동)
- **응답**:
    💰 2026 최저시급 10,030원 / 주휴포함 12,036원 (주15h+ 시 주휴 발생)

#### 23. `BLOCK_23_WORKER_FAQ_CONTRACT` — FAQ_CONTRACT (계약서 의무)
- **의도/트리거**: (FAQ 항목)
- **발화 예시**: (자동)
- **응답**:
    📄 근로계약서는 의무! 미작성 시 500만원↓벌금. K-ALBA 법무법인 검토 표준계약서 무료.
- **빠른답변**:
  - 📄 계약서 작성 → BLOCK_31

#### 24. `BLOCK_24_WORKER_FAQ_NO_REPLY` — FAQ_NO_REPLY (답이 안 와요)
- **의도/트리거**: (FAQ 항목)
- **발화 예시**: (자동)
- **응답**:
    😔 보통 1-3일 내 답변. 1주 경과 시 1)다른 알바 지원 2)사장님 직접연락 3)운영팀 알림발송
- **빠른답변**:
  - 🔍 다른 알바 → BLOCK_04
  - 📞 운영팀 → BLOCK_26

#### 25. `BLOCK_25_WORKER_FAQ_ABOUT` — FAQ_ABOUT (K-ALBA 소개)
- **의도/트리거**: (FAQ 항목)
- **발화 예시**: (자동)
- **응답**:
    basicCard 'K-ALBA란?': 외국인 알바·취업 매칭. 운영 미림미디어랩(주)/119-86-61402/J1204020260002/법무법인 수성 김익환 변호사
- **빠른답변**:
  - 🌐 웹사이트 (webLink: k-alba.kr)

#### 26. `BLOCK_26_WORKER_HUMAN_HELP` — HUMAN_HELP (상담사 연결)
- **의도/트리거**: HELP_HUMAN
- **발화 예시**: 상담사, 사람, 도와주세요, 운영자
- **응답**:
    📞 상담사 연결: ✉️ contact@k-alba.kr / 💬 @kalba / ⏰ 영업일 1-2일
- **빠른답변**:
  - 📧 이메일 (mailto:contact@k-alba.kr)
  - 🏠 메인 메뉴 → BLOCK_03

#### 27. `BLOCK_27_WORKER_CANCEL_RESET` — CANCEL_RESET (취소/처음부터)
- **의도/트리거**: HELP_RESET
- **발화 예시**: 취소, 처음부터, 다시, 리셋
- **응답**:
    🔄 처음으로 돌아갈게요! → BLOCK_03
- **빠른답변**:
  - (자동 → BLOCK_03)
- **조건/비고**: persona 유지(ENTRY로 안 감)

#### 28. `BLOCK_28_WORKER_FALLBACK` — FALLBACK (인식 실패)
- **의도/트리거**: (시스템 자동)
- **발화 예시**: (폴백 블록 지정)
- **응답**:
    🤔 죄송해요, 이해하지 못했어요. 아래 버튼에서 선택하거나 다시 말씀해 주세요.
- **빠른답변**:
  - 🔍 알바 찾기 → BLOCK_04
  - 📋 내 지원 → BLOCK_12
  - ❓ FAQ → BLOCK_20
  - 📞 상담사 → BLOCK_26

#### 29. `BLOCK_29_WORKER_NOT_LOGGED_IN` — NOT_LOGGED_IN (로그인 필요)
- **의도/트리거**: (스킬 401 시 자동)
- **발화 예시**: (조건 트리거)
- **응답**:
    🔒 K-ALBA 회원가입이 필요해요. 카카오로 1분 가입!
- **빠른답변**:
  - ✨ 회원가입 (webLink: k-alba.kr/signup)
  - 🌐 로그인 (webLink: k-alba.kr/login?redirect=kakao)
- **조건/비고**: 스킬 401 시

#### 30. `BLOCK_30_WORKER_PRIVACY_NOTICE` — PRIVACY_NOTICE (개인정보 동의)
- **의도/트리거**: (첫 액션 시)
- **발화 예시**: (조건 트리거)
- **응답**:
    🔒 개인정보 안내: 지원 시 이름·비자·한국어수준·카카오식별자가 사장님에게 전달. (k-alba.kr/privacy)
- **빠른답변**:
  - ✅ 동의하고 진행 → {직전 블록}
  - 🌐 처리방침 (webLink: k-alba.kr/privacy)
- **조건/비고**: 최초 액션 1회


### [계약서] #31~48

#### 31. `BLOCK_31_CONTRACT_WELCOME` — WELCOME (계약서 진입)
- **의도/트리거**: (ENTRY/타페르소나 연결, persona=contract)
- **발화 예시**: 계약서, 근로계약, 계약
- **응답**:
    📄 K-ALBA 근로계약서  
    법무법인 수성 김익환 변호사 검토 표준계약서.  
    법적효력 100%✅ / 무료✨ / 한+영🌐 / 3분⏱
- **빠른답변**:
  - 📝 계약서 만들기(사장님) → BLOCK_32
  - ✍️ 받은 계약서 보기(알바생) → BLOCK_33
  - 📋 내 계약서 목록 → BLOCK_44
  - ❓ FAQ → BLOCK_45

#### 32. `BLOCK_32_CONTRACT_BOSS_INTRO` — BOSS_INTRO (사장님 안내)
- **의도/트리거**: (진입에서)
- **발화 예시**: (자동)
- **응답**:
    💼 사장님 안녕하세요! 등록한 공고를 선택하면 정보가 자동으로 채워져 3분만에 완성돼요(질문 12→3개). 법무법인 검토✅
- **빠른답변**:
  - 🌐 웹에서 작성(권장) (webLink: k-alba.kr/contracts/new)
  - 💬 챗봇으로 작성 → BLOCK_34
- **조건/비고**: 공고 선택 시 자동 프리필 = 실제 contracts/new 핵심 기능

#### 33. `BLOCK_33_CONTRACT_WORKER_INTRO` — WORKER_INTRO (알바생 안내)
- **의도/트리거**: (진입에서)
- **발화 예시**: (자동)
- **응답**:
    👋 사장님이 계약서를 보내셨나요? 확인하고 서명할 수 있어요.
- **빠른답변**:
  - 📄 받은 계약서 보기 → BLOCK_39
  - ❓ 어떻게 받나요? → BLOCK_46
  - 📞 사장님께 연락 → BLOCK_47

#### 34. `BLOCK_34_CONTRACT_CREATE_STEP1` — CREATE_STEP1 (사장님 정보 자동채움)
- **의도/트리거**: (챗봇 작성 시작)
- **발화 예시**: (스킬: 사장님 정보 조회)
- **응답**:
    📋 사장님 정보 확인: 업체명/대표자/사업자번호/주소. 맞으시면 다음!
- **빠른답변**:
  - ✅ 맞아요 다음 → BLOCK_35
  - ✏️ 수정 (webLink: k-alba.kr/profile)
- **조건/비고**: K-ALBA 사장님 가입자

#### 35. `BLOCK_35_CONTRACT_CREATE_STEP2` — CREATE_STEP2 (알바생 정보)
- **의도/트리거**: (앞 단계)
- **발화 예시**: 파라미터: sys_text(알바생 식별자)
- **응답**:
    👤 알바생의 카카오톡 ID 또는 K-ALBA 사용자 검색을 입력해 주세요.
- **빠른답변**:
  - (입력 후 → BLOCK_36)

#### 36. `BLOCK_36_CONTRACT_CREATE_STEP3` — CREATE_STEP3 (급여 조건 입력)
- **의도/트리거**: (앞 단계)
- **발화 예시**: (이후 근무시간/요일/기간 단계 입력)
- **응답**:
    💰 급여 형태와 금액을 알려주세요.
- **빠른답변**:
  - 시급 12,000원
  - 시급 13,000원
  - 시급 15,000원
  - 직접 입력 → BLOCK_37

#### 37. `BLOCK_37_CONTRACT_CREATE_REVIEW` — CREATE_REVIEW (계약서 미리보기)
- **의도/트리거**: (조건 입력 완료)
- **발화 예시**: (스킬: 미리보기 생성)
- **응답**:
    basicCard '📄 미리보기': 업체/알바생/급여/근무/기간. ✅법무법인 ✅최저시급 ✅4대보험 자동
- **빠른답변**:
  - 🌐 PDF 미리보기 (webLink: k-alba.kr/contracts/preview/{id})
  - 📤 알바생에게 발송 → BLOCK_38
  - ✏️ 수정 → BLOCK_36

#### 38. `BLOCK_38_CONTRACT_CREATE_SEND` — CREATE_SEND (알바생에게 발송)
- **의도/트리거**: (미리보기에서)
- **발화 예시**: (스킬: 계약서 발송)
- **응답**:
    ✅ 계약서 발송 완료! 📱 알바생 알림, ✍️ 서명 시 알림, ⏱ 24h 미서명 자동 리마인드.
- **빠른답변**:
  - 📋 진행 상황 → BLOCK_44
  - 🏠 처음 → BLOCK_31
- **조건/비고**: 알림톡 KALBA_004(서명 요청) 트리거

#### 39. `BLOCK_39_CONTRACT_VIEW` — VIEW_CONTRACT (받은 계약서 열기)
- **의도/트리거**: (알바생 안내에서)
- **발화 예시**: (스킬: 받은 계약서 조회)
- **응답**:
    [1개] basicCard: 업체/시급·근무·기간  
    [여러개] listCard  
    [없음] 받은 계약서 없음. 사장님께 카카오 ID 알려주고 요청.
- **빠른답변**:
  - 🌐 PDF (webLink: k-alba.kr/contracts/{id})
  - ❓ 궁금한 부분 → BLOCK_40
  - ✍️ 서명할게요 → BLOCK_41
- **연결 스킬**: `/api/kakao/skill/get-contracts`

#### 40. `BLOCK_40_CONTRACT_QA` — CONTRACT_QA (조항별 설명, +보조 QA)
- **의도/트리거**: (검토 중)
- **발화 예시**: (보조: QA_SALARY/HOLIDAY/INSURANCE/SEVERANCE/TERMINATION)
- **응답**:
    어떤 부분이 궁금하신가요? (급여/주휴/4대보험/퇴직금/해고·그만두기)
- **빠른답변**:
  - 급여 어떻게?
  - 주휴수당?
  - 4대보험?
  - 퇴직금?
  - 해고/그만두기
  - ✍️ 서명하기 → BLOCK_41
- **조건/비고**: 보조 QA 블록 포함

#### 41. `BLOCK_41_CONTRACT_SIGN_INTRO` — SIGN_INTRO (서명 시작)
- **의도/트리거**: (검토 후)
- **발화 예시**: (실제 서명은 웹 SignaturePad: 손글씨+GPS)
- **응답**:
    ✍️ 한 번 서명하면 법적효력 발생. 다시 확인하세요. 준비되셨나요?
- **빠른답변**:
  - 🌐 웹에서 서명 (webLink: k-alba.kr/contracts/{id}#sign)
  - 🔙 다시 검토 → BLOCK_39

#### 42. `BLOCK_42_CONTRACT_SIGN_COMPLETE` — SIGN_COMPLETE (서명 완료 알림)
- **의도/트리거**: (알림톡 발송 시 응답)
- **발화 예시**: (조건 트리거)
- **응답**:
    basicCard '✅ 계약 완료!': 🎉 양측 서명 완료. PDF 다운로드, 경력 등록, 시간제취업에 사용.
- **빠른답변**:
  - 📄 PDF 다운로드 (webLink: k-alba.kr/contracts/{id}/pdf)
  - 🎓 시간제취업 → BLOCK_43
- **조건/비고**: 알림톡 KALBA_005(완료) 트리거

#### 43. `BLOCK_43_CONTRACT_REDIRECT_TO_PARTWORK` — REDIRECT_TO_PARTWORK (D-2/D-4 학생용)
- **의도/트리거**: (서명 완료 후)
- **발화 예시**: (조건: 비자 D-2/D-4)
- **응답**:
    🎓 D-2/D-4는 시간제취업 허가 필요. 학생 메뉴에서 도와드릴게요.
- **빠른답변**:
  - 🎓 학생 메뉴 → BLOCK_49
- **조건/비고**: 비자 D-2/D-4 시

#### 44. `BLOCK_44_CONTRACT_MY_CONTRACTS` — MY_CONTRACTS (계약서 목록)
- **의도/트리거**: STATUS_MY_CONTRACT
- **발화 예시**: 내 계약서, 계약 목록
- **응답**:
    listCard '📋 내 계약서': 업체/상태(✅완료·⏳서명대기·📝작성중)+날짜
- **연결 스킬**: `/api/kakao/skill/get-contracts`

#### 45. `BLOCK_45_CONTRACT_FAQ` — CONTRACT_FAQ (계약서 FAQ, +보조)
- **의도/트리거**: 자주 묻는 질문
- **발화 예시**: 계약서 질문, FAQ
- **응답**:
    listCard '❓ FAQ': 법적효력?/PDF출력?/서명후 수정?/사장님 위반 시? (각 보조 블록)
- **조건/비고**: 보조 FAQ 블록 포함

#### 46. `BLOCK_46_CONTRACT_HOW_TO_RECEIVE` — HOW_TO_RECEIVE (받는 방법)
- **의도/트리거**: (알바생 안내에서)
- **발화 예시**: (자동)
- **응답**:
    💡 받는 방법: 1.사장님께 K-ALBA 가입 요청 2.카카오 ID로 발송받음 3.[받은 계약서 보기] 4.서명. 영어 함께 표시.

#### 47. `BLOCK_47_CONTRACT_CONTACT_BOSS` — CONTACT_BOSS (사장님 연락)
- **의도/트리거**: (알바생 안내에서)
- **발화 예시**: (자동)
- **응답**:
    📞 사장님 연락처를 모르시면 '내 지원 내역'에서 확인하세요.
- **빠른답변**:
  - 🔍 지원 내역 → BLOCK_12
- **조건/비고**: 통합 봇: 외국인 지원내역 연결

#### 48. `BLOCK_48_CONTRACT_FALLBACK` — FALLBACK + RESET (계약서 폴백)
- **의도/트리거**: (인식 실패)
- **발화 예시**: (폴백 블록)
- **응답**:
    🤔 죄송해요, 이해하지 못했어요.
- **빠른답변**:
  - 📝 계약서 만들기 → BLOCK_32
  - ✍️ 받은 계약서 → BLOCK_33
  - 📞 운영팀 (mailto:contact@k-alba.kr)


### [유학생] #49~62

#### 49. `BLOCK_49_STUDENT_WELCOME` — WELCOME (유학생 진입)
- **의도/트리거**: (ENTRY/타페르소나, persona=student)
- **발화 예시**: 유학생, 시간제취업, 학생 알바
- **응답**:
    🎓 K-ALBA 학생 메뉴! D-2/D-4 유학생 시간제취업 허가 신청 지원.  
    100% 무료 · 학교 자동연계 · 평균 2주
- **빠른답변**:
  - 🇰🇷 한국어 → BLOCK_50 (lang=ko)
  - 🇺🇸 English → BLOCK_50 (lang=en)
  - 🇻🇳 Tiếng Việt → BLOCK_50 (lang=vi)
  - 🇨🇳 中文 → BLOCK_50 (lang=zh)

#### 50. `BLOCK_50_STUDENT_MAIN` — MAIN (학생 메인 메뉴)
- **의도/트리거**: 메뉴, 시작
- **발화 예시**: 메뉴, 안녕, 시작
- **응답**:
    🌟 무엇을 도와드릴까요?
- **빠른답변**:
  - 🚀 시간제취업 신청 → BLOCK_52
  - 📊 진행 상황 → BLOCK_55
  - ❓ FAQ → BLOCK_58
  - 🏫 학교 담당자 연락 → BLOCK_59
- **조건/비고**: user.persona == 'student' (재진입 시 이 블록)

#### 51. `BLOCK_51_STUDENT_ELIGIBILITY_CHECK` — ELIGIBILITY_CHECK (자격 확인)
- **의도/트리거**: (신청 진입 시)
- **발화 예시**: (스킬: 자격 검증)
- **응답**:
    [통과] → BLOCK_52  
    [비자부적합] 😔 D-2/D-4만. 현재:{visa}  
    [D-4 6개월 미경과] ⏳ 가능시작일/남은기간 안내
- **빠른답변**:
  - (미달-비자) 🔍 일반 알바 → BLOCK_04
- **연결 스킬**: `/api/kakao/skill/get-partwork`
- **조건/비고**: 비자·체류기간 검증

#### 52. `BLOCK_52_STUDENT_APPLY_INTRO` — APPLY_INTRO (신청 안내·자격 요건)
- **의도/트리거**: ACTION_APPLY_PARTWORK
- **발화 예시**: 시간제취업 신청, 허가 받기, 신청 시작
- **응답**:
    🎓 시간제취업 신청 흐름:  
    ① 계약 확인 (서명완료 계약서 자동 연동·첨부)  
    ② 자격 입력 — 비자(D-2/D-4)·입국일·재학과정·재학대학·TOPIK 급수  
    ③ 허용 시간 자동 계산 → 검증  
    ④ 최종 확인 후 국제처 제출 (1~3영업일)  
    입력은 웹앱에서 진행돼요.
- **빠른답변**:
  - ✅ 신청하러 가기(웹) → BLOCK_53
  - 📄 계약서 먼저 → BLOCK_31
  - ❓ 자격 요건 자세히 → BLOCK_54
- **연결 스킬**: `/api/kakao/skill/get-partwork`

#### 53. `BLOCK_53_STUDENT_APPLY_REDIRECT` — APPLY_REDIRECT (웹앱 연결)
- **의도/트리거**: (준비 완료)
- **발화 예시**: (자동)
- **응답**:
    📝 신청서 작성은 웹이 편리! 파일 업로드·서명·검토 한 번에.
- **빠른답변**:
  - 🌐 신청서 작성 (webLink: k-alba.kr/partwork/apply)
  - 📊 내 신청 보기 → BLOCK_55

#### 54. `BLOCK_54_STUDENT_DOCS_GUIDE` — DOCS_GUIDE (자격 요건 안내)
- **의도/트리거**: (신청 안내에서)
- **발화 예시**: (자동)
- **응답**:
    📋 자격 요건 (D-2 기준):  
    · 비자: D-2(학위) 또는 D-4(어학연수, 입국 6개월 경과·한도 별도)  
    · 허용시간(TOPIK 급수): 5급↑ 35h / 4급·영어트랙 30h / 4급 미만 15h(평일+주말 포함)  
    · 학기 중 공휴일·주말·방학: 유효 TOPIK 4급↑ 시 무제한  
    · 첨부: 서명완료 계약서(자동 연동), 재학·성적증명서, TOPIK 증명서  
    ※ 정확한 시간은 국제처/하이코리아 최종 확인
- **조건/비고**: 허용시간: 2026.03 공지 기준(TOPIK 급수별). 출석 70%↓·평균 C(2.0)↓ 시 불허 가능

#### 55. `BLOCK_55_STUDENT_MY_PARTWORK` — MY_PARTWORK (진행 추적)
- **의도/트리거**: STATUS_MY_PARTWORK
- **발화 예시**: 진행 상황, 시간제취업 진행, 허가 나왔나
- **응답**:
    [진행중] basicCard: 🟢1작성 🟢2제출 🟡3학교검토중 ⚪4서명 ⚪5출입국 ⚪6허가 + 예상완료일  
    [없음] 신청 없음. 시작해 보세요!
- **빠른답변**:
  - (있음) 🌐 자세히 (webLink: k-alba.kr/partwork)
  - (없음) 🚀 신청 시작 → BLOCK_52
- **연결 스킬**: `/api/kakao/skill/get-partwork`

#### 56. `BLOCK_56_STUDENT_STATUS_DETAIL` — STATUS_DETAIL (단계별 상세)
- **의도/트리거**: (진행에서 선택)
- **발화 예시**: (단계별 분기)
- **응답**:
    [검토중] 🔍 24-48h, 담당자:{name}  
    [서류추가] 📄 메모/요청서류  
    [반려] 😔 사유:{reason}  
    [승인] 🎉 확인서 발급, 출입국 제출 가능
- **빠른답변**:
  - (서류추가) 📤 업로드 (webLink: k-alba.kr/partwork/{id})

#### 57. `BLOCK_57_STUDENT_STAFF_DELAY` — STAFF_DELAY (담당자 지연)
- **의도/트리거**: (검토 48h 경과)
- **발화 예시**: (조건 트리거)
- **응답**:
    ⏰ 검토가 길어지고 있어요. 담당자에게 직접 연락 추천.
- **빠른답변**:
  - 📞 담당자 연락처 → BLOCK_59
- **조건/비고**: 검토 시작 후 48h

#### 58. `BLOCK_58_STUDENT_FAQ` — FAQ (학생 FAQ, +보조)
- **의도/트리거**: 자주 묻는 질문
- **발화 예시**: FAQ, 질문
- **응답**:
    listCard '❓ FAQ': 주당 시간/TOPIK 필요?/학기vs방학/허가 안나오면/허가 후 사업장 변경 (각 보조 블록)
- **조건/비고**: 보조 FAQ 블록 포함

#### 59. `BLOCK_59_STUDENT_CONTACT_STAFF` — CONTACT_STAFF (학교 담당자 연락)
- **의도/트리거**: (메인/지연에서)
- **발화 예시**: (스킬: 담당자 연락처 조회)
- **응답**:
    🏫 담당자 연락처: 대학/담당자/직위/부서/이메일/전화. ⏰ 평일 09-18시 연락이 빨라요!
- **연결 스킬**: `/api/kakao/skill/contact-staff`

#### 60. `BLOCK_60_STUDENT_UNIVERSITY_NOT_REGISTERED` — UNIVERSITY_NOT_REGISTERED (미등록 학교)
- **의도/트리거**: (학교 미등록 시)
- **발화 예시**: (조건 트리거)
- **응답**:
    ⚠️ 본 학교는 K-ALBA 미등록. 1.국제처에 가입 요청 2.운영팀 문의
- **빠른답변**:
  - 📞 운영팀 (mailto:contact@k-alba.kr)
  - 📋 가입 대학 보기 (webLink: k-alba.kr/partwork#universities)
- **조건/비고**: 학교 미등록

#### 61. `BLOCK_61_STUDENT_PRIVACY_NOTICE` — PRIVACY_NOTICE (개인정보 동의)
- **의도/트리거**: (신청 시작 1회)
- **발화 예시**: (조건 트리거)
- **응답**:
    🔒 동의: 이름·비자·학교·학과·TOPIK·입국일·첨부서류가 학교/출입국 제공용으로 처리. (k-alba.kr/privacy)
- **조건/비고**: 신청 최초 1회

#### 62. `BLOCK_62_STUDENT_FALLBACK` — FALLBACK + HELP (학생 폴백)
- **의도/트리거**: (인식 실패)
- **발화 예시**: (폴백 블록)
- **응답**:
    🤔 죄송해요, 이해하지 못했어요.
- **빠른답변**:
  - 🚀 신청 → BLOCK_52
  - 📊 진행 상황 → BLOCK_55
  - ❓ FAQ → BLOCK_58
  - 🏫 담당자 → BLOCK_59


### [사장님] #63~78

#### 63. `BLOCK_63_BOSS_WELCOME` — WELCOME (사장님 진입)
- **의도/트리거**: (ENTRY 자동, persona=boss)
- **발화 예시**: 사장님, 공고, 채용
- **응답**:
    💼 K-ALBA 사장님 메뉴! 외국인 알바 채용 지원.  
    ✨7개국 매칭 ✨비자 자동검증 ✨법무법인 계약서 ✨학생 자동연계
- **빠른답변**:
  - 📝 공고 등록 → BLOCK_66
  - 📋 내 공고 → BLOCK_70
  - 👥 지원자 보기 → BLOCK_73
  - 📄 계약서 → BLOCK_77
  - 📚 채용 가이드 → BLOCK_78

#### 64. `BLOCK_64_BOSS_MAIN` — MAIN (사장님 메인 메뉴)
- **의도/트리거**: 메뉴, 시작, 안녕
- **발화 예시**: 메뉴, 안녕, 처음부터
- **응답**:
    💼 무엇을 도와드릴까요? (재진입 시 인사 생략 버전, WELCOME과 동일 메뉴)
- **빠른답변**:
  - 📝 공고 등록 → BLOCK_66
  - 📋 내 공고 → BLOCK_70
  - 👥 지원자 보기 → BLOCK_73
  - 📄 계약서 → BLOCK_77
  - 📚 채용 가이드 → BLOCK_78
- **조건/비고**: user.persona == 'boss' (재진입 시 ENTRY 건너뛰고 이 블록)

#### 65. `BLOCK_65_BOSS_AUTH_CHECK` — AUTH_CHECK (사업자 인증)
- **의도/트리거**: (첫 사용 시)
- **발화 예시**: (스킬: 사업자 검증)
- **응답**:
    [통과] → 다음 흐름  
    [미인증] 🔒 사업자등록번호로 1분 인증(국세청 NTS 자동).
- **빠른답변**:
  - 🌐 사업자 인증 (webLink: k-alba.kr/signup?type=employer)
- **연결 스킬**: `/api/kakao/skill/check-business`
- **조건/비고**: 최초 사용 시

#### 66. `BLOCK_66_BOSS_POST_INTRO` — POST_INTRO (공고 등록 진입)
- **의도/트리거**: ACTION_POST_JOB
- **발화 예시**: 공고 올리기, 직원 구함, 공고 등록
- **응답**:
    📝 공고를 만들어 드릴게요! 챗봇 14단계, 평균 3분.
- **빠른답변**:
  - 🌐 웹에서 작성(권장) (webLink: k-alba.kr/jobs/post)
  - 💬 챗봇 진행 → BLOCK_67

#### 67. `BLOCK_67_BOSS_POST_STEP1` — POST_STEP1 (업종 선택)
- **의도/트리거**: (공고 등록에서)
- **발화 예시**: (이후 14단계 — 웹앱과 동일)
- **응답**:
    🏪 어떤 업종이세요?
- **빠른답변**:
  - 카페
  - 식당
  - 편의점
  - 제조
  - 농업
  - 기타 → 업종 직접입력

#### 68. `BLOCK_68_BOSS_POST_STEP_SHORT` — POST_STEP_SHORT (간단 안내)
- **의도/트리거**: (빠른 입력 시)
- **발화 예시**: (조건 트리거)
- **응답**:
    💡 웹에서 작성하면 시세 가이드·주소 검색 자동 제공!
- **빠른답변**:
  - 🌐 웹에서 작성 (webLink: k-alba.kr/jobs/post)
  - 💬 챗봇 계속 → BLOCK_67

#### 69. `BLOCK_69_BOSS_POST_COMPLETE` — POST_COMPLETE (등록 완료)
- **의도/트리거**: (공고 입력 완료)
- **발화 예시**: (스킬: 공고 생성)
- **응답**:
    basicCard '🎉 공고 등록 완료!': 업체/제목/시급/모집인원. ✨반경5km 자동푸시 ✨즉시노출 ✨30일 후 만료
- **빠른답변**:
  - 🌐 공고 보기 (webLink: k-alba.kr/jobs/{id})

#### 70. `BLOCK_70_BOSS_MY_JOBS` — MY_JOBS (내 공고)
- **의도/트리거**: STATUS_MY_JOB_POSTING
- **발화 예시**: 내 공고, 공고 관리, 지원자 몇 명
- **응답**:
    listCard '📋 내 공고': 공고명/상태(✅활성·⏸비활성·✓마감)+지원자수+등록일

#### 71. `BLOCK_71_BOSS_JOB_STATS` — JOB_STATS (공고 분석)
- **의도/트리거**: (공고 선택)
- **발화 예시**: (스킬: 공고 통계)
- **응답**:
    basicCard '📊 통계': 조회/지원/검토중/합격/거절 + 비자분포 + 평균 한국어 + 국적
- **빠른답변**:
  - 👥 지원자 보기 → BLOCK_73

#### 72. `BLOCK_72_BOSS_JOB_CLOSE` — JOB_CLOSE (공고 마감)
- **의도/트리거**: (공고 관리에서)
- **발화 예시**: (자동)
- **응답**:
    마감하시겠어요? 마감 시 새 지원 중단, 기존 검토 가능, 7일 후 보관.
- **빠른답변**:
  - ✅ 마감 → 마감 확정
  - 🚫 취소 → BLOCK_70

#### 73. `BLOCK_73_BOSS_APPLICANTS` — APPLICANTS (지원자 목록)
- **의도/트리거**: ACTION_VIEW_APPLICANTS
- **발화 예시**: 지원자 누구, 지원자 보여줘
- **응답**:
    listCard '👥 지원자': 국기+이름-비자(학교) / 한마디+평점
- **빠른답변**:
  - 🌐 모두 보기 (webLink: k-alba.kr/applicants)
- **연결 스킬**: `/api/kakao/skill/get-applicants`

#### 74. `BLOCK_74_BOSS_APPLICANT_DECISION` — APPLICANT_DECISION (합격/거절 선택)
- **의도/트리거**: (지원자 선택 후)
- **발화 예시**: (조건 트리거)
- **응답**:
    👤 {이름}({국적},{비자}) 한국어/평점. 결정해 주세요!
- **빠른답변**:
  - ✅ 합격 → BLOCK_75
  - ❌ 거절 → BLOCK_76
  - 💬 채팅 먼저 (webLink: k-alba.kr/chat)
  - 🔙 목록 → BLOCK_73

#### 75. `BLOCK_75_BOSS_ACCEPT_FLOW` — ACCEPT_FLOW (합격 처리)
- **의도/트리거**: (합격 선택)
- **발화 예시**: (스킬: 합격. 출근일/장소/시간/메시지 입력)
- **응답**:
    🎉 합격 처리! 📅 첫 출근일?(이후 면접·장소·시간·메시지) → 알바생 알림 + 계약서 안내
- **빠른답변**:
  - (입력 완료 → 계약서 안내 BLOCK_31)
- **연결 스킬**: `/api/kakao/skill/accept-applicant`
- **조건/비고**: 알림톡 KALBA_002(합격) 트리거

#### 76. `BLOCK_76_BOSS_REJECT_FLOW` — REJECT_FLOW (거절 처리)
- **의도/트리거**: (거절 선택)
- **발화 예시**: (스킬: 거절)
- **응답**:
    💌 정중한 거절 메시지. 사유를 선택해 주세요.
- **빠른답변**:
  - 조건 불일치
  - 다른 후보 선정
  - 비자 문제
  - 직접 작성
- **연결 스킬**: `/api/kakao/skill/reject-applicant`
- **조건/비고**: 알림톡 KALBA_003(거절) 트리거

#### 77. `BLOCK_77_BOSS_CONTRACT_REDIRECT` — CONTRACT_REDIRECT (계약서 연결)
- **의도/트리거**: (메뉴에서)
- **발화 예시**: (자동)
- **응답**:
    📄 계약서는 계약서 메뉴에서 도와드려요!
- **빠른답변**:
  - 📄 계약서 시작 → BLOCK_31
  - 🌐 웹에서 작성 (webLink: k-alba.kr/contracts/new)
- **조건/비고**: 통합 봇: 계약서 페르소나 분기

#### 78. `BLOCK_78_BOSS_GUIDE_INTRO` — GUIDE_INTRO (채용 가이드, +보조+폴백)
- **의도/트리거**: 채용 가이드
- **발화 예시**: 채용 가이드, 외국인 채용 방법
- **응답**:
    listCard '📚 외국인 채용 가이드': 채용가능 비자/한국어 수준/최저시급·주휴/사업장 변경 신고/4대보험 (각 보조) + FALLBACK 통합
- **조건/비고**: 보조 가이드 + 폴백 포함


### [학교 담당자] #79~90

#### 79. `BLOCK_79_STAFF_WELCOME` — WELCOME (학교 담당자 진입)
- **의도/트리거**: (ENTRY 자동, persona=staff)
- **발화 예시**: 학교 담당자, 검토, 국제처
- **응답**:
    🏫 K-ALBA 학교 담당자 메뉴! 신청서 검토·서명을 모바일로.  
    ✅24h 내 처리 권장 🔒RLS 권한제어 ⚖️확인서 자동생성
- **빠른답변**:
  - 📋 신청 검토 → BLOCK_82
  - 📊 통계 → BLOCK_87
  - 👥 담당자 관리 → BLOCK_88
  - ❓ FAQ → BLOCK_89

#### 80. `BLOCK_80_STAFF_MAIN` — MAIN (학교 담당자 메인 메뉴)
- **의도/트리거**: 메뉴, 시작, 안녕
- **발화 예시**: 메뉴, 안녕, 처음부터
- **응답**:
    🏫 무엇을 도와드릴까요? (재진입 시 인사 생략 버전, WELCOME과 동일 메뉴)
- **빠른답변**:
  - 📋 신청 검토 → BLOCK_82
  - 📊 통계 → BLOCK_87
  - 👥 담당자 관리 → BLOCK_88
  - ❓ FAQ → BLOCK_89
- **조건/비고**: user.persona == 'staff' (재진입 시 ENTRY 건너뛰고 이 블록)

#### 81. `BLOCK_81_STAFF_AUTH_CHECK` — AUTH_CHECK (담당자 인증·대학 등록)
- **의도/트리거**: (첫 사용 시)
- **발화 예시**: (스킬: 담당자 권한 검증)
- **응답**:
    [통과] → 다음 흐름  
    [미인증] 🔒 대학별 첫 담당자는 신규 대학 등록(신청), 추가 담당자는 관리자 초대 수락.  
    ※ 학교 공식 이메일(예: @univ.ac.kr)만 가입 가능
- **빠른답변**:
  - 🌐 신규 대학 등록(첫 담당자) (webLink: k-alba.kr/staff/register)
  - 🌐 초대 받았어요 (webLink: k-alba.kr/login)
- **조건/비고**: 최초 사용 시 · 학교 공식 이메일 도메인 제한

#### 82. `BLOCK_82_STAFF_REVIEW_LIST` — REVIEW_LIST (검토 목록)
- **의도/트리거**: ACTION_REVIEW_APP
- **발화 예시**: 신청서 검토, 승인 처리, 검토할 것
- **응답**:
    listCard '📋 검토할 신청': 상태배지+학생명(비자,학과)/근무처+제출일  
    상태 6종: 📥제출됨 / 👀검토중 / 📄추가서류요청 / ✍️서명완료 / ✅승인 / ❌반려  
    (상태 필터·검색(이름/근무처/학과) 가능 · 신청서를 열면 제출됨→검토중 자동 전환)  
    (매일 09:00 staff-pending-reminder Cron이 이 목록 알림)
- **빠른답변**:
  - 🌐 모두 보기 (webLink: k-alba.kr/staff/partwork)
- **연결 스킬**: `/api/kakao/skill/staff-pending`

#### 83. `BLOCK_83_STAFF_REVIEW_DETAIL` — REVIEW_DETAIL (신청서 상세·5섹션)
- **의도/트리거**: (목록에서 선택)
- **발화 예시**: (스킬: 신청 상세 조회)
- **응답**:
    basicCard '📋 {학생} 신청서' — 5개 섹션:  
    ① 학생정보(성명·비자·입국일·대학/과정·TOPIK)  
    ② 근무정보(근무처·사업자번호·직무·요일/시간/시급·계약기간)  
    ③ 첨부서류 6종(표준근로계약서·재학증명서·성적증명서·한국어능력·여권·외국인등록증) 각 '보기'  
    ④ 시간제취업확인서 미리보기(서명 전)  
    ⑤ 처리 이력(검토시작/서명/추가서류/반려/승인)  
    검토 체크: 시급≥최저, 재학증명 1개월내, 여권 6개월+, 외등 체류기간, TOPIK 자격 충족
- **빠른답변**:
  - 🌐 상세·서류 보기 (webLink: k-alba.kr/staff/partwork/{id})
  - ✍️ 서명하고 승인 → BLOCK_84
  - 📄 추가 서류 요청 → BLOCK_85
  - ❌ 반려 → BLOCK_86
- **연결 스킬**: `/api/kakao/skill/staff-pending`

#### 84. `BLOCK_84_STAFF_SIGN_REDIRECT` — SIGN_REDIRECT (서명·승인 안내)
- **의도/트리거**: (상세에서)
- **발화 예시**: (실제 서명은 웹 Canvas)
- **응답**:
    ✍️ 서명 절차(웹): ①유학생담당자 확인 섹션에서 '인증대학 여부' 선택 → ②'서명하고 승인' → ③손글씨 서명(마우스/터치) → ④저장.  
    💡 기본 서명 등록 시 자동 불러옴.  
    서명 후: 상태 '서명완료' 자동전환 + 확인서 PDF 자동생성 + 학생 알림(이메일/카톡).  
    📌 최종 승인: 학생이 출입국 허가받은 뒤 담당자가 '최종 승인' 처리 → '✅승인'
- **빠른답변**:
  - 🌐 서명하기 (webLink: k-alba.kr/staff/partwork/{id}#sign)
- **조건/비고**: 서명완료/승인 시 알림톡 KALBA_006(결과, 학생에게) 트리거

#### 85. `BLOCK_85_STAFF_REQUEST_DOCS` — REQUEST_DOCS (추가 서류 요청)
- **의도/트리거**: (상세에서)
- **발화 예시**: (스킬: 추가 서류 요청 → 학생 알림)
- **응답**:
    📄 어떤 서류가 추가로 필요하신가요? (복수 선택 가능)
- **빠른답변**:
  - 재학증명서(최신)
  - 성적증명서(최신)
  - 출석확인서
  - 한국어 능력(TOPIK 성적표)
  - 여권 사본
  - 외국인등록증
  - 자유 입력
- **연결 스킬**: `/api/kakao/skill/staff-pending`
- **조건/비고**: 요청 시 검토중→추가서류요청, 학생 업로드 시 검토중 복귀

#### 86. `BLOCK_86_STAFF_REJECT_REASON` — REJECT_REASON (반려 사유)
- **의도/트리거**: (상세에서)
- **발화 예시**: 파라미터: sys_text(반려 사유)
- **응답**:
    ❌ 반려 사유를 입력해 주세요. 학생이 보므로 정중·명확하게(개선 방향 포함).  
    예: 'TOPIK 2급으로 D-2 학사 자격(3급↑) 미충족. 급수 향상 후 재신청.'
- **빠른답변**:
  - (입력 후 → 반려 처리·학생 알림)
- **연결 스킬**: `/api/kakao/skill/staff-pending`
- **조건/비고**: 반려는 영구 기록. 경미한 누락은 반려 대신 추가서류 요청 권장

#### 87. `BLOCK_87_STAFF_STATS` — STATS (통계 대시보드)
- **의도/트리거**: 통계
- **발화 예시**: 통계, 대시보드, 처리 현황
- **응답**:
    basicCard '📊 {대학} 통계' 카드: 대기 / 검토중 / 추가서류 / 서명완료 / 승인 / 이번 주 처리량 + 평균 처리시간
- **빠른답변**:
  - 🌐 자세히 (webLink: k-alba.kr/staff/partwork)

#### 88. `BLOCK_88_STAFF_MANAGE` — STAFF_MANAGE (담당자 관리·초대)
- **의도/트리거**: 담당자 관리, 담당자 초대
- **발화 예시**: 담당자 관리, 담당자 초대
- **응답**:
    👥 담당자 관리 (관리자 전용)  
    역할 3종: 검토자(reviewer·검토/서명/반려/요청만) / 관리자(manager·+초대·철회) / 대학관리자(admin·+등급부여)  
    초대: 이메일·성명·직위·역할 입력 → 발송 → 7일 내 수락·가입 시 자동 등록. 대기 초대는 철회 가능.
- **빠른답변**:
  - 📨 새 담당자 초대 (webLink: k-alba.kr/staff/partwork/invite)
  - 📋 현재 담당자/내 정보 (webLink: k-alba.kr/staff/partwork/profile)
- **조건/비고**: role == manager 또는 admin (reviewer는 초대 불가)

#### 89. `BLOCK_89_STAFF_FAQ` — FAQ (학교 담당자 FAQ, +보조)
- **의도/트리거**: 자주 묻는 질문
- **발화 예시**: FAQ, 질문
- **응답**:
    listCard '❓ FAQ': 승인 기준/검토 기간/서명 방법/타 대학 담당자/운영팀 도움 (각 보조 블록)
- **조건/비고**: 보조 FAQ 블록 포함

#### 90. `BLOCK_90_STAFF_FALLBACK` — FALLBACK + HUMAN (학교 폴백)
- **의도/트리거**: (인식 실패)
- **발화 예시**: (폴백 블록)
- **응답**:
    🤔 이해하지 못했어요.
- **빠른답변**:
  - 📋 검토할 것 → BLOCK_82
  - 📊 통계 → BLOCK_87
  - 📞 운영팀 (mailto:support@k-alba.kr)


---

## 8. 입력 순서 권장 (가이드 7장 체크리스트와 동일)

1. BLOCK_0_ENTRY (페르소나 선택, 시작 블록 지정)
2. 외국인 #1~30
3. 계약서 #31~48
4. 유학생 #49~62
5. 사장님 #63~78
6. 학교 담당자 #79~90
7. 페르소나 분기 조건 검증
8. 발화 패턴 보강(7개 언어)
9. KAKAO_SKILL_TOKEN 발급·등록
10. 시뮬레이터로 5개 페르소나 흐름 테스트


*— 미림미디어랩(주) · K-ALBA · J1204020260002 · 119-86-61402*
