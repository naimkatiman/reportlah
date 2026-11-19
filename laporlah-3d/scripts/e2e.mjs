// End-to-end flow in real Chrome at desktop and phone, demo mode. Prints E2E_FLOW_OK only after every assertion passes.
import { VIEWPORTS, launchChrome, newContext, watchErrors } from './lib/browser.mjs';
import { startApp } from './lib/serve.mjs';

const DRAIN = 'g_drain';
const WAIT = 20000;

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

async function press(page, vp, locator) {
  await locator.waitFor({ state: 'visible', timeout: WAIT });
  if (vp.hasTouch) await locator.tap();
  else await locator.click();
}

async function readNumber(page, testId) {
  const text = (await page.getByTestId(testId).first().textContent({ timeout: WAIT })) ?? '';
  return Number(text.replace(/[^0-9]/g, ''));
}

async function waitNumber(page, testId, expected, label) {
  try {
    await page.waitForFunction(
      ([id, want]) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        return el !== null && Number((el.textContent ?? '').replace(/[^0-9]/g, '')) === want;
      },
      [testId, expected],
      { timeout: WAIT },
    );
  } catch {
    const now = await page.getByTestId(testId).first().textContent().catch(() => '(missing)');
    check(false, `${label}: expected ${expected}, saw ${now}`);
  }
}

async function walkToDrain(page, vp) {
  const canvas = page.getByTestId('walk-canvas');
  await canvas.waitFor({ state: 'visible', timeout: WAIT });
  for (let i = 0; i < 6; i += 1) {
    if ((await canvas.getAttribute('data-pose')) === 'drain') break;
    const forward = page.getByTestId('walk-forward');
    if (await forward.isEnabled()) await press(page, vp, forward);
    await page.waitForTimeout(400);
    await page.waitForFunction(() => document.querySelector('[data-testid="walk-canvas"]')?.getAttribute('data-pose') !== 'moving', null, { timeout: WAIT });
  }
  check((await canvas.getAttribute('data-pose')) === 'drain', `${vp.name}: walk controls did not reach the drain pose`);

  const snap = page.getByTestId('snap-button');
  // The drain is in view on arrival; if not, look around with the keyboard like a user would.
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft'];
  for (let i = 0; i <= keys.length; i += 1) {
    try {
      await page.waitForFunction(() => !document.querySelector('[data-testid="snap-button"]')?.disabled, null, { timeout: 2500 });
      break;
    } catch {
      const key = keys[i];
      if (!key) break;
      await canvas.focus();
      await page.keyboard.press(key);
    }
  }
  check(await snap.isEnabled(), `${vp.name}: Snap the drain never became available`);
  await press(page, vp, snap);
}

async function runViewport(browser, url, vp) {
  const errors = [];
  const context = await newContext(browser, vp);
  // Never open the real Telegram: answer the navigation locally.
  await context.route('https://t.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Telegram stub</title>' }));
  const page = await context.newPage();
  watchErrors(page, errors, vp.name);
  const label = (message) => `${vp.name}: ${message}`;

  await page.goto(url, { waitUntil: 'load' });
  await walkToDrain(page, vp);

  // Draft
  await page.getByTestId('draft-card').waitFor({ state: 'visible', timeout: WAIT });
  const draftText = (await page.getByTestId('draft-card').innerText()).replace(/\s+/g, ' ');
  check(/Not confirmed/i.test(draftText), label('draft does not say "Not confirmed"'));
  check(/4 complaints/.test(draftText), label(`draft footer does not read 4 complaints: ${draftText.slice(-160)}`));

  // Count 4 and rank 2 before Confirm, read in the reviewer inbox.
  await press(page, vp, page.getByTestId('stage-reviewer'));
  await page.getByTestId('inbox').waitFor({ state: 'visible', timeout: WAIT });
  await waitNumber(page, `group-count-${DRAIN}`, 4, label('count before Confirm'));
  await waitNumber(page, `group-rank-${DRAIN}`, 2, label('rank before Confirm'));

  // Confirm twice
  await press(page, vp, page.getByTestId('stage-resident'));
  const confirm = page.getByTestId('confirm-button');
  await press(page, vp, confirm);
  await press(page, vp, confirm);
  await page.getByTestId('draft-added').waitFor({ state: 'visible', timeout: WAIT });
  await press(page, vp, page.getByTestId('open-inbox'));
  await page.getByTestId(`group-detail-${DRAIN}`).waitFor({ state: 'visible', timeout: WAIT });
  await waitNumber(page, `detail-count-${DRAIN}`, 5, label('count after double Confirm'));
  await waitNumber(page, `detail-rank-${DRAIN}`, 1, label('rank after double Confirm'));
  await page.waitForTimeout(800);
  check((await readNumber(page, `detail-count-${DRAIN}`)) === 5, label('count did not stay at 5'));

  // Approve and hand off
  const textarea = page.getByTestId('approval-text');
  await textarea.scrollIntoViewIfNeeded();
  const message = await textarea.inputValue();
  check(message.trim().length > 0, label('approval message is empty'));
  await press(page, vp, page.getByTestId('approve-button'));
  const link = page.getByTestId('telegram-link');
  await link.waitFor({ state: 'visible', timeout: WAIT });
  const href = (await link.getAttribute('href')) ?? '';
  check(href.startsWith('https://t.me/'), label(`link does not start with https://t.me/: ${href.slice(0, 60)}`));
  let decoded = null;
  try {
    decoded = new URL(href).searchParams.get('text');
  } catch {
    decoded = null;
  }
  check(decoded === message, label('link text param is not exactly the approved message'));
  const popup = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await press(page, vp, link);
  const opened = await popup;
  if (opened) await opened.close().catch(() => undefined);
  await page.waitForFunction(() => document.querySelector('[data-testid="telegram-status"]')?.textContent?.trim() === 'Opened in Telegram', null, { timeout: WAIT }).catch(() => undefined);
  const status = ((await page.getByTestId('telegram-status').textContent()) ?? '').trim();
  check(status === 'Opened in Telegram', label(`status text is "${status}"`));

  const body = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('textarea')].map((t) => t.value).join(' '));
  check(!/whatsapp/i.test(body), label('page text contains WhatsApp'));
  check(!/\b(sent|delivered)\b/i.test(status), label('status claims sent or delivered'));

  for (const error of errors) check(false, error);
  await context.close();
}

const app = await startApp();
const browser = await launchChrome();
try {
  for (const vp of VIEWPORTS) {
    try {
      await runViewport(browser, app.url, vp);
    } catch (error) {
      check(false, `${vp.name}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    }
  }
} finally {
  await browser.close();
  await app.stop();
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('E2E_FLOW_OK');
