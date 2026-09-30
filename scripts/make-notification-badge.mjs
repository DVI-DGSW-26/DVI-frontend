// 안드로이드 상태바용 배지 아이콘 생성.
// 배지는 알파 채널만 쓰여 흰 실루엣으로 렌더링된다. 색을 넣어도 의미가 없고,
// 불투명 배경이 있으면 통째로 흰 사각형이 된다. 그래서 로고의 돋보기 외곽선만
// 투명 배경 위에 흰색으로 그린다. (public/favicon.svg 의 지오메트리 사용)
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 96;
const SS = 4; // 픽셀당 4x4 슈퍼샘플링 (안티에일리어싱)

// favicon.svg 좌표계(512) 기준 도형
const C = 256, RING_R = 195, HALF = 16.5;
const H1 = { x: 369, y: 369 }, H2 = { x: 453, y: 453 };

// 그려지는 영역: 링 바깥 + 손잡이 끝
const MIN = C - RING_R - HALF;          // 44.5
const MAX = H2.x + HALF;                // 469.5
const PAD = 5;
const scale = (SIZE - PAD * 2) / (MAX - MIN);

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function inside(sx, sy) {
  if (Math.abs(Math.hypot(sx - C, sy - C) - RING_R) <= HALF) return true;   // 링
  return distToSegment(sx, sy, H1, H2) <= HALF;                             // 손잡이
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0; // 필터 타입 none
  for (let x = 0; x < SIZE; x++) {
    let hit = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const srcX = (x + (sx + 0.5) / SS - PAD) / scale + MIN;
        const srcY = (y + (sy + 0.5) / SS - PAD) / scale + MIN;
        if (inside(srcX, srcY)) hit++;
      }
    }
    const a = Math.round((hit / (SS * SS)) * 255);
    raw[o++] = 255; raw[o++] = 255; raw[o++] = 255; raw[o++] = a;
  }
}

const T = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  T[n] = c >>> 0;
}
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const byte of b) c = T[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(process.argv[2], png);
console.log(`생성: ${process.argv[2]} (${SIZE}x${SIZE}, ${png.length} bytes)`);
