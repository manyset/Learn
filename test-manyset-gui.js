const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('@playwright/test');

const EXE = 'E:\\NBM\\_ManySet\\MS-BuildGUI\\target\\release\\manyset.exe';

(async () => {
  // minimal msLib next to the exe so the msLib copy step succeeds
  const mslib = path.join('E:\\NBM\\_ManySet\\MS-BuildGUI\\target\\RunTime\\msLib');
  fs.mkdirSync(mslib, { recursive: true });
  if (!fs.existsSync(path.join(mslib, 'GlobalConfig.json'))) fs.writeFileSync(path.join(mslib, 'GlobalConfig.json'), '{}');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manyset-gui-'));
  fs.writeFileSync(path.join(root, 'app.js'), 'function hi(){ return "hello"; }');

  const child = spawn(EXE, [], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '', url = null;
  child.stdout.on('data', d => { out += d; const m = out.match(/GUI opened: (http:\/\/\S+)/); if (m && !url) url = m[1]; });
  child.stderr.on('data', d => { err += d; });

  for (let i = 0; i < 200 && !url; i++) await new Promise(r => setTimeout(r, 100));
  if (!url) { console.error('FAIL: no GUI URL'); console.error('OUT:', out); console.error('ERR:', err); child.kill(); process.exit(1); }
  console.log('GUI URL:', url);

  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); }
  catch (e) { console.log('chrome channel failed, trying msedge:', e.message); browser = await chromium.launch({ channel: 'msedge' }); }
  const page = await browser.newPage();
  await page.goto(url);
  await page.check('input[name="mode"][value="release"]');
  await page.click('button[type="submit"]');

  await new Promise(resolve => child.on('exit', resolve));
  await browser.close();

  console.log('=== STDERR ===');
  console.log(err);
  console.log('=== STDOUT ===');
  console.log(out);

  const modeOk = /confirm mode: Release/.test(err);
  const buildOk = /Mode: Release/.test(out);
  const copiedOk = /Files copied: 1/.test(out);
  console.log('modeOk=' + modeOk + ' buildOk=' + buildOk + ' copiedOk=' + copiedOk);
  process.exit(modeOk && buildOk && copiedOk ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });