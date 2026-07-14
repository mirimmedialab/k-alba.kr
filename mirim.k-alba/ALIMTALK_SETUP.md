# 카카오 알림톡 설정 가이드 (K-ALBA 근로계약 알림)

코드는 이미 준비되어 있습니다. 아래 절차를 마치고 Vercel 환경변수만 넣으면
서명 요청·승인 요청·완료 알림이 카카오 알림톡으로 자동 발송됩니다.
(설정 전까지는 이메일로만 발송)

## 1. 카카오톡 채널 개설 (무료, ~1일)
1. https://center-pf.kakao.com 접속 → 채널 만들기 (예: "K-ALBA")
2. 채널 관리자센터 → 관리 → 상세설정 → **비즈니스 채널 신청** (사업자등록증 필요)

## 2. NAVER Cloud SENS 신청 (~1일)
1. https://console.ncloud.com → Services → **Simple & Easy Notification Service (SENS)**
2. 프로젝트 생성 → **Biz Message(알림톡)** 서비스 생성 → 서비스 ID 확인
3. 카카오톡 채널 연동: SENS 콘솔에서 채널 ID(@k-alba)로 발신프로필 등록
   (카카오 채널 관리자 휴대폰 인증 필요)
4. 마이페이지 → 계정관리 → **인증키 관리** → Access Key / Secret Key 발급

## 3. 알림톡 템플릿 등록 + 심사 (2~3일)
SENS 콘솔 → 알림톡 → 템플릿 → 아래 5종 등록 (변수는 #{변수명} 형식).
버튼: 웹링크(WL) "계약서 확인" → https://k-alba.kr/contracts/#{계약ID}

| 템플릿 코드 | 용도 | 내용 |
|---|---|---|
| KALBA_SIGN_REQ | 근로자 서명 요청 | [K-ALBA] 근로계약서 서명 요청\n\n#{근로자명}님, #{업체명}에서 근로계약서를 보냈습니다.\n\n· 근무: #{근무요일} #{근무시간}\n· 급여: #{급여형태} #{급여}원\n\n내용을 확인하고 전자서명해 주세요. |
| KALBA_APPR_REQ | 사장님 승인 요청 | [K-ALBA] 근로계약서 승인 요청\n\n#{근로자명}님이 작성한 근로계약서가 승인을 기다리고 있습니다.\n\n· 근무: #{근무요일} #{근무시간}\n· 급여: #{급여형태} #{급여}원\n\n조건을 확인하고 승인해 주세요. |
| KALBA_APPROVED | 승인 완료 → 서명 안내 | [K-ALBA] 계약서 승인 완료\n\n#{근로자명}님, 사장님이 계약서를 승인했습니다.\n전자서명을 진행해 주세요. |
| KALBA_EMP_SIGN | 사장님 최종 서명 요청 | [K-ALBA] 최종 서명 요청\n\n#{근로자명}님이 서명을 완료했습니다.\n사장님의 최종 서명만 남았습니다. |
| KALBA_COMPLETED | 계약 완료 (양측) | [K-ALBA] 근로계약 완료\n\n양측 서명이 모두 완료되었습니다.\n계약서 PDF를 다운로드해 보관하세요. |

※ 정보성 메시지라 심사 통과 무난. 광고 문구 넣으면 반려됩니다.

## 4. Vercel 환경변수 등록
Vercel → mirim.k-alba → Settings → Environment Variables:

```
NCP_SENS_ACCESS_KEY=          # 2-4에서 발급한 Access Key
NCP_SENS_SECRET_KEY=          # 2-4에서 발급한 Secret Key
NCP_SENS_ALIMTALK_SERVICE_ID= # 2-2 서비스 ID (ncp:kkobizmsg:kr:...)
KAKAO_CHANNEL_ID=@k-alba      # 1에서 만든 채널 ID
ALIMTALK_TPL_SIGN_REQUEST=KALBA_SIGN_REQ
ALIMTALK_TPL_APPROVAL_REQUEST=KALBA_APPR_REQ
ALIMTALK_TPL_APPROVED=KALBA_APPROVED
ALIMTALK_TPL_EMPLOYER_SIGN=KALBA_EMP_SIGN
ALIMTALK_TPL_COMPLETED=KALBA_COMPLETED
```

등록 후 재배포하면 즉시 알림톡 발송이 활성화됩니다.

## 발송 시점 (자동)
- 사장님 [근로자에게 서명 요청] 클릭 → 근로자에게 (sign_request)
- 알바생 작성 계약서 공유 → 사장님에게 (approval_request)
- 근로자 서명 후 공유 → 사장님에게 (employer_sign_request)
- 양측 서명 완료 → 양측에게 (completed)

## 비용
알림톡 약 8~9원/건 (SENS 기준, VAT 별도). 실패 시 SMS 대체발송은 SENS 콘솔에서 설정.
