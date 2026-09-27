#!/usr/bin/env node
/**
 * 교재 문항 은행(평문, 저장소 밖)을 AES-256-GCM으로 암호화해 data/bank.enc.json, data/img/*.bin 을 만든다.
 *  - 평문 입력: $CBT_BANK_DIR (기본 /workspace/cbt-materials/kukshi/bank) 의 bank.json + img/*.jpg
 *  - 키: PBKDF2(SHA-256, ITER회, salt) ← 비밀번호 ($CBT_SITE_PASSWORD, 없으면 box-secrets.json)
 *  - salt 는 기존 data/bank.enc.json 에서 재사용(기억된 키가 업데이트 후에도 유효하도록). IV 는 매번 새로.
 *  - 평문 문항·이미지는 절대 저장소에 쓰지 않는다. 비밀번호는 출력하지 않는다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const BANK_DIR = process.env.CBT_BANK_DIR || '/workspace/cbt-materials/kukshi/bank';
const ITER = 310000;
const BANK_VERSION = process.env.CBT_BANK_VERSION || 'kukshi-v1';

function findKey(obj, name) {
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj[name] === 'string' && obj[name]) return obj[name];
  for (const v of Object.values(obj)) {
    const r = findKey(v, name);
    if (r) return r;
  }
  return null;
}
function getPassword() {
  if (process.env.CBT_SITE_PASSWORD) return process.env.CBT_SITE_PASSWORD;
  try {
    const j = JSON.parse(fs.readFileSync('/home/box/agent-data/box-secrets.json', 'utf8'));
    return findKey(j, 'CBT_SITE_PASSWORD');
  } catch (_) {
    return null;
  }
}

const pw = getPassword();
if (!pw) {
  console.error('CBT_SITE_PASSWORD missing');
  process.exit(2);
}

const encPath = path.join(ROOT, 'data', 'bank.enc.json');
let salt;
try {
  const prev = JSON.parse(fs.readFileSync(encPath, 'utf8'));
  if (prev.salt && prev.iter === ITER) salt = Buffer.from(prev.salt, 'base64');
} catch (_) {}
if (!salt || process.env.CBT_NEW_SALT) salt = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(pw, salt, ITER, 32, 'sha256');

function enc(buf) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]);
  return { iv, ct };
}

const bank = JSON.parse(fs.readFileSync(path.join(BANK_DIR, 'bank.json'), 'utf8'));
const imgDir = path.join(BANK_DIR, 'img');
const outImg = path.join(ROOT, 'data', 'img');
fs.rmSync(outImg, { recursive: true, force: true });
fs.mkdirSync(outImg, { recursive: true });

const images = {};
const questions = {};
let total = 0;
for (const [sid, arr] of Object.entries(bank)) {
  questions[sid] = arr.map((q) => {
    const o = {};
    for (const [k, v] of Object.entries(q)) if (!k.startsWith('_')) o[k] = v;
    if (o.image && o.image.startsWith('img:')) {
      const name = o.image.slice(4);
      const file = crypto.createHmac('sha256', key).update('img:' + name).digest('hex').slice(0, 20) + '.bin';
      const { iv, ct } = enc(fs.readFileSync(path.join(imgDir, name)));
      fs.writeFileSync(path.join(outImg, file), Buffer.concat([iv, ct]));
      images[name] = file;
    }
    return o;
  });
  total += arr.length;
}
const payload = { version: BANK_VERSION, generatedAt: new Date().toISOString(), questions, images };
const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 });
const { iv, ct } = enc(gz);
fs.writeFileSync(
  encPath,
  JSON.stringify({
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: ITER,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    alg: 'AES-256-GCM',
    zip: 'gzip',
    ct: ct.toString('base64'),
  })
);
console.log('encrypted', total, 'items,', Object.keys(images).length, 'images; bank.enc.json', (fs.statSync(encPath).size / 1e6).toFixed(2), 'MB');
for (const [sid, arr] of Object.entries(questions)) console.log(' ', sid, arr.length);
