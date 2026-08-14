// 앱 아이콘·스플래시 생성. `npm run assets` 로 실행한다.
//
// 원본은 public/app-icon.png 하나뿐이고 "흰 라운드 사각 배경 + 보라 육각형"
// 구조다. 안드로이드 적응형 아이콘은 런처가 원형/스퀘어클로 잘라내므로,
// 육각형만 뽑아 안전 영역 안에 넣어야 모서리가 깎이지 않는다.
//
// 로고를 바꾸면 public/app-icon.png 만 교체하고 이 스크립트를 다시 돌리면 된다.
// (다만 CROP 값은 그 이미지의 로고 위치에 맞춰 다시 재야 한다.)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const SRC = "public/app-icon.png";
const OUT = "assets";
const RES = "android/app/src/main/res";

// public/app-icon.png 의 로고 잉크 영역(90,72)~(420,439) 을 감싸는 정사각 크롭.
// 잉크가 캔버스 정중앙(255.5)에 있어 대칭으로 잘라도 치우치지 않는다.
const CROP = { left: 72, top: 72, width: 368, height: 368 };

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** 로고를 지정 캔버스 중앙에 지정 비율로 올린 PNG 버퍼. */
async function centeredLogo(canvas, ratio, background = TRANSPARENT) {
  const logo = Math.round(canvas * ratio);
  const art = await sharp(SRC)
    .extract(CROP)
    .resize(logo, logo, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  return sharp({
    create: { width: canvas, height: canvas, channels: 4, background },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toBuffer();
}

// --- 1. 생성기에 넣을 원본들 ---

await mkdir(OUT, { recursive: true });

// 적응형 아이콘 전경 — 안전 영역은 중앙 66.6% 뿐이라 로고를 62% 로 넣는다.
// 크롭에 딸려온 흰 여백은 흰 배경 레이어와 겹쳐 보이지 않는다.
await sharp(await centeredLogo(1024, 0.62)).toFile(`${OUT}/icon-foreground.png`);

// 적응형 아이콘 배경 — 원본 디자인이 흰 바탕이라 흰색 단색.
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: WHITE },
})
  .png()
  .toFile(`${OUT}/icon-background.png`);

// 레거시(마스크 없는) 아이콘 — 원본 라운드 사각 디자인을 그대로 쓴다.
await sharp(SRC)
  .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(`${OUT}/icon-only.png`);

// 스플래시 — 흰 바탕에 로고. 다크 모드도 같은 흰 바탕을 쓴다. 원본 육각형의
// 안쪽이 흰색이라 어두운 바탕에 올리면 흰 덩어리로 보이기 때문이다.
const splash = await centeredLogo(2732, 0.22, WHITE);
await sharp(splash).toFile(`${OUT}/splash.png`);
await sharp(splash).toFile(`${OUT}/splash-dark.png`);

// PWA maskable 아이콘 — 전면 출혈 아이콘을 maskable 로 쓰면 안드로이드 홈
// 화면에서 모서리가 잘리므로, 여백 있는 별도 파일로 분리한다.
// (public/manifest.webmanifest 의 purpose "maskable" 항목)
await sharp(await centeredLogo(512, 0.62, WHITE)).toFile(
  "public/app-icon-maskable.png",
);

// --- 2. 안드로이드 리소스 생성 ---

execSync("npx capacitor-assets generate --android", { stdio: "inherit" });

// --- 3. 적응형 아이콘 XML 교정 ---
//
// 생성기는 배경 레이어에도 inset 16.7% 를 넣는데, 런처마다 마스크 크기가
// 조금씩 달라서 배경을 안쪽으로 밀면 마스크를 크게 잡는 런처에서 가장자리가
// 비어 보인다. 배경은 108dp 캔버스를 꽉 채우고 전경만 안전 영역에 둔다.
const ADAPTIVE_ICON = `<?xml version="1.0" encoding="utf-8"?>
<!-- scripts/generate-app-assets.mjs 가 생성한다. 직접 고치지 말 것. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

for (const name of ["ic_launcher", "ic_launcher_round"]) {
  await writeFile(`${RES}/mipmap-anydpi-v26/${name}.xml`, ADAPTIVE_ICON);
}

console.log("\n아이콘·스플래시 생성 완료 (적응형 아이콘 XML 교정 포함)");
