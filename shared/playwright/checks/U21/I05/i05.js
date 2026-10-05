// U21 claim check, housekeeping chunk I05 (2026-10-05): incidentals row R020. "Make a Submission" (the start page)
// at phone width: is the "Title" box squeezed to nothing by the editorial side navigation, so no title can be typed?
// Axis: the window width, driven at 375 (the sighting), 600, 768, 1024 and 1280 (the kit's default) for the
// Author; at 375 and 1280 also for a Journal Manager, a Reader and a signed-in user with no role in the context
// (no side navigation is drawn for a user with no role there: backend.tpl's `menu` block).
// Per read: the side navigation's, main region's and Title box's boxes, the page's sideways scroll, and whether a
// title typed into the box (a click on it, then the keyboard) lands. At 375 the Author then tries to start the
// submission ("Begin Submission"); at 1280 the Author leaves the start page with a title typed and unsaved.
//
//   PROBE_FEATURE=U21 PROBE_AGENT=ccI05 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U21/I05/i05.js
// Each run seeds its own scratch context (tag prefix u21i05) with its users; publicknowledge is never touched.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const RUN = process.env.PROBE_RUN || 'r1';
const T = 30_000;
const TITLE_ID = 'startSubmission-title-control';
const WIDTHS_AUTHOR = [375, 600, 768, 1024, 1280];
const WIDTHS_OTHER = [375, 1280];
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log(`[i05 ${RUN}]`, ...a);

async function geometry(page) {
    return page.evaluate((id) => {
        const box = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height)};
        };
        const nav = document.querySelector('.app__body > nav');
        const iframe = document.getElementById(`${id}_ifr`);
        const field = iframe ? iframe.closest('.pkpFormField') : null;
        const begin = [...document.querySelectorAll('button')].find((b) => /Begin Submission/.test(b.textContent));
        const main = document.getElementById('app-main');
        // What runs past the window's right edge (the page's sideways scroll), outermost first, five at most.
        const over = [];
        for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > window.innerWidth + 1 && !over.some((o) => o.el.contains(el))) over.push({el, right: Math.round(r.right)});
            if (over.length >= 5) break;
        }
        return {
            overflow: over.map((o) => ({tag: o.el.tagName.toLowerCase(), cls: String(o.el.className || '').slice(0, 80), right: o.right})),
            viewport: window.innerWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            sideNav: box(nav),
            main: box(main),
            mainScrollWidth: main ? main.scrollWidth : null,
            titleField: box(field),
            titleEditor: box(iframe),
            beginButton: box(begin),
            headerButtons: [...document.querySelectorAll('header button, header a')].filter((b) => b.offsetParent)
                .map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
        };
    }, TITLE_ID);
}

async function tryType(page, text) {
    const r = {};
    try {
        await page.locator(`#${TITLE_ID}_ifr`).waitFor({state: 'attached', timeout: T});
        await waitForEditorReady(page, TITLE_ID);
        await page.frameLocator(`#${TITLE_ID}_ifr`).locator('body').click({timeout: 5000});
        r.click = 'ok';
        await page.keyboard.type(text);
    } catch (e) {
        r.click = `failed: ${flat(e.message.split('\n')[0], 200)}`;
    }
    r.content = await page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), TITLE_ID).catch(() => null);
    r.landed = r.content === text;
    return r;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const t = tag('u21i05');
    const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
    const body = {tag: t, context: {name: `U21 I05 ${t}`, contactName: 'I05 Contact', contactEmail: `${t}contact@mail.test`},
        users: [U('mg', ['manager'], 'Mira', 'Manager'), U('au', ['author'], 'Ava', 'Author'), U('rd', ['reader'], 'Rex', 'Reader')]};
    if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
    if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
    const C = await app.api.createContext(body);
    const ctx = C.path || t;
    // A signed-in user with no role in the scratch context: a second scratch context's user.
    const t2 = `${t}x`;
    const C2 = await app.api.createContext({tag: t2, context: {name: `U21 I05 other ${t}`, contactName: 'I05 Other', contactEmail: `${t2}contact@mail.test`},
        users: [U('nr', ['author'], 'Nora', 'Norole')], ...(isOJS ? {sections: [{abbrev: 'ART', title: 'Articles'}]} : {}), ...(isOPS ? {sections: [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}]} : {})});
    const facts = {app: app.name, run: RUN, ctx, otherCtx: C2.path || t2, reads: {}};
    const roles = [
        {key: 'author', user: `${t}au`, signCtx: ctx, widths: WIDTHS_AUTHOR},
        {key: 'manager', user: `${t}mg`, signCtx: ctx, widths: WIDTHS_OTHER},
        {key: 'reader', user: `${t}rd`, signCtx: ctx, widths: WIDTHS_OTHER},
        {key: 'norole', user: `${t}nr`, signCtx: C2.path || t2, widths: WIDTHS_OTHER},
    ];
    const startURL = app.url(`/index.php/${ctx}/en/submission`);
    for (const role of roles) {
        const {page, close} = await launch(app);
        const dialogs = [];
        page.on('dialog', async (d) => {
            dialogs.push({type: d.type(), message: flat(d.message())});
            await d.accept().catch(() => {});
        });
        try {
            await signIn(page, role.user, {contextPath: role.signCtx});
            await idle(page).catch(() => {});
            for (const w of role.widths) {
                const name = `${role.key}-${w}`;
                await page.setViewportSize({width: w, height: w <= 600 ? 812 : 900});
                await page.goto(startURL);
                await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
                await idle(page);
                await waitForEditorReady(page, TITLE_ID).catch(() => {});
                const s = await screen(page);
                const g = await geometry(page);
                s.geometry = g;
                record(`${name}-start`, s);
                await shot(page, `${name}-start`).catch(() => {});
                const typed = await tryType(page, `u21i05 ${role.key} ${w}`);
                const after = await geometry(page);
                const read = {geometry: g, typed, docScrollAfterType: after.docScrollWidth, notices: s.notices};
                facts.reads[name] = read;
                await shot(page, `${name}-typed`).catch(() => {});
                log(app.name, name, JSON.stringify({nav: g.sideNav, main: g.main, title: g.titleEditor, field: g.titleField, doc: g.docScrollWidth, typed}));
                if (role.key === 'author' && w === 375) {
                    await loc(page, 'Make a Submission at 375 px: the Title editor iframe', page.locator(`#${TITLE_ID}_ifr`));
                    await loc(page, 'the side navigation (.app__body > nav)', page.locator('.app__body > nav'));
                    // Try to start the submission at phone width, the way the screen offers it.
                    const begin = {};
                    for (const nm of [/meets all of these requirements/, /agree to have my data collected/]) {
                        const b = page.getByRole('checkbox', {name: nm});
                        if (await b.count()) await b.check({timeout: 5000}).then(() => { begin[String(nm)] = 'checked'; }).catch((e) => { begin[String(nm)] = `failed: ${flat(e.message.split('\n')[0], 160)}`; });
                    }
                    const sec = page.getByRole('radio', {name: isOJS ? 'Articles' : 'Preprints', exact: true});
                    if (!app.name.startsWith('omp') && await sec.count()) await sec.check({timeout: 5000}).catch(() => {});
                    try {
                        await page.getByRole('button', {name: 'Begin Submission'}).click({timeout: 5000});
                        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 20_000});
                        await page.locator('.pkpSteps').waitFor({timeout: T});
                        await idle(page);
                        begin.outcome = `wizard opened, id ${new URL(page.url()).searchParams.get('id')}`;
                    } catch (e) {
                        await idle(page).catch(() => {});
                        begin.outcome = `no wizard: ${flat(e.message.split('\n')[0], 160)}`;
                    }
                    const sb = await screen(page);
                    record(`${name}-begin`, sb);
                    await shot(page, `${name}-begin`).catch(() => {});
                    begin.url = page.url();
                    // The error summary's "Go to Title" link, then the keyboard: does a title land that way?
                    const goTo = page.getByRole('link', {name: /Go to Title/}).or(page.getByRole('button', {name: /Go to Title/})).first();
                    if (await goTo.count()) {
                        await goTo.click({timeout: 5000}).then(() => { begin.goToTitle = 'clicked'; }).catch((e) => { begin.goToTitle = `failed: ${flat(e.message.split('\n')[0], 160)}`; });
                        begin.focusAfterGoTo = await page.evaluate(() => (document.activeElement ? `${document.activeElement.tagName}#${document.activeElement.id}` : null));
                        await page.keyboard.type('u21i05 via go to');
                        begin.contentAfterGoTo = await page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), TITLE_ID).catch(() => null);
                    } else {
                        begin.goToTitle = 'absent';
                    }
                    begin.notices = sb.notices;
                    begin.errorsOnPage = flat(sb.text && sb.text.main ? (sb.text.main.match(/[^\n]*(required|must)[^\n]*/gi) || []).join(' | ') : null, 400);
                    facts.reads[name].begin = begin;
                    log(app.name, name, 'begin', JSON.stringify(begin));
                }
                if (role.key === 'author' && w === 1280) {
                    // Leave the start page with a title typed and nothing pressed.
                    const before = dialogs.length;
                    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/mySubmissions`)).catch(() => {});
                    await idle(page).catch(() => {});
                    facts.reads[name].leave = {url: page.url(), dialogs: dialogs.slice(before)};
                    record(`${name}-left`, await screen(page));
                }
            }
            await signOut(page).catch(() => {});
        } catch (e) {
            facts[`${role.key}Error`] = flat(e.stack || e, 600);
            await shot(page, `${role.key}-error`).catch(() => {});
        } finally {
            facts[`${role.key}Dialogs`] = dialogs;
            await close();
        }
    }
    record('facts', facts);
});
