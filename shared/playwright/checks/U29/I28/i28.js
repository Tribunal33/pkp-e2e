// U29 claim check, chunk I28 (housekeeping 2026-09-28): incidentals row L139,
// "a reload keeps whichever Submission side tab was open; only a Review side
// tab falls back to Disable Submissions" (spec Rule 1, register A4,
// footnotes a and f-a4).
//
// Per app, a scratch context (tag prefix u29i28) with a manager and, where the
// app has the role key, an Editor (manager level). `publicknowledge` is only
// read (manager.maya reloads, no save).
//
// Phases (PHASES=a,b; default all):
//   sweep   scratch manager: every top tab, every side tab: press, reload,
//           record the address and which top/side tab is selected; after a
//           reload on a Review side tab, press "Review" and record which
//           side tab it shows; typed two-part hashes as controls.
//   levels  Editor (scratch), admin (scratch) and manager.maya
//           (publicknowledge): Submission › Metadata and Review › Reviewer
//           Guidance (OPS: Submission › Metadata and Components) reloads.
//   toponly scratch manager: press a top tab only (address `#submission`,
//           `#review`), reload; and Review › Reviewer Guidance › Setup (the
//           default side tab pressed back), reload.
//   leave   scratch manager: an unsaved change on Submission › Metadata and on
//           Review › Setup, then a reload: dialogs, landing tab, value read.
//
// RUN=<n> suffixes every facts name so two runs keep separate files.
//   RUN=1 PROBE_FEATURE=U29 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U29/I28/i28.js

const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag} =
    require('../../../probe');

const RUN = process.env.RUN || '1';
const ALL_PHASES = ['sweep', 'levels', 'leave', 'toponly'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[i28]', new Date().toISOString().slice(11, 19), ...a);

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(`r${RUN}-${name}`, s);
    await shot(page, `r${RUN}-${name}`).catch(() => {});
    return s;
}

async function topTabs(page) {
    return page.locator('main [role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
}

async function sideTabs(page) {
    return page.locator('main [role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els
        .filter((e) => e.offsetParent)
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
}

/** The settled state: address, selected top tab, selected visible side tab, visible side panel's first heading. */
async function state(page) {
    const top = await topTabs(page);
    const side = await sideTabs(page);
    const panel = await page.locator('main [role="tabpanel"]:visible [role="tabpanel"]:visible').first()
        .evaluate((p) => ({id: p.id, head: (p.querySelector('h2, h3, legend, .pkpFormGroup__heading, .pkpHeader__title') || {}).innerText || null}))
        .catch(() => null);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        top: top.filter((t) => t.selected === 'true').map((t) => t.text),
        side: side.filter((t) => t.selected === 'true').map((t) => t.text),
        sideAll: side.map((t) => t.text),
        panel,
    };
}

async function openPage(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/workflow`));
    await idle(page);
    await sleep(800);
}

async function press(page, id) {
    await page.locator(`[id="${id}"]`).first().click({timeout: 15_000});
    await idle(page);
    await sleep(1200);
}

async function reloadSettled(page) {
    await page.reload();
    await idle(page);
    await sleep(2500);
}

/** Press a top tab then a side tab, reload, read. */
async function reloadOn(page, app, ctx, topId, sideId, name) {
    await openPage(page, app, ctx);
    await press(page, topId);
    if (sideId) await press(page, sideId);
    const before = await state(page);
    await reloadSettled(page);
    await snap(page, name);
    const after = await state(page);
    const out = {topId, sideId, before, after};
    if (topId !== 'submission-button') {
        // back to the tab the reload was on: which side tab does it show?
        await press(page, topId).catch(() => {});
        out.afterPressingTop = await state(page);
    }
    return out;
}

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    const PK = app.contextPath;
    const t = tag('u29i28');
    let users = [{username: `${t}mgr`, roles: ['manager']}, {username: `${t}ed`, roles: ['editor']}];
    let ctx;
    try {
        ctx = await app.api.createContext({tag: t, users});
    } catch (e) {
        log(app.name, 'editor key refused, manager only:', String(e.message).slice(0, 200));
        users = [users[0]];
        ctx = await app.api.createContext({tag: t, users});
    }
    const S = ctx.path || t;
    record(`r${RUN}-seed`, {tag: t, contextPath: S, contextId: ctx.contextId, users: users.map((u) => u.username)});
    log(app.name, 'scratch', S);

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), at: page.url().replace(/^https?:\/\/[^/]+/, '')});
        await d.accept().catch(() => {});
    });
    try {
        // ── sweep: scratch manager, every top tab × side tab ──
        if (on('sweep')) {
            const res = {cells: [], typed: []};
            await signIn(page, `${t}mgr`, {contextPath: S});
            await openPage(page, app, S);
            await snap(page, 'landing-mgr');
            res.landing = await state(page);
            const tops = (await topTabs(page)).map((x) => x.id);
            await loc(page, 'Workflow Settings top tabs', page.locator('main [role="tab"][id$="-button"]'));
            for (const topId of tops) {
                await openPage(page, app, S);
                await press(page, topId);
                const sides = (await sideTabs(page)).map((x) => x.id);
                if (!sides.length) {
                    res.cells.push(await reloadOn(page, app, S, topId, null, `rl-${topId}`));
                    continue;
                }
                for (const sideId of sides) {
                    const cell = await reloadOn(page, app, S, topId, sideId, `rl-${topId}-${sideId}`);
                    res.cells.push(cell);
                    log(app.name, topId, sideId, '→', cell.after.url, cell.after.top, cell.after.side, cell.afterPressingTop ? cell.afterPressingTop.side : '');
                }
            }
            // controls: typed two-part hashes, entered from another page
            const typed = ['submission/metadata', 'submission/components'];
            if (!isOps) typed.push('review/reviewerGuidance', 'review/reviewForms');
            for (const h of typed) {
                await page.goto(app.url(`/index.php/${S}/dashboard`)); await idle(page);
                await page.goto(app.url(`/index.php/${S}/management/settings/workflow#${h}`)); await idle(page); await sleep(2000);
                await snap(page, `typed-${h.replace('/', '-')}`);
                const st = await state(page);
                await reloadSettled(page);
                res.typed.push({hash: h, landed: st, afterReload: await state(page)});
            }
            record(`r${RUN}-sweep`, res);
            await signOut(page);
        }

        // ── levels: Editor, admin (scratch) and manager.maya (publicknowledge) ──
        if (on('levels')) {
            const res = {};
            const who = [];
            if (users.length > 1) who.push({user: `${t}ed`, ctx: S, opts: {contextPath: S}});
            who.push({user: 'admin', ctx: S, opts: {}});
            who.push({user: 'manager.maya', ctx: PK, opts: {}});
            const pairs = isOps
                ? [['submission-button', 'metadata-button'], ['submission-button', 'components-button']]
                : [['submission-button', 'metadata-button'], ['review-button', 'reviewerGuidance-button']];
            for (const w of who) {
                await signIn(page, w.user, w.opts);
                res[w.user] = [];
                for (const [top, side] of pairs) {
                    res[w.user].push(await reloadOn(page, app, w.ctx, top, side, `lv-${w.user.replace(/^u29i28\w+?(ed)$/, 'scratch-$1')}-${side}`));
                }
                log(app.name, w.user, JSON.stringify(res[w.user].map((c) => [c.sideId, c.after.top, c.after.side])));
                await signOut(page);
            }
            record(`r${RUN}-levels`, res);
        }

        // ── leave: an unsaved change, then a reload ──
        if (on('leave')) {
            const res = {};
            await signIn(page, `${t}mgr`, {contextPath: S});
            // Submission › Metadata: tick the first unticked box, reload
            await openPage(page, app, S);
            await press(page, 'submission-button');
            await press(page, 'metadata-button');
            const box = page.locator('[id="metadata"] input[type="checkbox"]:visible').first();
            res.metaBoxValue = await box.getAttribute('value').catch(() => null);
            res.metaBoxBefore = await box.isChecked().catch(() => null);
            await box.click().catch((e) => { res.metaClickErr = e.message.slice(0, 120); });
            await page.locator('h1').first().click().catch(() => {});
            res.metaBoxChanged = await box.isChecked().catch(() => null);
            await snap(page, 'lv-meta-unsaved');
            const d0 = dialogs.length;
            await reloadSettled(page);
            res.metaDialogs = dialogs.slice(d0);
            await snap(page, 'lv-meta-after-reload');
            res.metaAfter = await state(page);
            await press(page, 'metadata-button').catch(() => {});
            res.metaBoxAfterReload = await page.locator(`[id="metadata"] input[type="checkbox"][value="${res.metaBoxValue}"]`).first().isChecked().catch(() => null);
            if (!isOps) {
                // Review › Setup: change "Default Response Deadline", reload
                await openPage(page, app, S);
                await press(page, 'review-button');
                await press(page, 'reviewSetup-button');
                const num = page.locator('[id="reviewSetup"] input[name="numWeeksPerResponse"]').first();
                res.setupBefore = await num.inputValue().catch(() => null);
                await num.fill('9').catch((e) => { res.setupFillErr = e.message.slice(0, 120); });
                await num.blur().catch(() => {});
                await snap(page, 'lv-setup-unsaved');
                const d1 = dialogs.length;
                await reloadSettled(page);
                res.setupDialogs = dialogs.slice(d1);
                await snap(page, 'lv-setup-after-reload');
                res.setupAfter = await state(page);
                await press(page, 'review-button');
                res.setupAfterPressingReview = await state(page);
                await press(page, 'reviewSetup-button');
                res.setupValueAfterReload = await num.inputValue().catch(() => null);
            }
            record(`r${RUN}-leave`, res);
            log(app.name, 'leave', JSON.stringify(res));
            await signOut(page);
        }
        // ── toponly: a top tab pressed alone, then a reload ──
        if (on('toponly')) {
            const res = {};
            await signIn(page, `${t}mgr`, {contextPath: S});
            const tops = isOps ? ['submission-button'] : ['submission-button', 'review-button'];
            for (const topId of tops) {
                res[topId] = await reloadOn(page, app, S, topId, null, `top-${topId}`);
                // a side tab pressed first, the top tab pressed again
                await openPage(page, app, S);
                await press(page, topId);
                const sides = (await sideTabs(page)).map((x) => x.id);
                await press(page, sides[2]);
                await press(page, isOps || topId === 'submission-button' ? 'library-button' : 'submission-button');
                await press(page, topId);
                const before = await state(page);
                await reloadSettled(page);
                await snap(page, `top-${topId}-after-away`);
                res[`${topId}-after-away`] = {pressed: sides[2], before, after: await state(page)};
            }
            if (!isOps) {
                await openPage(page, app, S);
                await press(page, 'review-button');
                await press(page, 'reviewerGuidance-button');
                await press(page, 'reviewSetup-button');
                const before = await state(page);
                await reloadSettled(page);
                await snap(page, 'top-review-back-to-setup');
                res.backToSetup = {before, after: await state(page)};
            }
            record(`r${RUN}-toponly`, res);
            log(app.name, 'toponly', JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, [v.before.url.split('#')[1], v.before.top, v.before.side, '=>', v.after.url.split('#')[1], v.after.top, v.after.side]]))));
            await signOut(page);
        }
        record(`r${RUN}-dialogs`, {dialogs});
    } finally {
        await close();
    }
});
