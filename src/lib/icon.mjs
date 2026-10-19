// Pack icon: a werewolf howling at the full moon above a pine forest, drawn at 32x32 and scaled up.
import { PNG } from 'pngjs';
import { hex, mix } from './texture.mjs';

export function packIcon(scale = 8) {
  const N = 32;
  const px = Array.from({ length: N }, () => new Array(N));
  const sky = [hex('#070a1c'), hex('#1b2350'), hex('#3a3f78')];
  for (let y = 0; y < N; y++) {
    const t = y / 26;
    const c = t < 0.6 ? mix(sky[0], sky[1], t / 0.6) : mix(sky[1], sky[2], (t - 0.6) / 0.4);
    for (let x = 0; x < N; x++) px[y][x] = c;
  }
  // Stars
  for (const [x, y] of [[2, 2], [6, 5], [11, 1], [4, 11], [14, 7], [28, 15], [9, 13], [30, 2], [1, 17]]) px[y][x] = hex('#dfe6ff');
  // Full moon with a few craters
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 21.5, y - 9.5);
    if (d < 8) px[y][x] = mix(hex('#fffbe8'), hex('#e8dca8'), d / 8);
    else if (d < 9.5) px[y][x] = mix(px[y][x], hex('#8a8fc0'), 0.5);
  }
  for (const [x, y] of [[19, 7], [24, 12], [23, 6], [18, 12]]) px[y][x] = hex('#d6c98e');

  const dark = hex('#0b0a12');
  const fill = (x0, y0, x1, y1, c = dark) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < N && x >= 0 && x < N) px[y][x] = c; };
  // Pine forest: triangles along the bottom.
  const pine = (cx, top, h) => { for (let k = 0; k < h; k++) fill(cx - Math.floor(k / 2), top + k, cx + Math.floor(k / 2), top + k, hex('#10162a')); };
  pine(2, 18, 12); pine(8, 21, 9); pine(29, 19, 11); pine(13, 23, 7);
  fill(0, 28, 31, 31, hex('#0d1220'));
  // Werewolf in silhouette against the moon, head thrown back.
  fill(17, 17, 22, 23); // chest, hunched
  fill(18, 24, 21, 26); // hips
  fill(18, 27, 18, 31); fill(21, 27, 22, 31); fill(17, 31, 18, 31); fill(21, 31, 23, 31); // legs
  fill(16, 18, 16, 25); fill(15, 25, 16, 26); // right arm
  fill(23, 18, 24, 21); fill(25, 16, 25, 18); // left arm raised
  fill(19, 14, 21, 16); fill(20, 11, 22, 14); fill(22, 9, 23, 11); fill(24, 8, 24, 9); // neck, head and snout up
  fill(19, 11, 19, 12); // ear
  fill(23, 24, 25, 25); fill(26, 25, 26, 26); // tail
  px[12][21] = hex('#ffd23a'); // eye

  const png = new PNG({ width: N * scale, height: N * scale });
  for (let y = 0; y < N * scale; y++) for (let x = 0; x < N * scale; x++) {
    png.data.set(px[Math.floor(y / scale)][Math.floor(x / scale)], (y * N * scale + x) * 4);
  }
  return PNG.sync.write(png);
}
