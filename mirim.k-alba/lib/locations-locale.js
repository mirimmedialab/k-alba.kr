/**
 * K-ALBA 위치 기반 서비스 locale 추가분 (7개 언어)
 *
 * 사용법: 각 언어의 locale 파일에 아래 객체를 병합
 *
 * 예: src/lib/locales/ko.js 에 아래 location 섹션 추가
 *
 * 번역 단어 선정 기준:
 *   - 외국인 친화적인 단순한 단어 사용
 *   - 지명(시/구/동)은 한국어 원본 유지 (찾기 쉽도록)
 *   - 숫자 단위는 각 언어의 관용구 (분/km 등)
 */

export const LOCATION_TRANSLATIONS = {
  ko: {
    location: {
      // 위치 권한
      permissionTitle: "내 주변 알바 찾기",
      permissionBody: "위치 정보를 허용하면 우리 집에서 가까운 공고를 먼저 볼 수 있어요.\n대중교통으로 몇 분 걸리는지 미리 알 수 있어요.",
      permissionAllow: "위치 허용하기",
      permissionLater: "나중에",

      // 위치 소스 배너
      sourceGps: "현재 위치 기준",
      sourceProfile: "등록된 거주지 기준",
      sourceDefault: "기본 위치 (서울)",
      requestLocation: "내 위치로 찾기",
      refreshLocation: "다시 찾기",

      // 필터
      radius: "반경",
      radiusKm: "{km}km",
      visa: "비자",
      all: "전체",
      sortNearest: "가까운 순",
      sortLatest: "최신순",
      sortPay: "급여 높은 순",

      // 지도 / 경로
      mapView: "지도 보기",
      listView: "리스트 보기",
      straightDistance: "직선 거리",
      myHome: "우리 집",
      nearestStation: "가장 가까운 역",
      walkMin: "도보 {min}분",

      // 이동수단
      modeTransit: "대중교통",
      modeWalking: "도보",
      modeCycling: "자전거",
      modeDriving: "자동차",
      recommended: "추천",
      transfers: "환승 {n}회",
      noTransfers: "환승 없음",
      taxiFee: "택시 약 ₩{fee}",

      // 부가 정보
      providesHousing: "숙식 제공",
      providesShuttle: "통근버스",

      // 프로필 설정
      homeAddress: "거주지",
      searchRadius: "선호 알바 반경",
      transportModes: "이동 가능 수단",
      maxCommute: "최대 허용 통근 시간",
      registerHome: "거주지 등록",
      pinHelp: "핀을 드래그해서 정확한 위치로 조정할 수 있어요",

      // 에러
      errPermissionDenied: "위치 권한이 필요해요. 설정에서 허용해 주세요.",
      errUnavailable: "위치를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.",
      errTimeout: "위치 확인에 시간이 너무 오래 걸려요.",
      errGeocoding: "주소를 좌표로 변환할 수 없어요.",

      // 공고 리스트 배너
      locationBannerDefault: "위치를 허용하면 우리 집 근처 공고를 먼저 볼 수 있어요",
      noJobsInRadius: "반경 {km}km 안에 공고가 없어요. 반경을 늘려보세요.",
    },
  },

  en: {
    location: {
      permissionTitle: "Find jobs near you",
      permissionBody: "Allow location to see jobs close to your home.\nKnow how many minutes by public transit in advance.",
      permissionAllow: "Allow Location",
      permissionLater: "Later",

      sourceGps: "Based on current location",
      sourceProfile: "Based on registered address",
      sourceDefault: "Default (Seoul)",
      requestLocation: "Use my location",
      refreshLocation: "Refresh",

      radius: "Radius",
      radiusKm: "{km}km",
      visa: "Visa",
      all: "All",
      sortNearest: "Nearest",
      sortLatest: "Latest",
      sortPay: "Highest Pay",

      mapView: "Map View",
      listView: "List View",
      straightDistance: "Straight distance",
      myHome: "My Home",
      nearestStation: "Nearest station",
      walkMin: "{min} min walk",

      modeTransit: "Public Transit",
      modeWalking: "Walking",
      modeCycling: "Cycling",
      modeDriving: "Driving",
      recommended: "Recommended",
      transfers: "{n} transfer(s)",
      noTransfers: "No transfers",
      taxiFee: "Taxi approx ₩{fee}",

      providesHousing: "Housing provided",
      providesShuttle: "Commute Bus",

      homeAddress: "Home Address",
      searchRadius: "Preferred Job Radius",
      transportModes: "Available Transport",
      maxCommute: "Max Commute Time",
      registerHome: "Register Home",
      pinHelp: "Drag the pin to adjust the exact location",

      errPermissionDenied: "Location permission needed. Please allow in settings.",
      errUnavailable: "Cannot find your location. Please try again.",
      errTimeout: "Location is taking too long.",
      errGeocoding: "Cannot convert address to coordinates.",

      locationBannerDefault: "Allow location to see jobs near your home first",
      noJobsInRadius: "No jobs within {km}km. Try expanding the radius.",
    },
  },

  zh: {
    location: {
      permissionTitle: "寻找附近的兼职",
      permissionBody: "允许定位可优先查看离家近的招聘。\n提前了解公共交通需要多少分钟。",
      permissionAllow: "允许定位",
      permissionLater: "稍后",

      sourceGps: "基于当前位置",
      sourceProfile: "基于登记住址",
      sourceDefault: "默认位置(首尔)",
      requestLocation: "使用我的位置",
      refreshLocation: "刷新",

      radius: "半径",
      radiusKm: "{km}公里",
      visa: "签证",
      all: "全部",
      sortNearest: "最近",
      sortLatest: "最新",
      sortPay: "高薪",

      mapView: "地图",
      listView: "列表",
      straightDistance: "直线距离",
      myHome: "我家",
      nearestStation: "最近车站",
      walkMin: "步行{min}分钟",

      modeTransit: "公共交通",
      modeWalking: "步行",
      modeCycling: "自行车",
      modeDriving: "驾车",
      recommended: "推荐",
      transfers: "换乘{n}次",
      noTransfers: "无需换乘",
      taxiFee: "出租车约₩{fee}",

      providesHousing: "提供食宿",
      providesShuttle: "班车",

      homeAddress: "住址",
      searchRadius: "偏好范围",
      transportModes: "可用交通",
      maxCommute: "最长通勤时间",
      registerHome: "登记住址",
      pinHelp: "拖动图钉以调整准确位置",

      errPermissionDenied: "需要位置权限,请在设置中允许。",
      errUnavailable: "无法找到您的位置,请稍后再试。",
      errTimeout: "定位时间过长。",
      errGeocoding: "无法将地址转换为坐标。",

      locationBannerDefault: "允许定位以优先查看家附近的招聘",
      noJobsInRadius: "{km}公里内没有招聘。请扩大半径。",
    },
  },

  vi: {
    location: {
      permissionTitle: "Tìm việc làm gần bạn",
      permissionBody: "Cho phép vị trí để xem công việc gần nhà.\nBiết trước mất bao nhiêu phút đi phương tiện công cộng.",
      permissionAllow: "Cho phép vị trí",
      permissionLater: "Để sau",

      sourceGps: "Dựa trên vị trí hiện tại",
      sourceProfile: "Dựa trên địa chỉ đã đăng ký",
      sourceDefault: "Mặc định (Seoul)",
      requestLocation: "Dùng vị trí của tôi",
      refreshLocation: "Làm mới",

      radius: "Bán kính",
      radiusKm: "{km}km",
      visa: "Visa",
      all: "Tất cả",
      sortNearest: "Gần nhất",
      sortLatest: "Mới nhất",
      sortPay: "Lương cao",

      mapView: "Bản đồ",
      listView: "Danh sách",
      straightDistance: "Khoảng cách thẳng",
      myHome: "Nhà tôi",
      nearestStation: "Ga gần nhất",
      walkMin: "Đi bộ {min} phút",

      modeTransit: "Giao thông công cộng",
      modeWalking: "Đi bộ",
      modeCycling: "Xe đạp",
      modeDriving: "Ô tô",
      recommended: "Khuyến nghị",
      transfers: "Chuyển {n} lần",
      noTransfers: "Không chuyển",
      taxiFee: "Taxi khoảng ₩{fee}",

      providesHousing: "Cung cấp chỗ ở",
      providesShuttle: "Xe đưa đón",

      homeAddress: "Địa chỉ nhà",
      searchRadius: "Bán kính mong muốn",
      transportModes: "Phương tiện khả dụng",
      maxCommute: "Thời gian di chuyển tối đa",
      registerHome: "Đăng ký nhà",
      pinHelp: "Kéo chốt để điều chỉnh vị trí chính xác",

      errPermissionDenied: "Cần quyền vị trí. Vui lòng cho phép trong cài đặt.",
      errUnavailable: "Không thể tìm vị trí của bạn. Vui lòng thử lại.",
      errTimeout: "Định vị quá lâu.",
      errGeocoding: "Không thể chuyển địa chỉ thành tọa độ.",

      locationBannerDefault: "Cho phép vị trí để xem công việc gần nhà trước",
      noJobsInRadius: "Không có việc trong {km}km. Hãy mở rộng bán kính.",
    },
  },

  uz: {
    location: {
      permissionTitle: "Yaqin atrofda ish topish",
      permissionBody: "Joylashuvingizga ruxsat bering va uyingizga yaqin ishlarni birinchi ko'ring.\nIjtimoiy transportda qancha vaqt ketishini oldindan biling.",
      permissionAllow: "Joylashuvga ruxsat",
      permissionLater: "Keyinroq",

      sourceGps: "Hozirgi joylashuv asosida",
      sourceProfile: "Ro'yxatdagi manzil asosida",
      sourceDefault: "Standart (Seul)",
      requestLocation: "Joyimni ishlatish",
      refreshLocation: "Yangilash",

      radius: "Radius",
      radiusKm: "{km}km",
      visa: "Viza",
      all: "Hammasi",
      sortNearest: "Eng yaqin",
      sortLatest: "Eng yangi",
      sortPay: "Yuqori maosh",

      mapView: "Xarita",
      listView: "Ro'yxat",
      straightDistance: "To'g'ri masofa",
      myHome: "Mening uyim",
      nearestStation: "Eng yaqin bekat",
      walkMin: "{min} daqiqa piyoda",

      modeTransit: "Jamoat transporti",
      modeWalking: "Piyoda",
      modeCycling: "Velosiped",
      modeDriving: "Mashina",
      recommended: "Tavsiya etiladi",
      transfers: "{n} marta o'tish",
      noTransfers: "O'tishsiz",
      taxiFee: "Taksi taxminan ₩{fee}",

      providesHousing: "Turar joy beriladi",
      providesShuttle: "Ishga olib borish",

      homeAddress: "Uy manzili",
      searchRadius: "Istalgan radius",
      transportModes: "Mavjud transport",
      maxCommute: "Maksimal yo'l vaqti",
      registerHome: "Uyni ro'yxatdan o'tkazish",
      pinHelp: "Aniq joylashuvni sozlash uchun tugmani torting",

      errPermissionDenied: "Joylashuv ruxsati kerak. Sozlamalarda ruxsat bering.",
      errUnavailable: "Joylashuvingizni topib bo'lmadi. Qayta urinib ko'ring.",
      errTimeout: "Joylashuvni aniqlash juda uzoq davom etmoqda.",
      errGeocoding: "Manzilni koordinatalarga o'zgartirib bo'lmadi.",

      locationBannerDefault: "Uy yaqinidagi ishlarni birinchi ko'rish uchun joylashuvga ruxsat bering",
      noJobsInRadius: "{km}km ichida ish yo'q. Radiusni kengaytiring.",
    },
  },

  mn: {
    location: {
      permissionTitle: "Ойр орчмын ажил хайх",
      permissionBody: "Байршлыг зөвшөөрвөл гэрээс ойр ажлыг эхэнд харна.\nНийтийн тээврээр хэдэн минут болохыг урьдчилан мэдэх боломжтой.",
      permissionAllow: "Байршил зөвшөөрөх",
      permissionLater: "Дараа",

      sourceGps: "Одоогийн байршил",
      sourceProfile: "Бүртгэлтэй хаяг",
      sourceDefault: "Анхдагч (Сөүл)",
      requestLocation: "Миний байршил",
      refreshLocation: "Шинэчлэх",

      radius: "Радиус",
      radiusKm: "{km}км",
      visa: "Виз",
      all: "Бүгд",
      sortNearest: "Хамгийн ойр",
      sortLatest: "Шинэ",
      sortPay: "Өндөр цалин",

      mapView: "Газрын зураг",
      listView: "Жагсаалт",
      straightDistance: "Шулуун зай",
      myHome: "Миний гэр",
      nearestStation: "Хамгийн ойр буудал",
      walkMin: "{min} минут явган",

      modeTransit: "Нийтийн тээвэр",
      modeWalking: "Явган",
      modeCycling: "Дугуй",
      modeDriving: "Машин",
      recommended: "Санал болгох",
      transfers: "{n} шилжилт",
      noTransfers: "Шилжилтгүй",
      taxiFee: "Такси ойролцоогоор ₩{fee}",

      providesHousing: "Байр хоол өгдөг",
      providesShuttle: "Ажилд зөөвөрлөх",

      homeAddress: "Гэрийн хаяг",
      searchRadius: "Хүссэн радиус",
      transportModes: "Боломжит тээвэр",
      maxCommute: "Дээд замын хугацаа",
      registerHome: "Гэр бүртгэх",
      pinHelp: "Нарийн байршлыг тохируулахын тулд зүүг чирнэ үү",

      errPermissionDenied: "Байршлын зөвшөөрөл хэрэгтэй. Тохиргоонд зөвшөөрнө үү.",
      errUnavailable: "Байршлыг олж чадсангүй. Дахин оролдоно уу.",
      errTimeout: "Байршил хэт удаан байна.",
      errGeocoding: "Хаягийг координат руу хөрвүүлж чадсангүй.",

      locationBannerDefault: "Гэрийн ойролцоо ажлыг эхэнд харахын тулд байршлыг зөвшөөрнө үү",
      noJobsInRadius: "{km}км дотор ажил байхгүй байна. Радиусыг өргөжүүлээрэй.",
    },
  },

  ja: {
    location: {
      permissionTitle: "近くのアルバイトを探す",
      permissionBody: "位置情報を許可すると、家から近い求人を優先的に見られます。\n公共交通機関で何分かかるか事前に分かります。",
      permissionAllow: "位置情報を許可",
      permissionLater: "後で",

      sourceGps: "現在地基準",
      sourceProfile: "登録住所基準",
      sourceDefault: "デフォルト(ソウル)",
      requestLocation: "現在地を使用",
      refreshLocation: "更新",

      radius: "範囲",
      radiusKm: "{km}km",
      visa: "ビザ",
      all: "全て",
      sortNearest: "近い順",
      sortLatest: "最新",
      sortPay: "高給順",

      mapView: "地図",
      listView: "リスト",
      straightDistance: "直線距離",
      myHome: "自宅",
      nearestStation: "最寄り駅",
      walkMin: "徒歩{min}分",

      modeTransit: "公共交通",
      modeWalking: "徒歩",
      modeCycling: "自転車",
      modeDriving: "車",
      recommended: "おすすめ",
      transfers: "乗換{n}回",
      noTransfers: "乗換なし",
      taxiFee: "タクシー約₩{fee}",

      providesHousing: "食事付き宿舎",
      providesShuttle: "送迎バス",

      homeAddress: "住所",
      searchRadius: "希望範囲",
      transportModes: "利用可能な交通手段",
      maxCommute: "最大通勤時間",
      registerHome: "住所登録",
      pinHelp: "ピンをドラッグして正確な位置を調整できます",

      errPermissionDenied: "位置情報の権限が必要です。設定で許可してください。",
      errUnavailable: "位置を見つけられません。もう一度お試しください。",
      errTimeout: "位置の確認に時間がかかりすぎています。",
      errGeocoding: "住所を座標に変換できません。",

      locationBannerDefault: "位置情報を許可すると自宅近くの求人を優先表示します",
      noJobsInRadius: "{km}km以内に求人がありません。範囲を広げてみてください。",
    },
  },
};

// ────── 번역 키 매핑 가이드 ──────
//
// 기존 locale 파일 구조가 다음과 같다면:
//
//   export default {
//     nav: { login: "...", ... },
//     jobs: { title: "...", ... },
//     ...
//   }
//
// 다음과 같이 추가:
//
//   export default {
//     nav: { ... },
//     jobs: { ... },
//     location: LOCATION_TRANSLATIONS.ko.location,   // ← 이 줄
//   }
//
// 또는 기존 파일에 직접 복사-붙여넣기해도 됩니다.
