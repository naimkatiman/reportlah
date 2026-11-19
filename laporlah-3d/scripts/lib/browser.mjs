import { chromium } from 'playwright-core';

export const DESKTOP = { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
export const PHONE = { name: 'phone', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
export const VIEWPORTS = [DESKTOP, PHONE];

/**
 * Launches the installed Chrome (no browser download). SwiftShader flags make WebGL work in
 * headless mode on machines without a usable GPU.
 */
export function launchChrome() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
  });
}

export function newContext(browser, vp) {
  return browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    reducedMotion: 'no-preference',
    locale: 'en-GB',
  });
}

/** Collects console errors, page errors and failed requests so a script can assert there were none. */
export function watchErrors(page, errors, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${label} console: ${msg.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
}
