// U40 A15 issue walk: the "Change Submission Language For" panel acting before its own loading settles.
// Spec: docs/specs/U40-publication-metadata.md, Rule 13b, register A15, footnote f-a15.
//
// MODE=walk (default) takes the report's Steps on PKP's default test dataset: `dbarnes` opens the
// submission's Publication › "Title & Abstract", throttles the browser's network as DevTools'
// custom profile does (Download 8 kbit/s, Upload 1000 kbit/s, Latency 0), clicks "Change", picks
// "French (Canada)" as soon as the choices appear (the line under the panel heading still blank),
// turns throttling off, waits for the title under the heading, reads the boxes, clicks "Confirm"
// and reads the page that reloads.
// MODE=nb is the neighbour check and the Observed control, run alone on a freshly reset fleet: no
// throttling, the pick made only once the title shows under the heading; the boxes read, "Confirm"
// with them empty, then a French title (and abstract) typed and "Confirm" again.
// MODE=existing is MODE=walk on a submission that already holds a French (Canada) title (and abstract):
// before "Change", the Title & Abstract form's "French (Canada)" button, a French title (and abstract)
// tagged `u40r2` typed and "Save".
// MODE=french is MODE=nb followed by a second opening of the panel on the now French submission:
// no throttling, the pick of "English" made once the title shows under the heading, the boxes read,
// "Confirm", the stored titles read.
// MODE=fail opens the panel with the browser's publication request aborted (a dropped connection) and
// records what the panel shows.
// Each step records what it finds and goes on; nothing throws on an unexpected state.
//
//   npm run fleet-prep -- --feature <f> --dataset <n> --reset
//   [PKP_E2E_LINE=stable-3_5_0] [PROBE_RUN=<run>] [MODE=nb] PROBE_FEATURE=<f> PROBE_AGENT=<a> \
//     node bin/probe.js all shared/playwright/checks/issues/language-panel-early-pick-keeps-old-title/walk.js
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, sql} = require('../../../probe');
const {T, flat, SUBMISSIONS, openTitleAbstract, readout, panel, throttle, panelState, typeInto, saveOtherLanguage} = require('./lib');

const MODE = process.env.MODE || 'walk';
const THROTTLED = MODE === 'walk' || MODE === 'existing';
const SETTLED = MODE === 'nb' || MODE === 'french';
const SLOW = {kbitDown: 8, kbitUp: 1000, latency: 0};
const P = `a15-${MODE}`;

forEachApp(async (app) => {
    const sub = SUBMISSIONS[app.name];
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', submission: sub.id};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name} ${MODE}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const snap = async (name) => { record(`${P}-${name}`, await screen(page).catch((e) => ({error: flat(e.message)}))); await shot(page, `${P}-${name}`).catch(() => {}); };
    const pubRow = () => {
        try {
            const pid = sql(app, `select current_publication_id from submissions where submission_id = ${sub.id}`);
            return {
                submissionLocale: sql(app, `select locale from submissions where submission_id = ${sub.id}`),
                titles: sql(app, `select locale || '=' || setting_value from publication_settings where publication_id = ${pid} and setting_name = 'title' order by 1`).split('\n'),
                abstracts: sql(app, `select locale || '=' || left(setting_value, 80) from publication_settings where publication_id = ${pid} and setting_name = 'abstract' order by 1`).split('\n'),
            };
        } catch (e) { return {error: flat(e.message)}; }
    };

    const {page, close} = await launch(app);
    const fetches = [];
    page.on('requestfinished', (rq) => {
        const u = rq.url();
        if (/\/publications\/\d+(\/_components\/changeLanguageMetadata)?(\?|$)/.test(u) && rq.method() === 'GET') {
            fetches.push({at: Date.now(), what: /changeLanguageMetadata/.test(u) ? 'form' : 'publication', url: u.replace(/^https?:\/\/[^/]+/, '')});
        }
    });
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
    try {
        fact('before', pubRow());
        await signIn(page, 'dbarnes');
        await openTitleAbstract(page, app, sub.id);
        fact('readoutBefore', await readout(page));
        const change = page.getByRole('button', {name: 'Change', exact: true}).first();
        await loc(page, 'Title & Abstract: "Change" beside the language readout', change);
        await snap('1-title-abstract');
        if (MODE === 'existing') {
            fact('frenchSaved', await saveOtherLanguage(page, 'French (Canada)', 'fr_CA', {title: 'u40r2 Titre existant', abstract: 'u40r2 Résumé existant.'}));
            fact('afterFrenchSave', pubRow());
            await snap('1b-french-saved');
        }

        if (MODE === 'fail') {
            // The publication request failing (a dropped connection): the browser's own request is
            // aborted, nothing else is sent. What the panel offers then.
            const errors = [];
            page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
            await page.route((u) => /\/publications\/\d+$/.test(u.pathname), (route) => route.request().method() === 'GET' ? route.abort('connectionfailed') : route.continue());
            await change.click();
            await page.waitForTimeout(5000);
            const st = await panelState(page);
            fact('failPanel', {subtitle: st.subtitle, radios: st.radios, text: st.text && st.text.slice(st.text.indexOf('Change Submission Language For'))});
            fact('failSpinner', await panel(page).locator('.pkpSpinner').count());
            fact('failErrorDialog', flat(await page.getByRole('dialog', {name: /Error/}).last().innerText().catch(() => null), 300));
            fact('failPageErrors', errors);
            await snap('7-publication-failed');
            return;
        }

        if (THROTTLED) await throttle(cdp, SLOW);
        const t0 = Date.now();
        fetches.length = 0;
        await change.click();
        const dialog = panel(page);
        const french = dialog.getByRole('radio', {name: /French|Français/});
        await french.waitFor({state: 'visible', timeout: 120_000}).catch(() => {});
        fact('choicesShownAfterMs', Date.now() - t0);
        if (SETTLED) {
            // The settled path: wait for the title under the heading before picking.
            await page.waitForFunction((t) => {
                const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
                return !!d && !!(document.getElementById(d.getAttribute('aria-describedby')) || {}).textContent?.includes(t);
            }, sub.title, {timeout: T}).catch(() => fact('settleBeforePickWait', 'timed out'));
        }
        const atPick = await panelState(page);
        fact('atPick', {subtitle: atPick.subtitle, picked: atPick.picked, publicationLoaded: fetches.some((f) => f.what === 'publication'), fetches: fetches.map((f) => ({what: f.what, ms: f.at - t0}))});
        await french.check({timeout: T}).catch(async (e) => { fact('pickError', flat(e.message)); });
        const tPick = Date.now();
        fact('pickedAtMs', tPick - t0);
        const right = await panelState(page);
        fact('rightAfterPick', {subtitle: right.subtitle, picked: right.picked, editors: right.editors});
        await snap('2-picked');
        if (THROTTLED) await throttle(cdp, null);

        // Wait until the title shows under the heading and the revealed editors are initialized.
        await page.waitForFunction((t) => {
            const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
            if (!d || !(document.getElementById(d.getAttribute('aria-describedby')) || {}).textContent?.includes(t)) return false;
            const eds = (window.tinymce?.get() || []).filter((e) => d.contains(e.getElement()));
            return eds.length > 0 && eds.every((e) => e.initialized);
        }, sub.title, {timeout: 60_000}).catch(() => fact('settleWait', 'timed out'));
        await idle(page);
        fact('fetchTimeline', fetches.map((f) => ({what: f.what, ms: f.at - t0, beforePick: f.at < tPick})));
        const settledState = await panelState(page);
        fact('settled', settledState);
        await loc(page, 'Change Submission Language For: "French (Canada)" radio', french);
        await snap('3-settled');

        const confirm = dialog.getByRole('button', {name: 'Confirm', exact: true});
        await loc(page, 'Change Submission Language For: "Confirm"', confirm);
        const confirmOnce = async (label) => {
            const nWrites = writes.length;
            const reloaded = page.waitForEvent('load', {timeout: 15_000}).then(() => true).catch(() => false);
            await confirm.click({timeout: T}).catch((e) => fact(`${label}ClickError`, flat(e.message)));
            const didReload = await reloaded;
            await idle(page);
            fact(`${label}`, {reloaded: didReload, requests: writes.slice(nWrites)});
            if (!didReload) {
                const st = await panelState(page);
                fact(`${label}Panel`, {open: st.open, text: st.text});
                await snap(`4-${label}-refused`);
                return false;
            }
            await page.getByText('Current Submission Language:', {exact: false}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            await idle(page);
            fact(`${label}ReadoutAfter`, await readout(page));
            fact(`${label}Stored`, pubRow());
            await snap(`5-${label}-reloaded`);
            return true;
        };

        if (THROTTLED) {
            await confirmOnce('confirm');
        } else {
            const accepted = await confirmOnce('confirmEmpty');
            if (!accepted) {
                const st = await panelState(page);
                for (const e of st.editors) {
                    await typeInto(page, e.id, /abstract/i.test(e.id) ? 'u40r2 Résumé en français.' : 'u40r2 Titre en français');
                }
                fact('typed', (await panelState(page)).editors);
                const changed = await confirmOnce('confirmTyped');
                if (changed && MODE === 'french') {
                    // Second opening on the now French submission: settled pick of English.
                    await page.getByRole('button', {name: 'Change', exact: true}).first().click();
                    await page.waitForFunction((t) => {
                        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
                        return !!d && !!(document.getElementById(d.getAttribute('aria-describedby')) || {}).textContent?.includes(t);
                    }, sub.title, {timeout: T}).catch(() => fact('secondSettleWait', 'timed out'));
                    const english = panel(page).getByRole('radio', {name: /^English$/});
                    fact('secondBeforePick', await panelState(page));
                    await english.check({timeout: T}).catch((e) => fact('secondPickError', flat(e.message)));
                    await page.waitForFunction(() => {
                        const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
                        const eds = d ? (window.tinymce?.get() || []).filter((e) => d.contains(e.getElement())) : [];
                        return eds.length > 0 && eds.every((e) => e.initialized);
                    }, undefined, {timeout: T}).catch(() => fact('secondEditorWait', 'timed out'));
                    await idle(page);
                    fact('secondSettled', await panelState(page));
                    await snap('6-english-picked');
                    await confirmOnce('confirmEnglish');
                }
            }
        }
    } catch (e) {
        fact('error', flat(e.stack, 1500));
        await snap('error').catch(() => {});
    } finally {
        record(`${P}-facts`, facts);
        await close();
    }
});
