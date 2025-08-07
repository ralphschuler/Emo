import { Framebuffer } from "./framebuffer.ts"

// ---- Fast helpers ----
function buildSinLut(len: number, freq: number): Float32Array {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.sin(i * freq);
  return out;
}

// Hue->RGB565 (s=0.9, v=1.0 fest verdrahtet, alles integer-ish)
function hueToRGB565(h01: number): number {
  const h = (h01 - Math.floor(h01) + 1.0) % 1.0; // 0..1
  const i = (h * 6) | 0;
  const f = h * 6 - i;
  const p = 0;                 // v*(1-s) bei v=1,s=0.9 -> 0.1≈0, wir knipsen’s weg für speed
  const q = 1 - 0.9 * f;
  const t = 1 - 0.9 * (1 - f);
  let r=0, g=0, b=0;
  switch (i % 6) {
    case 0: r=1; g=t; b=p; break;
    case 1: r=q; g=1; b=p; break;
    case 2: r=p; g=1; b=t; break;
    case 3: r=p; g=q; b=1; break;
    case 4: r=t; g=p; b=1; break;
    case 5: r=1; g=p; b=q; break;
  }
  // nach 0..255
  const R = (r*255)|0, G = (g*255)|0, B = (b*255)|0;
  // pack RGB565
  return ((R >>> 3) << 11) | ((G >>> 2) << 5) | (B >>> 3);
}

// Hue->XRGB8888
function hueToXRGB8888(h01: number): number {
  const h = (h01 - Math.floor(h01) + 1.0) % 1.0;
  const i = (h * 6) | 0;
  const f = h * 6 - i;
  const q = 1 - 0.9 * f;
  const t = 1 - 0.9 * (1 - f);
  let r=0, g=0, b=0;
  switch (i % 6) {
    case 0: r=1; g=t; b=0; break;
    case 1: r=q; g=1; b=0; break;
    case 2: r=0; g=1; b=t; break;
    case 3: r=0; g=q; b=1; break;
    case 4: r=t; g=0; b=1; break;
    case 5: r=1; g=0; b=q; break;
  }
  const R = (r*255)|0, G = (g*255)|0, B = (b*255)|0;
  return (R << 16) | (G << 8) | B; // XRGB
}

async function main() {
  const det = Framebuffer.detect("/dev/fb0");
  const fb = new Framebuffer("/dev/fb0", det.width, det.height, det.depth);
  const { width: W, height: H } = fb;

  // Optional: Rendere in halber Auflösung und skaliere 2x2 (massiver Speed-Boost)
  const renderScale = 1; // auf 2 setzen für deutlich mehr FPS
  const RW = Math.max(1, Math.floor(W / renderScale));
  const RH = Math.max(1, Math.floor(H / renderScale));

  // Precompute LUTs (keine trig im Loop)
  const scaleX = 0.020, scaleY = 0.028;
  const cx = RW * 0.5, cy = RH * 0.5;
  const sinX = buildSinLut(RW, 2.3 * scaleX);
  const sinY = buildSinLut(RH, 1.9 * scaleY);
  const sinXYx = buildSinLut(RW, 1.2 * scaleX);
  const sinXYy = buildSinLut(RH, 1.4 * scaleY);

  // Framebuffer-Backbuffer als TypedArray abbilden
  const isRGB565 = fb.depth === 2;
  const isXRGB32 = fb.depth === 4 && fb["format"] !== "ARGB8888";
  const bufU16 = isRGB565 ? new Uint16Array((fb as any).back.buffer) : null;
  const bufU32 = !isRGB565 ? new Uint32Array((fb as any).back.buffer) : null;

  // FPS-Messung
  let lastTime = performance.now();
  let frames = 0;
  let fpsShownAt = lastTime;

  let t = 0;
  let running = true;
  process.on("SIGINT", () => { running = false; console.log("\nStopping…"); });

  const loop = () => {
    if (!running) { fb.close(); return; }
    const t1 = t * 0.05, t2 = t * 0.045, t3 = t * 0.037;

    if (renderScale === 1) {
      // 1:1 Rendern direkt in Backbuffer
      if (isRGB565) {
        const stridePx = fb.stride >> 1;
        for (let y=0; y<RH; y++) {
          const yy = y - cy;
          const rowOff = y * stridePx;
          const sy1 = sinY[y];
          const sy2 = sinXYy[y];
          for (let x=0; x<RW; x++) {
            const v = (Math.sin((x - cx) * 0 + t2) + sy1 * Math.cos(t3) + (sinXYx[x] + sy2) * Math.sin(t1)) / 3;
            const hue = v * 0.5 + 0.5;
            bufU16![rowOff + x] = hueToRGB565(hue);
          }
        }
      } else {
        const stridePx = fb.stride >> 2;
        for (let y=0; y<RH; y++) {
          const yy = y - cy;
          const rowOff = y * stridePx;
          const sy1 = sinY[y];
          const sy2 = sinXYy[y];
          for (let x=0; x<RW; x++) {
            const v = (Math.sin((x - cx) * 0 + t2) + sy1 * Math.cos(t3) + (sinXYx[x] + sy2) * Math.sin(t1)) / 3;
            const hue = v * 0.5 + 0.5;
            bufU32![rowOff + x] = hueToXRGB8888(hue);
          }
        }
      }
    } else {
      // Low-Res rendern und 2x2 ausgeben (Nearest)
      const tmp = isRGB565 ? new Uint16Array(RW * RH) : new Uint32Array(RW * RH);
      for (let y=0; y<RH; y++) {
        const sy1 = sinY[y];
        const sy2 = sinXYy[y];
        for (let x=0; x<RW; x++) {
          const v = (Math.sin((x - cx) * 0 + t2) + sy1 * Math.cos(t3) + (sinXYx[x] + sy2) * Math.sin(t1)) / 3;
          const hue = v * 0.5 + 0.5;
          tmp[y*RW + x] = isRGB565 ? hueToRGB565(hue) : hueToXRGB8888(hue);
        }
      }
      // Upscale
      if (isRGB565) {
        const stridePx = fb.stride >> 1;
        for (let y=0; y<RH; y++) {
          const y2 = y * 2;
          const rowA = y2 * stridePx;
          const rowB = (y2 + 1) * stridePx;
          let dstA = rowA, dstB = rowB;
          let i = y*RW;
          for (let x=0; x<RW; x++, i++) {
            const p = tmp[i];
            bufU16![dstA++] = p; bufU16![dstA++] = p;
            bufU16![dstB++] = p; bufU16![dstB++] = p;
          }
        }
      } else {
        const stridePx = fb.stride >> 2;
        for (let y=0; y<RH; y++) {
          const y2 = y * 2;
          const rowA = y2 * stridePx;
          const rowB = (y2 + 1) * stridePx;
          let dstA = rowA, dstB = rowB;
          let i = y*RW;
          for (let x=0; x<RW; x++, i++) {
            const p = tmp[i];
            bufU32![dstA++] = p; bufU32![dstA++] = p;
            bufU32![dstB++] = p; bufU32![dstB++] = p;
          }
        }
      }
    }

    fb.present();
    t++;

    // FPS
    frames++;
    const now = performance.now();
    if (now - fpsShownAt >= 1000) {
      const fps = (frames * 1000) / (now - fpsShownAt);
      process.stdout.write(`\rFPS: ${fps.toFixed(1)}   `);
      frames = 0;
      fpsShownAt = now;
    }

    // kein setTimeout: sofort weiter → maximale Geschwindigkeit
    setImmediate(loop);
  };

  // Start
  // schwarz füllen:
  (fb as any).back.fill(0);
  loop();
}

main().catch(e => { console.error(e); process.exit(1); });
