// 인증/가입 에러의 영문 기술 메시지 → 언어별 이해하기 쉬운 안내로 변환.
// (Supabase/Postgres 에러 문자열을 부분 매칭. 큰 locale 파일을 건드리지 않고 한 곳에서 관리.)

const MSGS = {
  invalidLogin: {
    ko: "이메일 또는 비밀번호가 올바르지 않아요. 다시 확인해 주세요.",
    en: "Incorrect email or password. Please try again.",
    vi: "Email hoặc mật khẩu không đúng. Vui lòng thử lại.",
    zh: "邮箱或密码不正确，请重新确认。",
    uz: "Email yoki parol noto‘g‘ri. Qaytadan urinib ko‘ring.",
    mn: "И-мэйл эсвэл нууц үг буруу байна. Дахин шалгана уу.",
    ja: "メールまたはパスワードが正しくありません。もう一度お試しください。",
  },
  emailTaken: {
    ko: "이미 가입된 이메일이에요. 로그인해 주세요.",
    en: "This email is already registered. Please log in.",
    vi: "Email này đã được đăng ký. Vui lòng đăng nhập.",
    zh: "该邮箱已注册，请登录。",
    uz: "Bu email allaqachon ro‘yxatdan o‘tgan. Iltimos, kiring.",
    mn: "Энэ и-мэйл бүртгэлтэй байна. Нэвтэрнэ үү.",
    ja: "このメールは既に登録されています。ログインしてください。",
  },
  emailNotConfirmed: {
    ko: "이메일 인증이 필요해요. 받은 편지함에서 인증 메일을 확인해 주세요.",
    en: "Please verify your email. Check your inbox for the confirmation mail.",
    vi: "Vui lòng xác minh email. Kiểm tra hộp thư để nhận mail xác nhận.",
    zh: "请先验证邮箱，查看收件箱中的确认邮件。",
    uz: "Emailingizni tasdiqlang. Pochtangizdagi tasdiqlash xatini tekshiring.",
    mn: "И-мэйлээ баталгаажуулна уу. Ирсэн захидлаас баталгаажуулах и-мэйлийг шалгаарай.",
    ja: "メール認証が必要です。受信トレイの確認メールをご確認ください。",
  },
  rateLimit: {
    ko: "요청이 많아요. 잠시 후 다시 시도해 주세요.",
    en: "Too many requests. Please try again shortly.",
    vi: "Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.",
    zh: "请求过多，请稍后再试。",
    uz: "So‘rovlar juda ko‘p. Birozdan so‘ng qayta urinib ko‘ring.",
    mn: "Хүсэлт хэт олон байна. Түр хүлээгээд дахин оролдоно уу.",
    ja: "リクエストが多すぎます。しばらくしてからお試しください。",
  },
  serverRetry: {
    // RLS / DB 처리 실패 등 — 계정은 만들어졌을 수 있어 로그인 유도
    ko: "처리 중 문제가 있었어요. 계정이 생성됐을 수 있으니 로그인해 보시고, 안 되면 잠시 후 다시 시도해 주세요.",
    en: "Something went wrong. Your account may have been created — try logging in, or try again shortly.",
    vi: "Đã xảy ra lỗi. Tài khoản của bạn có thể đã được tạo — hãy thử đăng nhập, hoặc thử lại sau.",
    zh: "处理时出现问题。您的账号可能已创建，请尝试登录，或稍后重试。",
    uz: "Muammo yuz berdi. Hisobingiz yaratilgan bo‘lishi mumkin — kirib ko‘ring yoki keyinroq urinib ko‘ring.",
    mn: "Алдаа гарлаа. Таны бүртгэл үүссэн байж магадгүй — нэвтэрч үзээрэй, эсвэл түр хүлээгээд дахин оролдоно уу.",
    ja: "処理中に問題が発生しました。アカウントは作成された可能性があります。ログインするか、しばらくして再試行してください。",
  },
  generic: {
    ko: "문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
    en: "Something went wrong. Please try again shortly.",
    vi: "Đã xảy ra sự cố. Vui lòng thử lại sau giây lát.",
    zh: "出现问题，请稍后再试。",
    uz: "Xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.",
    mn: "Алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
    ja: "問題が発生しました。しばらくしてからお試しください。",
  },
};

/** 원본 에러 메시지 → 언어별 친화 문구 */
export function authErrorMessage(raw, locale = "ko") {
  const m = String(raw || "").toLowerCase();
  let key = "generic";
  if (m.includes("invalid login") || m.includes("invalid credentials")) key = "invalidLogin";
  else if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("duplicate key") ||
    m.includes("profiles_email_key") ||
    m.includes("user already exists")
  ) key = "emailTaken";
  else if (m.includes("email not confirmed") || m.includes("not confirmed")) key = "emailNotConfirmed";
  else if (m.includes("rate limit") || m.includes("too many")) key = "rateLimit";
  else if (m.includes("row-level security") || m.includes("row level security") || m.includes("violates")) key = "serverRetry";
  const grp = MSGS[key] || MSGS.generic;
  return grp[locale] || grp.ko;
}
