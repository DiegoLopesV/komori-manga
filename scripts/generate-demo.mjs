// Tiny procedural fixtures: no AI service, no external artwork, no generation fees.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
function wav(name, seconds, frequency, amplitude) {
  const rate = 16000,
    count = rate * seconds,
    buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const envelope = Math.sin((Math.PI * i) / count) ** 2;
    buffer.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * frequency * i) / rate) * envelope * amplitude * 32767),
      44 + i * 2,
    );
  }
  writeFileSync(`public/demo/${name}.wav`, buffer);
}
wav('chime', 0.3, 660, 0.08);
wav('ambience', 4, 110, 0.015);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const svg = readFileSync('public/demo/city.svg', 'utf8');
  const bytes = await page.evaluate(async (svg) => {
    const image = new Image();
    image.src = 'data:image/svg+xml;base64,' + btoa(svg);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 366;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 100000,
    });
    const chunks = [];
    const finished = new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () =>
        resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
    });
    recorder.start();
    let frame = 0;
    const timer = setInterval(() => {
      ctx.drawImage(image, 0, 0, 366, 170);
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const x = (i * 31 + frame * 2) % 380,
          y = (i * 29 + frame * 9) % 190;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 14);
        ctx.stroke();
      }
      frame++;
    }, 80);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    clearInterval(timer);
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    return finished;
  }, svg);
  writeFileSync('public/demo/rain.webm', Buffer.from(bytes));
  console.log('Generated compact audio/video test fixtures');
} finally {
  await browser.close();
}
