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
