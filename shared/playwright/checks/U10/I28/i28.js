// U10 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows
// for U10 in docs/tracking/incidentals.md, on all three apps.
// Spec: docs/specs/U10-appearance-and-theming.md — Rule 2 (saving: "the
// public pages show the change from their next load"), Rule 6 ("Colour"),
// Rule 28 ("Editorial Masthead"); footnotes c, l, u, td8, td11, td30.
//
//   L127      a visitor who already opened the journal and reloads after a
//             "Theme" › "Colour" save: the header colour, the compiled style
//             sheet's address and its response headers. Both ends of the
//             sheet's age when the visitor first loaded it: just compiled
//             (end A) and compiled AGE seconds earlier (end B). Control: a
//             browser that never opened the journal.
//   U07-I28-5 the French "Entête" tab's order-list description on a press
//             and a preprint server, with the OJS control and the English
//             one; a role moved and left unsaved on the way out.
//
// Seeds its own scratch context per run (tag u10i28), signs in as `admin`
// (enrolled as manager by every createContext) for the Theme saves and as
// the scratch manager for the Entête tab, records every screen with screen().
//
//   PROBE_FEATURE=U10 PROBE_AGENT=ccI28 RUN=r1 node bin/probe.js all shared/playwright/checks/U10/I28/i28.js
//   PHASES=cache,french (default both); AGE=seconds (default 180)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const PHASES = (process.env.PHASES || 'cache,french').split(',');
const RUN = process.env.RUN || 'r1';
const AGE = parseInt(process.env.AGE || '180', 10);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[i28 ${RUN}]`, ...a);
const T = 20_000;

const ctxUrl = (app, P, p = '', locale = '') => app.url(`/index.php/${P}${locale ? '/' + locale : ''}${p}`);

async function snap(page, name, extra = {}) {
    const s = await screen(page).catch((e) => ({screenError: String(e.message || e)}));
    record(`${RUN}-${name}`, {...s, ...extra});
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}

const flat = (s, n = 2000) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function openTab(page, app, P, topId, sideId, locale = 'en') {
    await page.goto(ctxUrl(app, P, '/management/settings/website', locale));
    await idle(page);
    const top = page.locator(`#${topId}-button`).first();
    await top.waitFor({timeout: T});
    if ((await top.getAttribute('aria-selected')) !== 'true') { await top.click(); await idle(page); }
    const side = page.locator(`#${sideId}-button`).first();
    await side.waitFor({timeout: T});
    if ((await side.getAttribute('aria-selected')) !== 'true') { await side.click(); await idle(page); }
    await sleep(300);
    return page.locator(`[role="tabpanel"]#${sideId}`).first();
}

const themePanel = (page) => page.locator('[role="tabpanel"]#theme').first();
const colourField = (panel) => panel.locator('.pkpFormField').filter({hasText: /Colour|Couleur/}).first();

async function typeColour(panel, value) {
    const hex = colourField(panel).locator('input').first();
    await hex.click();
    await hex.fill(value);
    await hex.press('Enter').catch(() => {});
    await hex.blur().catch(() => {});
    await sleep(400);
    return colourField(panel).locator('input').first().inputValue();
}

async function saveTheme(page, panel) {
    const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+\/theme/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    const t0 = Date.now();
    await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await resp;
    const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
    return {status: r ? r.status() : null, url: r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null, saved, ms: Date.now() - t0, at: new Date().toISOString()};
}

/** A visitor's browser: its own context (its own HTTP cache), CDP to see cache hits. */
async function visitor(browser, app, label, sink) {
    const context = await browser.newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}});
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const byId = {};
    cdp.on('Network.requestWillBeSent', (e) => {
        if (/css\?name=stylesheet/.test(e.request.url) || e.type === 'Document') {
            byId[e.requestId] = {label, at: new Date().toISOString(), type: e.type, url: e.request.url.replace(/^https?:\/\/[^/]+/, ''), sentHeaders: {ifModifiedSince: e.request.headers['If-Modified-Since'] || null, ifNoneMatch: e.request.headers['If-None-Match'] || null, cacheControl: e.request.headers['Cache-Control'] || null}};
        }
    });
    cdp.on('Network.requestServedFromCache', (e) => { if (byId[e.requestId]) byId[e.requestId].servedFromCache = true; });
    cdp.on('Network.responseReceived', (e) => {
        const x = byId[e.requestId];
        if (!x) return;
        const h = Object.fromEntries(Object.entries(e.response.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
        Object.assign(x, {status: e.response.status, fromDiskCache: !!e.response.fromDiskCache, fromServiceWorker: !!e.response.fromServiceWorker,
            headers: {cacheControl: h['cache-control'] || null, etag: h.etag || null, lastModified: h['last-modified'] || null, expires: h.expires || null, date: h.date || null, pragma: h.pragma || null, contentLength: h['content-length'] || null, vary: h.vary || null}});
    });
    cdp.on('Network.loadingFinished', (e) => { if (byId[e.requestId]) { byId[e.requestId].encodedDataLength = e.encodedDataLength; sink.push(byId[e.requestId]); delete byId[e.requestId]; } });
    page.on('pageerror', (err) => sink.push({label, crash: 'script', text: String(err.message || err).slice(0, 300), url: page.url()}));
    page.on('response', (r) => { if (r.status() >= 500) sink.push({label, crash: 'server', status: r.status(), method: r.request().method(), url: r.url()}); });
    return {context, page};
}

async function look(page) {
    return page.evaluate(() => {
        const head = document.querySelector('.pkp_structure_head');
        const cs = head ? getComputedStyle(head) : null;
        const link = document.querySelector('.pkp_navigation_primary > li > a, .pkp_site_name a');
        return {
            url: location.pathname,
            headerBg: cs ? cs.backgroundColor : null,
            linkColour: link ? getComputedStyle(link).color : null,
            sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')).filter((h) => /name=stylesheet/.test(h)),
            allSheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')),
        };
    });
}

async function visit(v, url, name, how = 'goto') {
    if (how === 'reload') await v.page.reload(); else await v.page.goto(url);
    await idle(v.page);
    const l = await look(v.page);
    await snap(v.page, name, {look: l, how, at: new Date().toISOString()});
    return l;
}

forEachApp(async (app) => {
    const ctxWord = app.name === 'ojs' ? 'journal' : app.name === 'omp' ? 'press' : 'server';
    const P = tag('u10i28');
    const mgr = `${P}m`;
    await app.api.createContext({tag: P, context: {name: `U10 I28 ${RUN} ${P}`, acronym: 'I28', supportedLocales: ['en', 'fr_CA']},
        users: [{username: mgr, roles: ['manager'], givenName: 'Ines', familyName: 'Manager'}]});
    log(app.name, 'seeded', P);
    note(`ccI28 [${app.name}] ${RUN}: scratch ${P} (en + fr_CA UI, no items), manager ${mgr}; admin enrolled as manager by createContext`);
    const facts = {app: app.name, run: RUN, context: P, age: AGE};

    // ---- L127: the compiled sheet after a "Theme" save --------------------
    if (on('cache')) {
        const {page, close} = await launch(app);
        const net = [];
        const browser = page.context().browser();
        const home = ctxUrl(app, P, '', 'en');
        const about = ctxUrl(app, P, '/about', 'en');
        try {
            await signIn(page, 'admin', {contextPath: P});
            await idle(page);
            let panel = await openTab(page, app, P, 'appearance', 'theme');
            await colourField(panel).waitFor({timeout: T});
            facts.colourAtStart = await colourField(panel).locator('input').first().inputValue();
            await snap(page, 'c01-theme-admin', {colour: facts.colourAtStart});
            await loc(page, 'Appearance › Theme: the colour hex box', colourField(panel).locator('input').first());

            // End A: the visitor's first load compiles the sheet (age ~0).
            const vA = await visitor(browser, app, 'A', net);
            facts.A = {first: await visit(vA, home, 'c02-A-visitor-first')};
            facts.A.typed = await typeColour(panel, '#000080');
            facts.A.save = await saveTheme(page, panel);
            await snap(page, 'c03-theme-saved-navy', {save: facts.A.save});
            await sleep(1500);
            facts.A.reload = await visit(vA, home, 'c04-A-visitor-reload', 'reload');
            facts.A.nextPage = await visit(vA, about, 'c05-A-visitor-about');
            const fA = await visitor(browser, app, 'A-fresh', net);
            facts.A.freshControl = await visit(fA, home, 'c06-A-fresh-control');
            await fA.context.close();

            // End B: the sheet was compiled AGE s before the visitor's first load.
            // The reload above recompiled it (the save cleared it); nothing saves a theme meanwhile.
            facts.B = {compiledAt: new Date().toISOString(), waited: AGE};
            log(app.name, `waiting ${AGE}s for the sheet to age`);
            // keep the admin's tab alive and ready: the second colour typed, not saved
            panel = await openTab(page, app, P, 'appearance', 'theme');
            await colourField(panel).waitFor({timeout: T});
            facts.B.colourBefore = await colourField(panel).locator('input').first().inputValue();
            facts.B.typed = await typeColour(panel, '#8B0000');
            await sleep(AGE * 1000);
            const vB = await visitor(browser, app, 'B', net);
            facts.B.first = await visit(vB, home, 'c07-B-visitor-first');
            facts.B.firstAt = Date.now();
            facts.B.save = await saveTheme(page, panel);
            await snap(page, 'c08-theme-saved-darkred', {save: facts.B.save});
            await sleep(1500);
            facts.B.reload = await visit(vB, home, 'c09-B-visitor-reload', 'reload');
            facts.B.reloadAfterMs = Date.now() - facts.B.firstAt;
            facts.B.nextPage = await visit(vB, about, 'c10-B-visitor-about');
            facts.B.nextPageAfterMs = Date.now() - facts.B.firstAt;
            const fB = await visitor(browser, app, 'B-fresh', net);
            facts.B.freshControl = await visit(fB, home, 'c11-B-fresh-control');
            await fB.context.close();
            // past a tenth of the sheet's age at the first load
            const wait = Math.max(0, Math.ceil(AGE / 10 + 8) * 1000 - (Date.now() - facts.B.firstAt));
            await sleep(wait);
            facts.B.lateReload = await visit(vB, home, 'c12-B-visitor-reload-late', 'reload');
            facts.B.lateReloadAfterMs = Date.now() - facts.B.firstAt;
            await vA.context.close();
            await vB.context.close();

            // the admin's tab read after a reload
            panel = await openTab(page, app, P, 'appearance', 'theme');
            await colourField(panel).waitFor({timeout: T});
            facts.colourAfterReload = await colourField(panel).locator('input').first().inputValue();
            await snap(page, 'c13-theme-reloaded', {colour: facts.colourAfterReload});
        } catch (e) {
            facts.error = String(e.stack || e).slice(0, 800);
            log(app.name, 'cache error', facts.error);
        } finally {
            facts.net = net;
            record(`${RUN}-cache-facts`, facts, {merge: true});
            await signOut(page).catch(() => {});
            await close();
        }
    }

    // The roles list only: the tab also holds the enrollment and reviewers boxes (pkp-lib#13370).
    const roles = (f) => f.locator('fieldset.pkpFormField--options').filter({has: f.page().locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')});
    // ---- U07-I28-5: the French "Entête" tab ------------------------------
    if (on('french')) {
        const {page, close} = await launch(app);
        const fr = {};
        try {
            await signIn(page, mgr, {contextPath: P});
            await idle(page);
            for (const [locale, name] of [['fr_CA', 'f01-entete-fr'], ['en', 'f02-masthead-en']]) {
                const panel = await openTab(page, app, P, 'appearance', 'appearance-masthead', locale);
                const form = page.locator('[id="appearance-masthead"] form').first();
                await form.waitFor({timeout: T});
                await idle(page);
                const tabLabel = flat(await page.locator('#appearance-masthead-button').first().innerText().catch(() => ''), 80);
                const formText = flat(await form.innerText());
                const descriptions = await form.locator('.pkpFormField__description, .pkpFormField--html').allInnerTexts().catch(() => []);
                fr[locale] = {tabLabel, formText, descriptions: descriptions.map((d) => flat(d, 400))};
                await snap(page, name, fr[locale]);
                if (locale === 'fr_CA') {
                    await loc(page, 'Appearance › "Entête" (fr_CA): the order form', form);
                    // sweep: the other Appearance side tabs' French text, for words naming a journal
                    fr.sweep = {};
                    for (const side of ['theme', 'appearance-setup', 'advanced']) {
                        const b = page.locator(`#${side}-button`).first();
                        await b.click(); await idle(page); await sleep(300);
                        const t = flat(await page.locator(`[role="tabpanel"]#${side}`).first().innerText().catch(() => ''), 4000);
                        fr.sweep[side] = {revue: (t.match(/[^.]{0,80}\brevues?\b[^.]{0,40}/gi) || []), text: t};
                    }
                    await snap(page, 'f03-fr-advanced', {sweep: Object.fromEntries(Object.entries(fr.sweep).map(([k, v]) => [k, v.revue]))});
                    // left once with a change unsaved: a role moved on Entête, then a reload
                    await page.locator('#appearance-masthead-button').first().click(); await idle(page);
                    const form2 = page.locator('[id="appearance-masthead"] form').first();
                    const orderBefore = await roles(form2).locator('label.pkpFormField--options__option').allInnerTexts();
                    const arrows = form2.locator('button').filter({hasText: /Avancer|Increase/});
                    fr.arrowCount = await arrows.count();
                    if (fr.arrowCount > 1) await arrows.nth(1).click();
                    await sleep(400);
                    const orderMoved = await roles(form2).locator('label.pkpFormField--options__option').allInnerTexts();
                    const dialogs = [];
                    const onDialog = async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
                    page.on('dialog', onDialog);
                    await page.reload(); await idle(page);
                    await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page);
                    await page.locator('#appearance-masthead-button').first().click(); await idle(page);
                    const orderAfter = await roles(page.locator('[id="appearance-masthead"] form').first()).locator('label.pkpFormField--options__option').allInnerTexts();
                    fr.leave = {orderBefore: orderBefore.map((x) => flat(x, 80)), orderMoved: orderMoved.map((x) => flat(x, 80)), orderAfter: orderAfter.map((x) => flat(x, 80)), dialogs};
                    await snap(page, 'f04-entete-fr-after-leave', fr.leave);
                    page.off('dialog', onDialog);
                }
            }
        } catch (e) {
            fr.error = String(e.stack || e).slice(0, 800);
            log(app.name, 'french error', fr.error);
        } finally {
            record(`${RUN}-french-facts`, {app: app.name, run: RUN, context: P, ctxWord, ...fr}, {merge: true});
            await signOut(page).catch(() => {});
            await close();
        }
    }
});
