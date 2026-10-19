// U40 A22 issue walk: a title typed into the "Change Submission Language For" panel's Title box
// before the box has finished loading.
// Spec: docs/specs/U40-publication-metadata.md, Rule 13b, register A22, footnote f-a22.
//
// MODE=walk (default) takes the report's Steps on PKP's default test dataset: `dbarnes` opens the
// submission's "Title & Abstract", clicks "Change", waits for the title under the panel heading,
// throttles the network as DevTools' custom profile does (Download 8 kbit/s, Upload 1000 kbit/s,
// Latency 0), picks "French (Canada)", clicks into the Title box at once and types "Titre h19w",
// turns throttling off, waits for the box to load, reads it, types the Abstract where the panel has
// one, clicks "Confirm" and reads what happened.
// MODE=nb is the neighbour check and the control, run alone on a freshly reset fleet: the
// Title & Abstract page's own editors read (they must take keys), then the same steps with the
// title typed only once the Title box has loaded (still throttled); the title must be kept and
// stored.
// MODE=window, run alone, measures how long the Title (or Abstract) box takes keys before it has
// loaded: cases `<profile>:<cache|nocache>:<title|abstract>:<ms after the pick>` (CASES=…), each on a
// fresh opening of the panel closed with "Cancel" (nothing is saved); profiles 8kbit (the Steps'),
// 3G (400 kbit/s, 2000 ms latency) and slow4G (1600 kbit/s, 562.5 ms), as DevTools names its presets;
// `nocache` is DevTools' "Disable cache".
// Each step records what it finds and goes on; nothing throws on an unexpected state.
//
//   npm run fleet-prep -- --feature <f> --dataset <n> --reset
//   [PKP_E2E_LINE=stable-3_5_0] [PROBE_RUN=<run>] [MODE=nb] PROBE_FEATURE=<f> PROBE_AGENT=<a> \
//     node bin/probe.js all shared/playwright/checks/issues/language-panel-title-typed-early-lost/walk.js
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, sql} = require('../../../probe');
const {T, flat, SUBMISSIONS, openTitleAbstract, readout, panel, throttle, subtitleShows, editors, panelText} = require('./lib');

const MODE = process.env.MODE || 'walk';
const SLOW = {kbitDown: 8, kbitUp: 1000, latency: 0};
const P = `a22-${MODE}`;
const TITLE = 'Titre h19w';
const ABSTRACT = 'Résumé h19w.';

forEachApp(async (app) => {
    const sub = SUBMISSIONS[app.name];
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', submission: sub.id};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name} ${MODE}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const snap = async (name) => { record(`${P}-${name}`, await screen(page).catch((e) => ({error: flat(e.message)}))); await shot(page, `${P}-${name}`).catch(() => {}); };
    const stored = () => {
        try {
            const pid = sql(app, `select current_publication_id from submissions where submission_id = ${sub.id}`);
            return {
                submissionLocale: sql(app, `select locale from submissions where submission_id = ${sub.id}`),
                titles: sql(app, `select locale || '=' || setting_value from publication_settings where publication_id = ${pid} and setting_name = 'title' order by 1`).split('\n'),
            };
        } catch (e) { return {error: flat(e.message)}; }
    };

    const {page, close} = await launch(app);
    const writes = [];
    page.on('request', (rq) => {
        if (/changeLocale/.test(rq.url())) writes.push({method: rq.headers()['x-http-method-override'] || rq.method(), url: rq.url().replace(/^https?:\/\/[^/]+/, ''), body: flat(rq.postData(), 1500)});
    });
    page.on('response', async (r) => {
        if (/changeLocale/.test(r.url())) {
            const w = writes[writes.length - 1] || {};
            w.status = r.status();
            w.response = flat(await r.text().catch(() => null), 600);
        }
    });
    const cdp = await page.context().newCDPSession(page);
    const dialog = panel(page);
    const titleFrame = dialog.locator('iframe[id*="changeSubmissionLanguageMetadata-title-control"]').first();
    const formatting = dialog.getByRole('button', {name: 'Formatting'});
    const titleOf = async () => (await editors(page, 'panel').catch(() => [])).find((e) => /-title-control/.test(e.id)) || null;
    const ready = (timeout) => page.waitForFunction(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
        const eds = d ? (window.tinymce?.get() || []).filter((e) => d.contains(e.getElement())) : [];
        return eds.length > 0 && eds.every((e) => e.initialized && e.getBody().contentEditable === 'true');
    }, undefined, {timeout}).then(() => true).catch(() => false);
    // Step 7's click: into the Title box, as a person clicks; recorded when something lies over it.
    const clickTitle = async (label) => {
        const body = page.frameLocator('iframe[id*="changeSubmissionLanguageMetadata-title-control"]').first().locator('body');
        const r = await body.click({timeout: 3000}).then(() => 'clicked').catch(async (e) => {
            const why = flat(e.message, 300);
            return body.click({force: true, timeout: 3000}).then(() => `forced (${why})`).catch((e2) => `failed (${flat(e2.message, 200)})`);
        });
        fact(`${label}Click`, r);
    };

    try {
        fact('before', stored());
        await signIn(page, 'dbarnes');
        await openTitleAbstract(page, app, sub.id);
        fact('readoutBefore', await readout(page));
        if (MODE === 'nb') {
            // The editors the page itself carries (loaded with the page) must take keys, fix in or out.
            await page.waitForFunction(() => (window.tinymce?.get() || []).some((e) => e.initialized), undefined, {timeout: T}).catch(() => {});
            await page.waitForTimeout(500);
            fact('pageEditors', await editors(page, 'page'));
        }
        const change = page.getByRole('button', {name: 'Change', exact: true}).first();
        await loc(page, 'Title & Abstract: "Change" beside the language readout', change);
        await snap('1-title-abstract');

        if (MODE === 'window') {
            // How long the box takes keys: for each case a fresh opening of the panel, the pick made once
            // the panel has loaded, the network conditions set just before the pick, the keys typed `at`
            // ms after the pick into `box`, what the box shows then (busy indicator, focus, text), what
            // it holds once loaded, and how the editor's style sheets were fetched (network or cache).
            const PROFILES = {
                '8kbit': {kbitDown: 8, kbitUp: 1000, latency: 0},
                '3G': {kbitDown: 400, kbitUp: 400, latency: 2000},
                'slow4G': {kbitDown: 1600, kbitUp: 750, latency: 562.5},
            };
            const CASES = (process.env.CASES || '8kbit:cache:title:200,8kbit:cache:title:1000,8kbit:cache:title:3000,8kbit:cache:abstract:200,3G:cache:title:200,3G:nocache:title:200,3G:nocache:title:1000,slow4G:nocache:title:200')
                .split(',').map((c) => { const [profile, cache, box, at] = c.split(':'); return {profile, cache, box, at: Number(at)}; });
            const sheets = new Map();
            cdp.on('Network.requestWillBeSent', (e) => { if (/\.css(\?|$)/.test(e.request.url)) sheets.set(e.requestId, {url: e.request.url.replace(/^https?:\/\/[^/]+/, ''), t0: Date.now()}); });
            cdp.on('Network.requestServedFromCache', (e) => { const r = sheets.get(e.requestId); if (r) r.servedFromCache = true; });
            cdp.on('Network.responseReceived', (e) => { const r = sheets.get(e.requestId); if (r) { r.status = e.response.status; r.fromDiskCache = e.response.fromDiskCache; r.fromMemoryCache = !!e.response.fromMemoryCache; } });
            cdp.on('Network.loadingFinished', (e) => { const r = sheets.get(e.requestId); if (r) r.ms = Date.now() - r.t0; });
            await cdp.send('Network.enable');
            const results = [];
            for (const c of CASES) {
                const o = {...c};
                sheets.clear();
                try {
                    await cdp.send('Network.setCacheDisabled', {cacheDisabled: c.cache === 'nocache'});
                    await change.click();
                    o.panelLoaded = await subtitleShows(page, sub.title);
                    await throttle(cdp, PROFILES[c.profile]);
                    const tPick = Date.now();
                    await dialog.getByRole('radio', {name: /French|Français/}).check({timeout: T}).catch((e) => { o.pickError = flat(e.message, 200); });
                    const frameSel = `iframe[id*="changeSubmissionLanguageMetadata-${c.box}-control"]`;
                    await dialog.locator(frameSel).first().waitFor({state: 'attached', timeout: 60_000}).catch(() => { o.frameWait = 'timed out'; });
                    o.boxAtMs = Date.now() - tPick;
                    const wait = c.at - (Date.now() - tPick);
                    if (wait > 0) await page.waitForTimeout(wait);
                    const boxOf = async () => (await editors(page, 'panel').catch(() => [])).find((e) => e.id.includes(`-${c.box}-control`)) || null;
                    o.beforeClick = await boxOf();
                    const body = page.frameLocator(frameSel).first().locator('body');
                    o.click = await body.click({timeout: 2000}).then(() => 'clicked').catch(async (e) => {
                        const why = flat(e.message, 200);
                        return body.click({force: true, timeout: 2000}).then(() => `forced (${why})`).catch((e2) => `failed (${flat(e2.message, 150)})`);
                    });
                    o.focusAfterClick = await page.evaluate((sel) => {
                        const a = document.activeElement;
                        const f = document.querySelector(sel);
                        return {active: a ? `${a.tagName.toLowerCase()}${a.className ? '.' + String(a.className).split(' ').join('.') : ''}` : null, inBox: !!f && a === f, frameHasFocus: !!(f && f.contentDocument && f.contentDocument.hasFocus())};
                    }, frameSel);
                    o.typeAtMs = Date.now() - tPick;
                    await page.keyboard.type(c.box === 'title' ? TITLE : ABSTRACT, {delay: 60});
                    o.typedUntilMs = Date.now() - tPick;
                    o.afterTyping = await boxOf();
                    await shot(page, `${P}-${c.profile}-${c.cache}-${c.box}-${c.at}-typed`).catch(() => {});
                    await throttle(cdp, null);
                    o.ready = await page.waitForFunction((id) => { const e = (window.tinymce?.get() || []).find((x) => x.id.includes(id) && x.getElement().isConnected); return !!e && e.initialized; }, `-${c.box}-control`, {timeout: 120_000}).then(() => true).catch(() => false);
                    o.readyAtMs = Date.now() - tPick;
                    await page.waitForTimeout(800);
                    o.afterLoad = await boxOf();
                    o.sheets = [...sheets.values()];
                } catch (e) {
                    o.error = flat(e.stack, 600);
                    await throttle(cdp, null).catch(() => {});
                } finally {
                    await cdp.send('Network.setCacheDisabled', {cacheDisabled: false}).catch(() => {});
                    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click({timeout: 5000}).catch(() => {});
                    await page.waitForTimeout(800);
                }
                fact(`case ${c.profile}:${c.cache}:${c.box}:${c.at}`, o);
                results.push(o);
            }
            fact('windowCases', results);
            return;
        }

        // Step 4: open the panel and let it load.
        await change.click();
        fact('subtitleShown', await subtitleShows(page, sub.title));
        fact('panelLoaded', await panelText(page));
        await snap('2-panel-loaded');

        // Steps 5-6: throttle, pick French (Canada).
        await throttle(cdp, SLOW);
        const tPick = Date.now();
        await dialog.getByRole('radio', {name: /French|Français/}).check({timeout: T}).catch((e) => fact('pickError', flat(e.message)));
        await titleFrame.waitFor({state: 'attached', timeout: 60_000}).catch(() => fact('titleFrameWait', 'timed out'));
        fact('titleBoxAtMs', Date.now() - tPick);
        fact('titleBoxAppeared', await titleOf());

        if (MODE === 'nb') {
            // The control: type only once the box has loaded (still throttled).
            fact('readyBeforeTyping', await ready(120_000));
            fact('readyAtMs', Date.now() - tPick);
        }
        // Step 7: click into the Title box and type.
        await clickTitle('title');
        fact('formattingAfterClick', await formatting.isVisible().catch(() => false));
        const tType = Date.now();
        await page.keyboard.type(TITLE);
        fact('typedInMs', {start: tType - tPick, end: Date.now() - tPick});
        fact('rightAfterTyping', await titleOf());
        await snap('3-typed');

        // Step 8: throttling off, wait for the box to load, click into it, read it.
        await throttle(cdp, null);
        fact('readyAfterThrottleOff', await ready(60_000));
        fact('loadedAtMs', Date.now() - tPick);
        await idle(page).catch(() => {});
        await page.waitForTimeout(800);
        await clickTitle('titleAfterLoad');
        fact('formattingAfterLoad', await formatting.isVisible().catch(() => false));
        fact('afterLoad', await editors(page, 'panel'));
        await loc(page, 'Change Submission Language For: Title box', titleFrame);
        await snap('4-loaded');

        // Step 9: the Abstract (journal, preprint server), typed into the loaded box.
        for (const e of await editors(page, 'panel')) {
            if (/-abstract-control/.test(e.id) && e.initialized && !e.content) {
                await page.frameLocator(`#${e.id}_ifr`).locator('body').click();
                await page.keyboard.type(ABSTRACT);
                fact('abstractTyped', true);
            }
        }

        // Step 10: Confirm.
        const confirm = dialog.getByRole('button', {name: 'Confirm', exact: true});
        await loc(page, 'Change Submission Language For: "Confirm"', confirm);
        const nWrites = writes.length;
        const reloaded = page.waitForEvent('load', {timeout: 15_000}).then(() => true).catch(() => false);
        await confirm.click({timeout: T}).catch((e) => fact('confirmClickError', flat(e.message)));
        const didReload = await reloaded;
        await idle(page).catch(() => {});
        fact('confirm', {reloaded: didReload, requests: writes.slice(nWrites)});
        if (!didReload) {
            fact('confirmPanel', await panelText(page));
            fact('confirmEditors', await editors(page, 'panel'));
            await snap('5-refused');
        } else {
            await page.getByText('Current Submission Language:', {exact: false}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            fact('readoutAfter', await readout(page));
            await snap('5-reloaded');
        }
        fact('after', stored());
    } catch (e) {
        fact('error', flat(e.stack, 1500));
        await throttle(cdp, null).catch(() => {});
        await snap('error').catch(() => {});
    } finally {
        record(`${P}-facts`, facts);
        await close();
    }
});
