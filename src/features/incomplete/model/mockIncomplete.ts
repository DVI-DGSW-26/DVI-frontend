import type { Incomplete } from "../type/types";

export const mockIncomplete: Incomplete[] = [
  {
    inspectionId: 1,
    orderId: 101,
    type: "DAY_1",
    typeLabel: "1일차",
    inspectionTime: "09:30:00",
    product: {
      id: 1,
      name: "센서 모듈 A",
      code: "SM-A-001",
      process: "INOUT",
      sketchUrl: "",
    },
    equipment: {
      id: 1,
      name: "검사장비 #1",
      process: "INOUT",
    },
    worker: {
      id: 11,
      name: "김민수",
    },
    incompleteReason: "치수 불량",
    createdAt: "2026-04-28T09:35:00.000Z",
  },
  {
    inspectionId: 2,
    orderId: 102,
    type: "DAY_2",
    typeLabel: "2일차",
    inspectionTime: "11:00:00",
    product: {
      id: 2,
      name: "베어링 B",
      code: "BR-B-014",
      process: "INOUT",
      sketchUrl: "",
    },
    equipment: {
      id: 2,
      name: "검사장비 #2",
      process: "INOUT",
    },
    worker: {
      id: 12,
      name: "이지영",
    },
    incompleteReason: "표면 스크래치 발견",
    createdAt: "2026-04-28T11:08:00.000Z",
  },
  {
    inspectionId: 3,
    orderId: 103,
    type: "DAY_3",
    typeLabel: "3일차",
    inspectionTime: "14:20:00",
    product: {
      id: 3,
      name: "기어 C",
      code: "GR-C-220",
      process: "INOUT",
      sketchUrl: "",
    },
    equipment: {
      id: 3,
      name: "검사장비 #3",
      process: "INOUT",
    },
    worker: {
      id: 13,
      name: "박준호",
    },
    incompleteReason: "재질 검사 미통과",
    createdAt: "2026-04-27T14:25:00.000Z",
  },
  {
    inspectionId: 4,
    orderId: 104,
    type: "DAY_1",
    typeLabel: "1일차",
    inspectionTime: "16:05:00",
    product: {
      id: 4,
      name: "샤프트 D",
      code: "SF-D-077",
      process: "INOUT",
      sketchUrl: "",
    },
    equipment: {
      id: 1,
      name: "검사장비 #1",
      process: "INOUT",
    },
    worker: {
      id: 14,
      name: "최서연",
    },
    incompleteReason: "공차 범위 초과",
    createdAt: "2026-04-27T16:10:00.000Z",
  },
];
