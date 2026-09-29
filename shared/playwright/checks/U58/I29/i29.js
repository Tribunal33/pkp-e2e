// U58 claim check, chunk I29 (housekeeping incidentals rows 13 and 22):
// Settings › Workflow › "Submission". Spec:
// docs/specs/U58-submission-intake-configuration.md — Rule 1 (the side tab a
// reload keeps; the page address a pressed side tab writes; footnote a) and
// Rule 2 (what an unsaved change on "Metadata" leaves: another side tab,
// another top tab, the side menu, a reload, then a save read on the page and
// after a reload; footnote c).
//
// Seeds one scratch context per app and run (tag prefix u58i29): a manager
// and, on a journal and a press, an Editor ("Permit changes to Settings" on,
// the install default). `publicknowledge` is not touched.
//
// Phases (PHASES=a,b; default all): r22 r13 save editor
// RUN names the facts (r1, r2) so two runs keep both records.
//
//   RUN=r1 PROBE_FEATURE=U58 PROBE_AGENT=ccI29 node bin/probe.js <ojs|omp|ops> shared/playwright/checks/U58/I29/i29.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['r22', 'r13', 'save', 'editor'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[i29]', new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PUBLISHER_ID = {
    ojs: ['Enable for Publications', 'Enable for Galleys'],
    omp: ['Enable for Monographs', 'Enable for Chapters'],
    ops: ['Enable for Preprints', 'Enable for Galleys'],
};

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(`${RUN}-${name}`, s);
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}

const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');

async function tabs(page) {
    const top = await page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
    const side = await page.locator('[role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els
        .filter((e) => e.offsetParent)
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
    const visiblePanels = await page.locator('[role="tabpanel"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => e.id)).catch(() => []);
    return {
        url: rel(page.url()),
        top: top.filter((t) => t.selected === 'true').map((t) => t.text),
        side: side.filter((t) => t.selected === 'true').map((t) => t.text),
        topAll: top.map((t) => `${t.id}:${t.text}`),
        visiblePanels,
    };
}

async function go(page, app, p) {
    const r = await page.goto(app.url(p)).catch((e) => ({err: e.message}));
    await idle(page);
    return r && r.status ? r.status() : (r && r.err) || null;
}

async function press(page, id) {
    await page.locator(`[id="${id}-button"]`).first().click();
    await idle(page);
    await sleep(1200);
}

async function reload(page) {
    await page.reload();
    await idle(page);
    await sleep(2500);
}

/** The second top tab ("Review" on a journal and press; whatever follows "Submission" on a server). */
async function otherTopId(page) {
    const ids = await page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]')).map((e) => e.id));
    return (ids.find((i) => i && i !== 'submission-button') || '').replace(/-button$/, '');
}

async function openWorkflow(page, app, ctx, sideId) {
    await go(page, app, `/index.php/${ctx}/management/settings/workflow`);
    await sleep(1000);
    if (sideId) await press(page, sideId);
}

// ---- Metadata: the fields this chunk changes -------------------------------

const metaField = (page, boxLabel) => page.locator('[id="metadata"] fieldset.pkpFormField')
    .filter({has: page.getByRole('checkbox', {name: boxLabel, exact: true})}).first();

async function metaState(page, app) {
    const panel = page.locator('[id="metadata"]');
    const kw = await metaField(page, 'Enable keyword metadata').locator('input[type=radio]')
        .evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)).catch(() => null);
    const cat = await panel.getByRole('radio', {name: /Yes, add a categories field/}).isChecked().catch(() => null);
    const pid = {};
    for (const l of PUBLISHER_ID[app.name]) {
        pid[l] = await panel.getByRole('checkbox', {name: l, exact: true}).isChecked().catch(() => null);
    }
    const cov = await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null);
    return {keywords: kw, categoriesYes: cat, publisherId: pid, coverage: cov};
}

/** Flip each watched field away from what the page shows now (so a later account changes the saved values too). */
async function changeMeta(page, app) {
    const panel = page.locator('[id="metadata"]');
    const now = await metaState(page, app);
    const out = {};
    const kw = (now.keywords || [])[0] === 'require' ? 'request' : 'require';
    await metaField(page, 'Enable keyword metadata').locator(`input[value="${kw}"]`).check().catch((e) => { out.kwErr = e.message.slice(0, 120); });
    await panel.getByRole('radio', {name: now.categoriesYes ? /No, do not show authors this field/ : /Yes, add a categories field/}).check().catch((e) => { out.catErr = e.message.slice(0, 120); });
    for (const l of PUBLISHER_ID[app.name]) {
        await panel.getByRole('checkbox', {name: l, exact: true}).setChecked(!now.publisherId[l]).catch((e) => { out[`pidErr ${l}`] = e.message.slice(0, 120); });
    }
    await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).setChecked(!now.coverage).catch((e) => { out.covErr = e.message.slice(0, 120); });
    await sleep(400);
    return out;
}

/** Every top-level field of the "Metadata" tab, for the sweep. */
async function readMeta(page) {
    return page.locator('[id="metadata"]').evaluate((p) => {
        const all = [...p.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField'));
        return {
            fields: all.map((f) => ({
                legend: ((f.querySelector('legend, .pkpFormFieldLabel') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
                inputs: [...f.querySelectorAll('input')].filter((i) => i.offsetParent).map((i) => `${i.type === 'radio' ? '(' : '['}${i.checked ? 'x' : ' '}${i.type === 'radio' ? ')' : ']'}${((i.closest('label') || {}).innerText || i.value).replace(/\s+/g, ' ').trim()}`),
            })),
            buttons: [...p.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        };
    }).catch((e) => ({error: e.message.slice(0, 200)}));
}

async function disableBox(page) {
    return page.locator('input[name="disableSubmissions"]').first().isChecked().catch(() => null);
}

/** Leave by the side menu (Settings › Distribution), then come back by it (Settings › Workflow). */
async function sideMenuRoundTrip(page, name) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    const out = {};
    const link = (n) => nav.getByRole('link', {name: n, exact: true}).first();
    if (!(await link('Distribution').isVisible().catch(() => false))) {
        await nav.getByRole('button', {name: 'Settings'}).first().click().catch(() => {});
        await sleep(500);
    }
    await loc(page, 'side menu Settings › Distribution', link('Distribution'));
    await Promise.all([page.waitForLoadState('load').catch(() => {}), link('Distribution').click().catch((e) => { out.leaveErr = e.message.slice(0, 120); })]);
    await page.waitForURL(/settings\/distribution/, {timeout: 15000}).catch((e) => { out.leaveWait = e.message.slice(0, 80); });
    await idle(page);
    out.left = rel(page.url());
    await snap(page, `${name}-distribution`);
    if (!(await link('Workflow').isVisible().catch(() => false))) {
        await nav.getByRole('button', {name: 'Settings'}).first().click().catch(() => {});
        await sleep(500);
    }
    await Promise.all([page.waitForLoadState('load').catch(() => {}), link('Workflow').click().catch((e) => { out.backErr = e.message.slice(0, 120); })]);
    await page.waitForURL(/settings\/workflow/, {timeout: 15000}).catch(() => {});
    await idle(page);
    await sleep(1500);
    out.back = await tabs(page);
    return out;
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    await app.api.bootstrapProbe(app.contextPath);
    const s = tag(`u58i29${RUN}`);
    const users = [{username: `${s}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}];
    if (!isOps) users.push({username: `${s}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
    await app.api.createContext({tag: s, users});
    record(`${RUN}-seed`, {context: s, users: users.map((u) => u.username)});
    log(app.name, RUN, 'seeded', s);

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => {
        dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message().slice(0, 200), url: rel(page.url())});
        d.accept().catch(() => {});
    });
    const dSince = (n) => dialogs.slice(n);

    /** Row 22: the side tab a reload opens, after a pressed side tab, a top-tab round trip and a typed address. */
    async function row22(prefix) {
        const res = {};
        await go(page, app, `/index.php/${s}/dashboard`);
        await openWorkflow(page, app, s);
        res.landing = await tabs(page);
        await snap(page, `${prefix}-01-landing`);
        await press(page, 'metadata');
        res.pressedMetadata = await tabs(page);
        await snap(page, `${prefix}-02-pressed-metadata`);
        await reload(page);
        res.reloadAfterPress = await tabs(page);
        await snap(page, `${prefix}-03-reload-after-press`);
        // the top-tab round trip
        const other = await otherTopId(page);
        res.otherTop = other;
        await press(page, other);
        res.onOtherTop = await tabs(page);
        await snap(page, `${prefix}-04-other-top-tab`);
        await press(page, 'submission');
        res.backOnSubmission = await tabs(page);
        await snap(page, `${prefix}-05-back-on-submission`);
        await reload(page);
        res.reloadAfterTopTrip = await tabs(page);
        await snap(page, `${prefix}-06-reload-after-top-trip`);
        // the other end: a side tab pressed after the round trip, then a reload
        await press(page, 'components');
        res.pressedAfterTrip = await tabs(page);
        await reload(page);
        res.reloadAfterPressAfterTrip = await tabs(page);
        await snap(page, `${prefix}-07-reload-after-press-after-trip`);
        // typed addresses, from another page, then a reload, both address forms, two side tabs
        res.typed = {};
        for (const h of ['submission/metadata', 'metadata', 'submission/contributorRoles', 'contributorRoles', 'submission']) {
            await go(page, app, `/index.php/${s}/dashboard`);
            await go(page, app, `/index.php/${s}/management/settings/workflow#${h}`);
            await sleep(1500);
            const landed = await tabs(page);
            await snap(page, `${prefix}-08-typed-${h.replace('/', '-')}`);
            await reload(page);
            const afterReload = await tabs(page);
            await snap(page, `${prefix}-09-typed-${h.replace('/', '-')}-reload`);
            res.typed[h] = {landed, afterReload};
        }
        return res;
    }

    /** Row 13: an unsaved change on "Metadata" (and on "Disable Submissions"), then each way out. */
    async function row13(prefix) {
        const res = {};
        await openWorkflow(page, app, s, 'metadata');
        res.stored = await metaState(page, app);
        res.storedDisable = await disableBox(page);
        res.sweep = await readMeta(page);
        await snap(page, `${prefix}-01-metadata-stored`);
        for (const l of PUBLISHER_ID[app.name]) await loc(page, `Metadata: Publisher ID "${l}" box`, page.locator('[id="metadata"]').getByRole('checkbox', {name: l, exact: true}));
        await loc(page, 'Metadata: Categories "Yes…" choice', page.locator('[id="metadata"]').getByRole('radio', {name: /Yes, add a categories field/}));
        await loc(page, 'Metadata: Keywords "Require…" choice', metaField(page, 'Enable keyword metadata').locator('input[value="require"]'));
        // the changes, unsaved
        res.changeErrors = await changeMeta(page, app);
        await press(page, 'disableSubmissions');
        await page.locator('input[name="disableSubmissions"]').first().setChecked(!res.storedDisable).catch((e) => { res.disableErr = e.message.slice(0, 120); });
        await press(page, 'metadata');
        res.changed = await metaState(page, app);
        await snap(page, `${prefix}-02-changed-unsaved`);
        // another side tab and back
        let d0 = dialogs.length;
        await press(page, 'components');
        await snap(page, `${prefix}-03-components`);
        await press(page, 'metadata');
        res.afterSideTab = {meta: await metaState(page, app), dialogs: dSince(d0)};
        await press(page, 'disableSubmissions');
        res.afterSideTab.disable = await disableBox(page);
        await press(page, 'metadata');
        await snap(page, `${prefix}-04-after-side-tab`);
        // another top tab and back
        d0 = dialogs.length;
        await press(page, await otherTopId(page));
        await press(page, 'submission');
        const onReturn = await tabs(page);
        await press(page, 'metadata');
        res.afterTopTab = {landedSide: onReturn.side, meta: await metaState(page, app), dialogs: dSince(d0)};
        await press(page, 'disableSubmissions');
        res.afterTopTab.disable = await disableBox(page);
        await press(page, 'metadata');
        await snap(page, `${prefix}-05-after-top-tab`);
        // leave by the side menu and come back by it
        d0 = dialogs.length;
        const trip = await sideMenuRoundTrip(page, `${prefix}-06`);
        const sideOnReturn = trip.back.side;
        await press(page, 'metadata');
        res.afterSideMenu = {trip, sideOnReturn, meta: await metaState(page, app), dialogs: dSince(d0)};
        await press(page, 'disableSubmissions');
        res.afterSideMenu.disable = await disableBox(page);
        await press(page, 'metadata');
        await snap(page, `${prefix}-07-after-side-menu`);
        // the other way out: a reload with the changes unsaved
        res.changeErrors2 = await changeMeta(page, app);
        res.changed2 = await metaState(page, app);
        d0 = dialogs.length;
        await reload(page);
        const t = await tabs(page);
        if (!t.side.includes('Metadata')) await press(page, 'metadata');
        res.afterReload = {tabs: t, meta: await metaState(page, app), dialogs: dSince(d0)};
        await snap(page, `${prefix}-08-after-reload`);
        return res;
    }

    try {
        await signIn(page, `${s}mgr`);
        if (on('r22')) {
            const r = await row22('r22');
            record(`${RUN}-r22`, r);
            log(app.name, RUN, 'r22', JSON.stringify({
                landing: [r.landing.url, r.landing.side], pressed: [r.pressedMetadata.url, r.pressedMetadata.side],
                reload: [r.reloadAfterPress.url, r.reloadAfterPress.side], other: [r.otherTop, r.onOtherTop.url, r.onOtherTop.side],
                back: [r.backOnSubmission.url, r.backOnSubmission.side], reloadTrip: [r.reloadAfterTopTrip.url, r.reloadAfterTopTrip.side],
                pressedAfterTrip: [r.pressedAfterTrip.url, r.pressedAfterTrip.side], reloadPAT: [r.reloadAfterPressAfterTrip.url, r.reloadAfterPressAfterTrip.side],
                typed: Object.fromEntries(Object.entries(r.typed).map(([k, v]) => [k, [v.landed.url, v.landed.top, v.landed.side, '→', v.afterReload.url, v.afterReload.side]])),
            }));
        }
        if (on('r13')) {
            const r = await row13('r13');
            record(`${RUN}-r13`, r);
            log(app.name, RUN, 'r13', JSON.stringify({stored: r.stored, storedDisable: r.storedDisable, errs: [r.changeErrors, r.disableErr],
                changed: r.changed, side: r.afterSideTab, top: r.afterTopTab,
                menu: {left: r.afterSideMenu.trip.left, back: r.afterSideMenu.trip.back.url, sideOnReturn: r.afterSideMenu.sideOnReturn, meta: r.afterSideMenu.meta, disable: r.afterSideMenu.disable, dialogs: r.afterSideMenu.dialogs, errs: [r.afterSideMenu.trip.leaveErr, r.afterSideMenu.trip.backErr]},
                changed2: r.changed2, reload: {side: r.afterReload.tabs.side, url: r.afterReload.tabs.url, meta: r.afterReload.meta, dialogs: r.afterReload.dialogs}}));
            log(app.name, RUN, 'sweep', JSON.stringify(r.sweep));
        }
        if (on('save')) {
            // the saved end of the axis: the same changes saved, read on the page and after a reload
            const res = {};
            await openWorkflow(page, app, s, 'metadata');
            res.changeErrors = await changeMeta(page, app);
            const panel = page.locator('[id="metadata"]');
            const save = panel.getByRole('button', {name: 'Save', exact: true});
            await loc(page, 'Metadata: Save', save);
            const respP = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
            await save.click();
            const resp = await respP;
            res.saveResponse = resp ? {status: resp.status(), method: resp.request().method(), override: resp.request().headers()['x-http-method-override'] || null} : null;
            res.status = await panel.locator('[role="status"]').allInnerTexts().catch(() => []);
            await idle(page);
            res.onPage = await metaState(page, app);
            await snap(page, 'sv-01-saved-on-page');
            await reload(page);
            const t = await tabs(page);
            if (!t.side.includes('Metadata')) await press(page, 'metadata');
            res.afterReload = {tabs: t, meta: await metaState(page, app)};
            await snap(page, 'sv-02-saved-after-reload');
            record(`${RUN}-save`, res);
            log(app.name, RUN, 'save', JSON.stringify(res));
        }
        await signOut(page);
        if (on('editor') && !isOps) {
            // the other manager-level account: an Editor with "Permit changes to Settings"
            await signIn(page, `${s}ed`);
            const res = {};
            res.r22 = await row22('ed-r22');
            // the save phase stored the manager's changes; changeMeta flips away from them
            res.r13 = await row13('ed-r13');
            record(`${RUN}-editor`, res);
            log(app.name, RUN, 'editor', JSON.stringify({
                pressed: res.r22.pressedMetadata.url, reload: res.r22.reloadAfterPress.side, back: res.r22.backOnSubmission.side,
                reloadTrip: res.r22.reloadAfterTopTrip.side,
                typed: Object.fromEntries(Object.entries(res.r22.typed).map(([k, v]) => [k, [v.landed.side, v.afterReload.side]])),
                stored: res.r13.stored, changed: res.r13.changed, side: res.r13.afterSideTab.meta, top: res.r13.afterTopTab.meta,
                menu: res.r13.afterSideMenu.meta, menuDisable: res.r13.afterSideMenu.disable, reload: res.r13.afterReload.meta,
                dialogs: [res.r13.afterSideTab.dialogs, res.r13.afterTopTab.dialogs, res.r13.afterSideMenu.dialogs, res.r13.afterReload.dialogs],
            }));
            await signOut(page);
        }
        record(`${RUN}-dialogs`, dialogs);
    } finally {
        await close();
    }
});
