# 카카오 알림톡 설정 (K-ALBA 근로계약 알림)

## 진행 상황 (2026-07-14 기준)

- [x] 카카오톡 채널: **@kalba** (KALBA 외국인 알바, 비즈니스 인증 완료)
- [x] 채널 고객센터 연락처 등록: 070-7008-5101
- [x] NAVER Cloud SENS 프로젝트 **kalba** 생성
  - SMS 서비스 ID: `ncp:sms:kr:256803249042:kalba`
  - 알림톡(Biz Message) 서비스 ID: `ncp:kkobizmsg:kr:256803265266:kalba`
- [x] SENS 발신프로필(@kalba) 등록 완료
- [x] 알림톡 템플릿 5종 등록 → **검수 접수 중 (통과까지 보통 1~3영업일)**
- [ ] 템플릿 검수 승인 확인 (SENS 콘솔 → Biz Message → AlimTalk Template)
- [ ] NCP API 인증키 발급 + Vercel 환경변수 등록 (아래)

## 등록된 템플릿 코드

| 코드 | 용도 | 수신자 |
|---|---|---|
| KALBASIGNREQ | 근로계약서 서명 요청 | 근로자 |
| KALBAAPPRREQ | 근로계약서 승인 요청 | 사장님 |
| KALBAAPPROVED | 계약서 승인 완료 → 서명 안내 | 근로자 |
| KALBAEMPSIGN | 최종 서명 요청 | 사장님 |
| KALBACOMPLETED | 근로계약 완료 | 양측 |

모든 템플릿에 웹링크 버튼 「계약서 확인」 → `https://k-alba.kr/contracts/#{계약ID}` 포함.

## 검수 승인 후 마지막 단계 (직접 진행 필요)

1. **API 인증키 발급**: NCP 콘솔 → 마이페이지 → 계정 관리 → 인증키 관리 → 신규 API 인증키 생성
   (Access Key / Secret Key — 외부에 노출 금지)
2. **Vercel 환경변수 등록**: Vercel → mirim.k-alba → Settings → Environment Variables

```
NCP_SENS_ACCESS_KEY=          # 위에서 발급한 Access Key
NCP_SENS_SECRET_KEY=          # 위에서 발급한 Secret Key
NCP_SENS_ALIMTALK_SERVICE_ID=ncp:kkobizmsg:kr:256803265266:kalba
KAKAO_CHANNEL_ID=@kalba
ALIMTALK_TPL_SIGN_REQUEST=KALBASIGNREQ
ALIMTALK_TPL_APPROVAL_REQUEST=KALBAAPPRREQ
ALIMTALK_TPL_APPROVED=KALBAAPPROVED
ALIMTALK_TPL_EMPLOYER_SIGN=KALBAEMPSIGN
ALIMTALK_TPL_COMPLETED=KALBACOMPLETED
```

3. 재배포하면 알림톡 발송이 자동 활성화됩니다. (환경변수 없으면 이메일만 발송)

## 발송 시점 (자동)

- 사장님 [근로자에게 서명 요청] 클릭 → 근로자 (KALBASIGNREQ)
- 알바생 작성 계약서 공유 → 사장님 (KALBAAPPRREQ)
- 근로자 서명 후 공유 → 사장님 (KALBAEMPSIGN)
- 양측 서명 완료 → 양측 (KALBACOMPLETED)

## 비용

알림톡 약 8~9원/건 (VAT 별도). 실패 시 SMS 대체발송은 SENS 콘솔 → 알림톡 설정에서 켤 수 있습니다 (문자 단가 별도).

---
2026-07-14: 템플릿 5종 검수 승인 완료, Vercel 환경변수 등록 완료 → 알림톡 활성화.

---

## 상호 평가 알림톡 (2026-07-23 추가 — 템플릿 등록 필요)

계약 종료 다음날(+ 2개월 이상 장기근무는 근무 2개월 시점) 양측에 평가 요청 알림톡 발송.
매일 KST 10:00 Vercel Cron(`/api/cron/review-requests`)이 대상 계약을 찾아 발송하며,
`review_requests` 테이블로 중복 발송을 막습니다. 이미 평가를 제출한 쪽에는 보내지 않습니다.

### 1. SENS 콘솔에 템플릿 2종 등록 (검수 1~3영업일)

**템플릿 코드: KALBAREVIEWEMP** (수신: 사장님)

```
[K-ALBA] #{알바생명}님 평가 요청

#{사장님명}님, #{시점문구}
#{알바생명}님에 대한 평가(별점+한줄평)를 남겨주시면, 성실한 알바생을 찾는 다른 사장님들과 K-ALBA 매칭 품질에 큰 도움이 됩니다.

소요시간 30초!
```
버튼: 웹링크 「평가 남기기」 → `https://k-alba.kr/reviews/#{계약ID}`

**템플릿 코드: KALBAREVIEWWRK** (수신: 알바생)

```
[K-ALBA] #{근무처명} 평가 요청

#{알바생명}님, #{시점문구}
#{근무처명}에 대한 평가(별점+한줄평)를 남겨주시면, 좋은 일자리를 찾는 다른 알바생들에게 큰 도움이 됩니다.

소요시간 30초!
```
버튼: 웹링크 「평가 남기기」 → `https://k-alba.kr/reviews/#{계약ID}`

※ #{시점문구}: "함께한 근무는 어떠셨나요?" (종료) / "근무 2개월이 되었어요! 지금까지 어떠셨나요?" (중간)

### 2. 검수 승인 후 Vercel 환경변수 추가

```
ALIMTALK_TPL_REVIEW_EMPLOYER=KALBAREVIEWEMP
ALIMTALK_TPL_REVIEW_WORKER=KALBAREVIEWWRK
```

### 3. DB 마이그레이션 적용

`supabase/migrations_pending/20260723_create_reviews.sql` 실행
(reviews + review_requests 테이블. Claude에게 요청하거나 SQL Editor에서 직접 실행)

환경변수·테이블이 없으면 cron이 조용히 skip하므로, 순서 상관없이 배포해도 안전합니다.
