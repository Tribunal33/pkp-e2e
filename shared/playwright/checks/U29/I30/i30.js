// U29 claim check, chunk I30 (housekeeping 2026-09-30, incidentals row R4):
// Settings › Workflow, which side tab a reload opens, on "Submission" and on
// "Review", and the address each case writes.
// Spec: docs/specs/U29-review-setup-and-review-forms.md — Rule 1a (a reload
// after "Review" alone, after a "Submission" side tab, after a "Review" side
// tab), Rule 1b (coming back to "Review"), register A4 and its table row;
// against U58 Rule 1b (a "Submission" side tab after another top tab and
// back). Successor of shared/playwright/checks/U58/I29/i29.js phase r22.
//
// Seeds one scratch context per app and run (tag prefix u29i30): a Journal
// Manager and, on a journal and a press, an Editor (manager level); `admin`
// is the third level. `publicknowledge` is not touched.
//
// Phases (PHASES=sub,rev,leave,save; default all), levels (LEVELS=mgr,ed,admin).
//   PROBE_RUN=r1 PROBE_FEATURE=U29 PROBE_AGENT=ccI30u29 node bin/probe.js all shared/playwright/checks/U29/I30/i30.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['sub', 'rev', 'leave', 'save'];
const LEVELS = process.env.LEVELS ? process.env.LEVELS.split(',') : ['mgr', 'ed', 'admin'];
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[i30]', new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** Top tabs, the visible side tabs, which are selected, and the address. */
async function tabs(page) {
    const top = await page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
    const side = await page.locator('[role="tabpanel"] [role="tab"]').evaluateAll((els) => els
        .filter((e) => e.offsetParent)
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
    return {
        url: rel(page.url()),
        hash: new URL(page.url()).hash,
        top: top.filter((t) => t.selected === 'true').map((t) => t.text),
        side: side.filter((t) => t.selected === 'true').map((t) => t.text),
        topAll: top.map((t) => `${t.id}:${t.text}`),
        sideAll: side.map((t) => `${t.id}:${t.text}`),
    };
}

const short = (t) => `${t.hash || '(none)'} ${t.top.join('/')} › ${t.side.join('/')}`;

async function press(page, id) {
    await page.locator(`[id="${id}-button"]`).first().click();
    await idle(page);
    await sleep(1000);
}

async function reload(page) {
    await page.reload();
    await idle(page);
    await sleep(2000);
}

async function sideIds(page) {
    return page.locator('[role="tabpanel"] [role="tab"]').evaluateAll((els) => els
        .filter((e) => e.offsetParent).map((e) => e.id.replace(/-button$/, '')));
}

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    await app.api.bootstrapProbe(app.contextPath);
    const s = tag(`u29i30${RUN}`);
    const users = [{username: `${s}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}];
    if (!isOps) users.push({username: `${s}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
    await app.api.createContext({tag: s, users});
    record('seed', {[PHASES.join('+')]: {context: s, users: users.map((u) => u.username)}}, {merge: true});
    log(app.name, RUN, 'seeded', s);
    const wf = app.url(`/index.php/${s}/management/settings/workflow`);

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => {
        dialogs.push({at: new Date().toISOString(), type: d.type(), message: d.message().slice(0, 200), url: rel(page.url())});
        d.accept().catch(() => {});
    });
    const dSince = (n) => dialogs.slice(n);
    // The run record's console list fills with TinyMCE deprecation warnings
    // within a minute; console errors are kept here on their own.
    const consoleErrors = [];
    page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push({at: new Date().toISOString(), text: m.text().slice(0, 300), url: rel(page.url())});
    });

    async function land(prefix) {
        await page.goto(app.url(`/index.php/${s}/dashboard`));
        await idle(page);
        await page.goto(wf);
        await idle(page);
        await sleep(800);
        const t = await tabs(page);
        await snap(page, `${prefix}-landing`);
        return t;
    }

    /** "Submission" side tabs: pressed, after another top tab and back, after a side tab pressed again. */
    async function phaseSub(p) {
        const r = {};
        r.landing = await land(`${p}-sub-00`);
        const other = (r.landing.topAll.map((x) => x.split(':')[0]).find((i) => i && i !== 'submission-button') || '').replace(/-button$/, '');
        r.otherTop = other;
        r.sideTabs = r.landing.sideAll;
        r.cases = {};
        for (const side of ['metadata', 'contributorRoles']) {
            const c = {};
            await land(`${p}-sub-${side}-a`);
            await press(page, side);
            c.pressed = await tabs(page);
            await reload(page);
            c.reloadAfterPress = await tabs(page);
            await snap(page, `${p}-sub-${side}-1-reload-after-press`);
            await press(page, other);
            c.onOther = await tabs(page);
            await snap(page, `${p}-sub-${side}-2-other-top`);
            await press(page, 'submission');
            c.back = await tabs(page);
            await snap(page, `${p}-sub-${side}-3-back`);
            await reload(page);
            c.reloadAfterTrip = await tabs(page);
            await snap(page, `${p}-sub-${side}-4-reload-after-trip`);
            // the side tab pressed again after the trip
            await press(page, side);
            c.pressedAgain = await tabs(page);
            await reload(page);
            c.reloadAfterPressAgain = await tabs(page);
            await snap(page, `${p}-sub-${side}-5-reload-after-press-again`);
            r.cases[side] = c;
        }
        return r;
    }

    /** "Review": the tab alone, each side tab, and coming back after "Submission". */
    async function phaseRev(p) {
        const r = {};
        await land(`${p}-rev-00`);
        await press(page, 'review');
        r.reviewAlone = await tabs(page);
        r.reviewSideIds = await sideIds(page);
        await snap(page, `${p}-rev-01-review-alone`);
        await loc(page, 'Workflow Settings: "Review" top tab', page.locator('[id="review-button"]'));
        await reload(page);
        r.reloadAfterReviewAlone = await tabs(page);
        await snap(page, `${p}-rev-02-reload-after-review-alone`);
        // each side tab, pressed from a fresh landing, then a reload, then "Review"
        r.side = {};
        for (const side of r.reviewSideIds) {
            const c = {};
            await land(`${p}-rev-${side}-a`);
            await press(page, 'review');
            await press(page, side);
            c.pressed = await tabs(page);
            await snap(page, `${p}-rev-${side}-1-pressed`);
            await reload(page);
            c.reload = await tabs(page);
            await snap(page, `${p}-rev-${side}-2-reload`);
            await press(page, 'review');
            c.reviewAfterReload = await tabs(page);
            await snap(page, `${p}-rev-${side}-3-review-after-reload`);
            r.side[side] = c;
        }
        // Rule 1b: a side tab, "Submission", "Review" again, then a reload
        r.comeBack = {};
        for (const side of r.reviewSideIds.filter((x) => x !== 'reviewSetup')) {
            const c = {};
            await land(`${p}-rev-back-${side}-a`);
            await press(page, 'review');
            await press(page, side);
            c.pressed = await tabs(page);
            await press(page, 'submission');
            c.onSubmission = await tabs(page);
            await press(page, 'review');
            c.back = await tabs(page);
            await snap(page, `${p}-rev-back-${side}-1-back`);
            await reload(page);
            c.reload = await tabs(page);
            await snap(page, `${p}-rev-back-${side}-2-reload`);
            r.comeBack[side] = c;
        }
        return r;
    }

    /** Leave a tab once with something changed and unsaved: another side tab, another top tab, a reload. */
    async function phaseLeave(p) {
        const r = {};
        await land(`${p}-leave-00`);
        if (isOps) {
            const box = page.locator('input[name="disableSubmissions"]').first();
            r.stored = await box.isChecked().catch(() => null);
            await box.setChecked(!r.stored).catch((e) => { r.err = e.message.slice(0, 120); });
            r.changed = await box.isChecked().catch(() => null);
            let d0 = dialogs.length;
            await press(page, 'metadata');
            await press(page, 'disableSubmissions');
            r.afterSide = {v: await box.isChecked().catch(() => null), dialogs: dSince(d0)};
            d0 = dialogs.length;
            const other = (await tabs(page)).topAll.map((x) => x.split(':')[0]).find((i) => i && i !== 'submission-button').replace(/-button$/, '');
            await press(page, other);
            await press(page, 'submission');
            await press(page, 'disableSubmissions');
            r.afterTop = {v: await box.isChecked().catch(() => null), dialogs: dSince(d0)};
            await snap(page, `${p}-leave-01-after-trip`);
            d0 = dialogs.length;
            await reload(page);
            await press(page, 'disableSubmissions');
            r.afterReload = {v: await box.isChecked().catch(() => null), tabs: await tabs(page), dialogs: dSince(d0)};
            await snap(page, `${p}-leave-02-after-reload`);
            return r;
        }
        await press(page, 'review');
        await press(page, 'reviewSetup');
        const form = page.getByRole('tabpanel', {name: 'Setup', exact: true}).locator('form').first();
        const box = form.getByLabel('Default Response Deadline');
        await box.waitFor({timeout: 30000}).catch(() => {});
        await loc(page, 'Review › Setup: "Default Response Deadline"', box);
        r.stored = await box.inputValue().catch(() => null);
        await box.fill('7').catch((e) => { r.err = e.message.slice(0, 120); });
        r.changed = await box.inputValue().catch(() => null);
        let d0 = dialogs.length;
        await press(page, 'reviewerGuidance');
        await press(page, 'reviewSetup');
        r.afterSide = {v: await box.inputValue().catch(() => null), dialogs: dSince(d0)};
        d0 = dialogs.length;
        await press(page, 'submission');
        await press(page, 'review');
        r.afterTop = {v: await box.inputValue().catch(() => null), tabs: await tabs(page), dialogs: dSince(d0)};
        await snap(page, `${p}-leave-01-after-trip`);
        d0 = dialogs.length;
        await reload(page);
        r.reloadTabs = await tabs(page);
        await press(page, 'review');
        await press(page, 'reviewSetup');
        r.afterReload = {v: await box.inputValue().catch(() => null), tabs: await tabs(page), dialogs: dSince(d0)};
        await snap(page, `${p}-leave-02-after-reload`);
        return r;
    }


    /** A4 "reloads after a save": save a side tab, read on the page, reload, read again. */
    async function saveAndReload(p, top, side, formPanel, read, change) {
        const r = {top, side};
        await land(`${p}-save-${side}-00`);
        if (top !== 'submission') await press(page, top);
        await press(page, side);
        const panel = page.locator(`[id="${formPanel}"]`);
        r.before = await read(panel);
        await change(panel, r.before);
        const save = panel.getByRole('button', {name: 'Save', exact: true}).first();
        await loc(page, `Workflow Settings › ${side}: Save`, save);
        const respP = page.waitForResponse((x) => /\/api\/v1\/contexts\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await save.click();
        const resp = await respP;
        r.saveResponse = resp ? {status: resp.status(), method: resp.request().method(), override: resp.request().headers()['x-http-method-override'] || null} : null;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10000}).catch(() => {});
        r.status = await panel.locator('[role="status"]').allInnerTexts().catch(() => []);
        r.onPage = {value: await read(panel), tabs: await tabs(page)};
        await snap(page, `${p}-save-${side}-01-saved-on-page`);
        await reload(page);
        r.reloadTabs = await tabs(page);
        await snap(page, `${p}-save-${side}-02-after-reload`);
        if (top !== 'submission') await press(page, top);
        r.afterPressTop = await tabs(page);
        await press(page, side);
        r.afterReload = {value: await read(panel), tabs: await tabs(page)};
        await snap(page, `${p}-save-${side}-03-after-reload-reopened`);
        return r;
    }
    const readDeadline = (panel) => panel.getByLabel('Default Response Deadline').inputValue().catch(() => null);
    const changeDeadline = (panel, v) => panel.getByLabel('Default Response Deadline').fill(String(v === '5' ? 6 : 5));
    const readCoverage = (panel) => panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null);
    const changeCoverage = (panel, v) => panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).setChecked(!v);

    const who = {mgr: `${s}mgr`, ed: `${s}ed`, admin: 'admin'};
    try {
        for (const lvl of LEVELS) {
            if (lvl === 'ed' && isOps) continue;
            await signIn(page, who[lvl]);
            const out = {user: who[lvl]};
            if (on('sub')) {
                out.sub = await phaseSub(lvl);
                log(app.name, RUN, lvl, 'sub', JSON.stringify({other: out.sub.otherTop,
                    cases: Object.fromEntries(Object.entries(out.sub.cases).map(([k, c]) => [k,
                        [short(c.pressed), '|R', short(c.reloadAfterPress), '|other', short(c.onOther), '|back', short(c.back),
                            '|R', short(c.reloadAfterTrip), '|again', short(c.pressedAgain), '|R', short(c.reloadAfterPressAgain)].join(' ')]))}));
            }
            if (on('rev') && !isOps) {
                out.rev = await phaseRev(lvl);
                log(app.name, RUN, lvl, 'rev', JSON.stringify({
                    alone: short(out.rev.reviewAlone), reloadAlone: short(out.rev.reloadAfterReviewAlone), sideIds: out.rev.reviewSideIds,
                    side: Object.fromEntries(Object.entries(out.rev.side).map(([k, c]) => [k,
                        [short(c.pressed), '|R', short(c.reload), '|Review', short(c.reviewAfterReload)].join(' ')])),
                    back: Object.fromEntries(Object.entries(out.rev.comeBack).map(([k, c]) => [k,
                        [short(c.pressed), '|Sub', short(c.onSubmission), '|Review', short(c.back), '|R', short(c.reload)].join(' ')])),
                }));
            }
            if (on('leave')) {
                out.leave = await phaseLeave(lvl);
                log(app.name, RUN, lvl, 'leave', JSON.stringify(out.leave));
            }
            if (on('save')) {
                out.save = {metadata: await saveAndReload(lvl, 'submission', 'metadata', 'metadata', readCoverage, changeCoverage)};
                if (!isOps) out.save.reviewSetup = await saveAndReload(lvl, 'review', 'reviewSetup', 'reviewSetup', readDeadline, changeDeadline);
                log(app.name, RUN, lvl, 'save', JSON.stringify(Object.fromEntries(Object.entries(out.save).map(([k, v]) => [k, {
                    before: v.before, resp: v.saveResponse, status: v.status, onPage: [v.onPage.value, short(v.onPage.tabs)],
                    reload: short(v.reloadTabs), pressTop: short(v.afterPressTop), after: [v.afterReload.value, short(v.afterReload.tabs)]}]))));
            }
            record(`levels-${lvl}`, out, {merge: true});
            await signOut(page);
        }
        record('dialogs', dialogs, {merge: false});
        record('console-errors', consoleErrors);
        log(app.name, RUN, 'console errors', consoleErrors.length, 'dialogs', dialogs.length);
    } finally {
        await close();
    }
});
