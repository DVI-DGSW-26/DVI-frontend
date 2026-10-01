// 개발용 목업 데이터 — 서버 없이 /monitor 네 페이지를 그대로 띄워 보기 위한 것.
// 앱 번들에는 들어가지 않는다(빌드 진입점은 index.html 하나뿐, monitor-preview.html 은 dev 전용).
import type {
  MonitorQualityBoard,
  MonitorSnapshot,
} from "../features/monitor/type/types";

/** 서버는 오프셋 없는 KST 표기를 내려준다 — 목업도 같은 모양으로 만든다. */
export function kstStamp(minutesAgo: number): string {
  const t = new Date(Date.now() + 9 * 3600_000 - minutesAgo * 60_000);
  return t.toISOString().slice(0, 23);
}

export const W = [
  "김철수", "이영희", "박민수", "최지훈", "정수민",
  "강도현", "윤서아", "임태경", "노하늘", "배준호",
];

export const snapshot: MonitorSnapshot = {
  inProgressInspections: [
    { inspectionId: 101, type: "DAY_3", slotLabel: "12:00", productName: "브라켓 A-2201", equipmentName: "1호기", customerName: "현대모비스", workerName: W[0], updatedAt: kstStamp(2) },
    { inspectionId: 102, type: "DAY_2", slotLabel: "10:00", productName: "하우징 커버 HX-9", equipmentName: "3호기", customerName: "만도", workerName: W[1], updatedAt: kstStamp(7) },
    { inspectionId: 103, type: "DAY_4", slotLabel: "종", productName: "샤프트 B-77", equipmentName: "5호기", customerName: "현대위아", workerName: W[2], updatedAt: kstStamp(15) },
    { inspectionId: 104, type: "DAY_1", slotLabel: "초", productName: "리테이너 링 R-12", equipmentName: "2호기", customerName: "LS오토모티브", workerName: W[3], updatedAt: kstStamp(1) },
    { inspectionId: 105, type: "DAY_3", slotLabel: "12:00", productName: "커넥터 하우징 C-3", equipmentName: "7호기", customerName: "현대모비스", workerName: W[4], updatedAt: kstStamp(23) },
    { inspectionId: 106, type: "DAY_2", slotLabel: "중", productName: "플랜지 C-40", equipmentName: "9호기", customerName: "세종공업", workerName: W[5], updatedAt: kstStamp(4) },
    { inspectionId: 107, type: "DAY_1", slotLabel: "08:00", productName: "가이드 바 G-8", equipmentName: "4호기", customerName: "화신", workerName: W[6], updatedAt: kstStamp(11) },
    { inspectionId: 108, type: "DAY_2", slotLabel: "10:00", productName: "베어링 캡 BC-2", equipmentName: "6호기", customerName: "만도", workerName: W[7], updatedAt: kstStamp(33) },
    { inspectionId: 109, type: "DAY_1", slotLabel: "초", productName: "스페이서 S-5", equipmentName: "8호기", customerName: "덕양산업", workerName: W[8], updatedAt: kstStamp(6) },
  ],
  crossChecks: [
    { crossCheckId: 9001, inspectionId: 2001, status: "PENDING_APPROVAL", type: "DAY_1", typeLabel: "08:00", productName: "브라켓 A-2201", equipmentName: "1호기", checkerName: "한서준", rejectReason: null, updatedAt: kstStamp(12) },
    { crossCheckId: 9002, inspectionId: 2030, status: "REJECTED", type: "DAY_1", typeLabel: "08:00", productName: "샤프트 B-77", equipmentName: "5호기", checkerName: "오지현", rejectReason: "DIM1 NG 확인됨 — 자주검사 재측정 요청", updatedAt: kstStamp(31) },
    { crossCheckId: 9003, inspectionId: 2012, status: "DRAFT", type: "DAY_3", typeLabel: "12:00", productName: "하우징 커버 HX-9", equipmentName: "3호기", checkerName: "한서준", rejectReason: null, updatedAt: kstStamp(4) },
    { crossCheckId: 9004, inspectionId: 2051, status: "DRAFT", type: "DAY_2", typeLabel: "10:00", productName: "커넥터 하우징 C-3", equipmentName: "7호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(2) },

    // 끝난 순회검사(오늘자)도 스냅샷에 온다 — 시점별로 누가 검사했는지를 칸에 적기
    // 위해서다. 예전에는 이 이름을 GET /cross-check/assigned 로 따로 받았다.
    { crossCheckId: 8000, inspectionId: 2000, status: "COMPLETED", type: "DAY_1", typeLabel: "08:00", productName: "브라켓 A-2201", equipmentName: "1호기", checkerName: "한서준", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8010, inspectionId: 2010, status: "COMPLETED", type: "DAY_1", typeLabel: "08:00", productName: "하우징 커버 HX-9", equipmentName: "3호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8020, inspectionId: 2020, status: "APPROVED", type: "DAY_1", typeLabel: "08:00", productName: "샤프트 B-77", equipmentName: "5호기", checkerName: "문가영", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8022, inspectionId: 2022, status: "COMPLETED", type: "DAY_3", typeLabel: "12:00", productName: "샤프트 B-77", equipmentName: "5호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(90) },
    { crossCheckId: 8031, inspectionId: 2031, status: "COMPLETED", type: "DAY_2", typeLabel: "10:00", productName: "리테이너 링 R-12", equipmentName: "2호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(65) },
    { crossCheckId: 8040, inspectionId: 2040, status: "APPROVED", type: "DAY_1", typeLabel: "08:00", productName: "커넥터 하우징 C-3", equipmentName: "7호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8070, inspectionId: 2070, status: "COMPLETED", type: "DAY_1", typeLabel: "08:00", productName: "베어링 캡 BC-2", equipmentName: "6호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8090, inspectionId: 2090, status: "COMPLETED", type: "DAY_1", typeLabel: "08:00", productName: "커버 플레이트 CP-1", equipmentName: "10호기", checkerName: "한서준", rejectReason: null, updatedAt: kstStamp(40) },
    { crossCheckId: 8091, inspectionId: 2091, status: "APPROVED", type: "DAY_2", typeLabel: "10:00", productName: "커버 플레이트 CP-1", equipmentName: "10호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(65) },
    { crossCheckId: 8092, inspectionId: 2092, status: "COMPLETED", type: "DAY_3", typeLabel: "12:00", productName: "커버 플레이트 CP-1", equipmentName: "10호기", checkerName: "문가영", rejectReason: null, updatedAt: kstStamp(90) },
    { crossCheckId: 8093, inspectionId: 2093, status: "COMPLETED", type: "DAY_4", typeLabel: "14:00", productName: "커버 플레이트 CP-1", equipmentName: "10호기", checkerName: "한서준", rejectReason: null, updatedAt: kstStamp(115) },
    { crossCheckId: 8094, inspectionId: 2094, status: "APPROVED", type: "DAY_5", typeLabel: "16:00", productName: "커버 플레이트 CP-1", equipmentName: "10호기", checkerName: "오지현", rejectReason: null, updatedAt: kstStamp(140) },
  ],
  workers: W.map((name, i) => ({
    userId: i + 1,
    name,
    workType: null,
    online: i % 4 !== 2,
    inProgressCount: i < 9 ? 1 : 0,
  })),
  summary: { inProgressInspectionCount: 9, crossCheckCount: 4, onlineWorkerCount: 7, totalWorkerCount: 10 },
};

export const quality: MonitorQualityBoard = {
  defects: [
    { inspectionId: 101, productName: "브라켓 A-2201", equipmentName: "1호기", workerName: W[0], slotLabel: "12:00", defectType: "DIMENSION", dimName: "전장", measuredValue: "10.42", allowedRange: "9.90 ~ 10.10", detectedAt: kstStamp(3) },
    { inspectionId: 102, productName: "하우징 커버 HX-9", equipmentName: "3호기", workerName: W[1], slotLabel: "10:00", defectType: "APPEARANCE", dimName: null, measuredValue: null, allowedRange: null, detectedAt: kstStamp(9) },
    { inspectionId: 103, productName: "샤프트 B-77", equipmentName: "5호기", workerName: W[2], slotLabel: "종", defectType: "PASS_FAIL", dimName: "나사부 상태", measuredValue: null, allowedRange: null, detectedAt: kstStamp(18) },
    { inspectionId: 104, productName: "리테이너 링 R-12", equipmentName: "2호기", workerName: W[3], slotLabel: "초", defectType: "DIMENSION", dimName: "내경", measuredValue: "24.88", allowedRange: "24.95 ~ 25.05", detectedAt: kstStamp(26) },
    { inspectionId: 105, productName: "커넥터 하우징 C-3", equipmentName: "7호기", workerName: W[4], slotLabel: "12:00", defectType: "DIMENSION", dimName: "두께", measuredValue: "3.51", allowedRange: "3.40 ~ 3.50", detectedAt: kstStamp(41) },
    { inspectionId: 106, productName: "플랜지 C-40", equipmentName: "9호기", workerName: W[5], slotLabel: "중", defectType: "DIMENSION", dimName: "폭", measuredValue: "48.2", allowedRange: "47.80 ~ 48.10", detectedAt: kstStamp(52) },
    { inspectionId: 107, productName: "가이드 바 G-8", equipmentName: "4호기", workerName: W[6], slotLabel: "08:00", defectType: "APPEARANCE", dimName: null, measuredValue: null, allowedRange: null, detectedAt: kstStamp(63) },
    { inspectionId: 108, productName: "베어링 캡 BC-2", equipmentName: "6호기", workerName: W[7], slotLabel: "10:00", defectType: "DIMENSION", dimName: "높이", measuredValue: "61.55", allowedRange: "61.80 ~ 62.20", detectedAt: kstStamp(75) },
    { inspectionId: 101, productName: "브라켓 A-2201", equipmentName: "1호기", workerName: W[0], slotLabel: "10:00", defectType: "PASS_FAIL", dimName: "버 제거 상태", measuredValue: null, allowedRange: null, detectedAt: kstStamp(88) },
    { inspectionId: 109, productName: "스페이서 S-5", equipmentName: "8호기", workerName: W[8], slotLabel: "초", defectType: "DIMENSION", dimName: "모따기", measuredValue: "1.34", allowedRange: "1.10 ~ 1.30", detectedAt: kstStamp(96) },
    { inspectionId: 102, productName: "하우징 커버 HX-9", equipmentName: "3호기", workerName: W[1], slotLabel: "초", defectType: "DIMENSION", dimName: "홀 피치", measuredValue: "18.31", allowedRange: "18.40 ~ 18.60", detectedAt: kstStamp(110) },
    { inspectionId: 105, productName: "커넥터 하우징 C-3", equipmentName: "7호기", workerName: W[4], slotLabel: "08:00", defectType: "APPEARANCE", dimName: null, measuredValue: null, allowedRange: null, detectedAt: kstStamp(131) },
  ],
  terminated: [
    { inspectionId: 150, productName: "샤프트 B-77", equipmentName: "5호기", workerName: W[2], reason: "치수 불량 반복 — 금형 점검 요청", at: kstStamp(35) },
    { inspectionId: 151, productName: "리테이너 링 R-12", equipmentName: "2호기", workerName: W[3], reason: "소재 이물", at: kstStamp(120) },
    { inspectionId: 152, productName: "가이드 바 G-8", equipmentName: "4호기", workerName: W[6], reason: "설비 이상 — 스핀들 진동", at: kstStamp(205) },
  ],
  summary: { inspectionsToday: 46, completedToday: 28, ngInspectionCount: 8, defectItemCount: 12 },
};
