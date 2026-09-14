// 개발용 목업 데이터 — 서버 없이 /monitor 네 페이지를 그대로 띄워 보기 위한 것.
// 앱 번들에는 들어가지 않는다(빌드 진입점은 index.html 하나뿐, monitor-preview.html 은 dev 전용).
import type {
  MonitorQualityBoard,
  MonitorScheduleBoard,
  MonitorSnapshot,
  MonitorSlotState,
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
    { crossCheckId: 9001, inspectionId: 2001, status: "PENDING_APPROVAL", type: "DAY_1", slotLabel: "08:00", productName: "브라켓 A-2201", equipmentName: "1호기", checkerName: "한서준", updatedAt: kstStamp(12) },
    { crossCheckId: 9002, inspectionId: 2030, status: "REJECTED", type: "DAY_1", slotLabel: "08:00", productName: "샤프트 B-77", equipmentName: "5호기", checkerName: "오지현", updatedAt: kstStamp(31) },
    { crossCheckId: 9003, inspectionId: 2012, status: "DRAFT", type: "DAY_3", slotLabel: "12:00", productName: "하우징 커버 HX-9", equipmentName: "3호기", checkerName: "한서준", updatedAt: kstStamp(4) },
    { crossCheckId: 9004, inspectionId: 2051, status: "DRAFT", type: "DAY_2", slotLabel: "10:00", productName: "커넥터 하우징 C-3", equipmentName: "7호기", checkerName: "오지현", updatedAt: kstStamp(2) },
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

const cell = (
  slotOrder: number,
  label: string,
  time: string | null,
  state: MonitorSlotState,
  overdue = false,
  shift: "DAY" | "NIGHT" = "DAY",
) => ({ slotOrder, label, time, shift, state, overdue });

export const schedule: MonitorScheduleBoard = {
  orders: [
    { orderId: 301, productName: "브라켓 A-2201", equipmentName: "1호기", customerName: "현대모비스", shift: "DAY", doneCount: 2, totalCount: 5,
      slots: [cell(1, "08:00", "08:00", "DONE"), cell(2, "10:00", "10:00", "DONE"), cell(3, "12:00", "12:00", "IN_PROGRESS", true), cell(4, "14:00", "14:00", "NOT_STARTED"), cell(5, "16:00", "16:00", "NOT_STARTED")] },
    { orderId: 302, productName: "하우징 커버 HX-9", equipmentName: "3호기", customerName: "만도", shift: "DAY", doneCount: 1, totalCount: 3,
      slots: [cell(1, "08:00", "08:00", "DONE"), cell(2, "12:00", "12:00", "IN_PROGRESS"), cell(3, "16:00", "16:00", "NOT_STARTED")] },
    { orderId: 303, productName: "샤프트 B-77", equipmentName: "5호기", customerName: "현대위아", shift: "NIGHT", doneCount: 1, totalCount: 4,
      slots: [cell(1, "20:00", "20:00", "DONE", false, "NIGHT"), cell(2, "22:00", "22:00", "TERMINATED", false, "NIGHT"), cell(3, "00:00", "00:00", "NOT_STARTED", false, "NIGHT"), cell(4, "02:00", "02:00", "NOT_STARTED", false, "NIGHT")] },
    { orderId: 304, productName: "리테이너 링 R-12", equipmentName: "2호기", customerName: "LS오토모티브", shift: null, doneCount: 3, totalCount: 3,
      slots: [cell(1, "초", null, "DONE"), cell(2, "중", null, "DONE"), cell(3, "종", null, "DONE")] },
    { orderId: 305, productName: "커넥터 하우징 C-3", equipmentName: "7호기", customerName: "현대모비스", shift: "DAY", doneCount: 2, totalCount: 6,
      slots: [cell(1, "07:00", "07:00", "DONE"), cell(2, "09:00", "09:00", "SKIPPED"), cell(3, "11:00", "11:00", "DONE"), cell(4, "13:00", "13:00", "NOT_STARTED", true), cell(5, "15:00", "15:00", "NOT_STARTED"), cell(6, "17:00", "17:00", "NOT_STARTED")] },
    { orderId: 306, productName: "플랜지 C-40", equipmentName: "9호기", customerName: "세종공업", shift: "DAY", doneCount: 0, totalCount: 3,
      slots: [cell(1, "초", null, "INCOMPLETE"), cell(2, "중", null, "IN_PROGRESS"), cell(3, "종", null, "NOT_STARTED")] },
    { orderId: 307, productName: "가이드 바 G-8", equipmentName: "4호기", customerName: "화신", shift: "DAY", doneCount: 1, totalCount: 4,
      slots: [cell(1, "08:00", "08:00", "DONE"), cell(2, "11:00", "11:00", "IN_PROGRESS"), cell(3, "14:00", "14:00", "NOT_STARTED"), cell(4, "17:00", "17:00", "NOT_STARTED")] },
    { orderId: 308, productName: "베어링 캡 BC-2", equipmentName: "6호기", customerName: "만도", shift: "NIGHT", doneCount: 2, totalCount: 4,
      slots: [cell(1, "19:00", "19:00", "DONE", false, "NIGHT"), cell(2, "21:00", "21:00", "DONE", false, "NIGHT"), cell(3, "23:00", "23:00", "NOT_STARTED", false, "NIGHT"), cell(4, "01:00", "01:00", "NOT_STARTED", false, "NIGHT")] },
    { orderId: 309, productName: "스페이서 S-5", equipmentName: "8호기", customerName: "덕양산업", shift: null, doneCount: 0, totalCount: 3,
      slots: [cell(1, "초", null, "IN_PROGRESS"), cell(2, "중", null, "NOT_STARTED"), cell(3, "종", null, "NOT_STARTED")] },
  ],
  summary: { orderCount: 9, totalSlots: 35, doneSlots: 12, overdueSlots: 2 },
};
