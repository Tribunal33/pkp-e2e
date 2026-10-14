// U17 UA1 — liveness of UNASSIGNED AFFW-076 (OJS templates/submission/form/sectionPolicy.tpl,
// "@deprecated 3.4": a fbvFormSection titled "Section Policy" with class "section-policy section-id-<id>").
// Question: does any screen that shows a section's policy carry that block, or a start-a-submission
// offer beside a policy that the live "Make a Submission" form does not account for?
//
// OJS, OPS: a scratch context per run with "UA1 Policy" (policy text) and "UA1 Bare" (no policy),
//   a manager (mg) and an author (au). Screens, as visitor, Author, Journal Manager:
//   About › Submissions; "Make a Submission" (before a pick, each section picked, then left unsaved);
//   the "Make a new submission to the … section." link where shown; OPS the section pages;
//   OJS publicknowledge's current issue and archive (read-only, visitor).
// OMP (read-only control on publicknowledge): About › Submissions, the series pages, "Make a Submission"
//   as author.alex (opened, nothing picked or saved).
//
// Run: PROBE_FEATURE=U17 PROBE_AGENT=ccUA1 PROBE_RUN=r1 bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U17/UA1/ua1.js
'use strict';
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, idle, tag} = require('../../../probe');

const log = (...a) => console.log('[ua1]', ...a);

// What every screen is scanned for: the deprecated block's markup and label, the live policy blocks,
// and every link that starts a submission (with the text around it).
async function scan(page) {
    return page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const body = document.body ? document.body.innerText : '';
        return {
            deprecatedBlock: [...document.querySelectorAll('.section-policy, [class*="section-id-"]')].map((e) => ({cls: e.className, text: t(e.innerText).slice(0, 200)})),
            sectionPolicyLabel: /Section Policy/i.test(body),
            policyBlocks: [...document.querySelectorAll('.section_policy')].map((e) => t(e.innerText).slice(0, 300)),
            startLinks: [...document.querySelectorAll('a[href]')].filter((a) => /\/submission(\?|$|\/(?!s\b))|sectionId=|seriesId=/.test(a.getAttribute('href')) && vis(a))
                .map((a) => ({text: t(a.innerText), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, ''), around: t((a.closest('p, li, div') || a).innerText).slice(0, 200)})),
            radios: [...document.querySelectorAll('input[type=radio][name="sectionId"], input[type=radio][name="seriesId"]')].map((r) => ({
                value: r.value, checked: r.checked, label: t((r.closest('label') || {}).innerText || ''),
            })),
            hiddenSection: [...document.querySelectorAll('input[type=hidden][name="sectionId"], input[type=hidden][name="seriesId"]')].map((h) => h.value),
        };
    });
}

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOJS = app.name === 'ojs';
    const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 600)); };

    // ------------------------------------------------------------------ seed (OJS, OPS)
    let ctx = app.contextPath;
    let mg = 'manager.maya';
    let au = 'author.alex';
    if (!isOMP) {
        const t = tag('u17ua1');
        const r = await app.api.createContext({
            tag: t,
            context: {name: `U17 UA1 ${isOJS ? 'journal' : 'server'} ${t}`, acronym: 'UAONE'},
            sections: [
                {abbrev: 'POL', title: 'UA1 Policy', ...(isOJS ? {} : {path: 'ua1pol'}), policy: 'UA1 policy text for the Policy section.'},
                {abbrev: 'BAR', title: 'UA1 Bare', ...(isOJS ? {} : {path: 'ua1bar'})},
            ],
            users: [
                {username: `${t}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
                {username: `${t}au`, roles: ['author'], givenName: 'Amy', familyName: 'Author'},
            ],
        });
        ctx = r.path || t;
        mg = `${t}mg`;
        au = `${t}au`;
        fact('seed', {ctx, mg, au});
    }

    const {page, close} = await launch(app);
    let who = 'visitor';
    const as = async (user) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = user; };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };
    const visit = async (name, path, {png = false} = {}) => {
        const resp = await page.goto(app.url(path), {waitUntil: 'load'}).catch((e) => ({status: () => String(e.message).slice(0, 120)}));
        await idle(page).catch(() => {});
        const s = await screen(page);
        const sc = await scan(page);
        s.ua1 = sc;
        s.status = resp && resp.status ? resp.status() : null;
        s.landed = strip(page.url());
        const nm = `${name}-${who.replace(/^u17ua1[a-z0-9]*?(mg|au)$/, '$1')}`;
        record(nm, s);
        if (png) await shot(page, nm).catch(() => {});
        fact(nm, {status: s.status, landed: s.landed, deprecatedBlock: sc.deprecatedBlock.length, sectionPolicyLabel: sc.sectionPolicyLabel,
            policyBlocks: sc.policyBlocks, startLinks: sc.startLinks, radios: sc.radios, hiddenSection: sc.hiddenSection});
        return sc;
    };

    try {
        const roles = isOMP ? ['visitor', au] : ['visitor', au, mg];
        for (const role of roles) {
            if (role === 'visitor') await visitor(); else await as(role);

            // About › Submissions: the policy list and its per-section offer
            const about = await visit('about-submissions', `/index.php/${ctx}/about/submissions`, {png: true});

            if (isOMP) {
                for (const s of ['monographs', 'textbooks']) await visit(`series-${s}`, `/index.php/${ctx}/catalog/series/${s}`);
            } else if (!isOJS) {
                for (const s of ['ua1pol', 'ua1bar']) await visit(`section-${s}`, `/index.php/${ctx}/preprints/section/${s}`);
            }
            if (isOJS && role === 'visitor') {
                ctx = app.contextPath;
                await visit('pk-issue-current', `/index.php/${ctx}/issue/current`);
                await visit('pk-issue-archive', `/index.php/${ctx}/issue/archive`);
                ctx = facts.seed.ctx;
            }

            if (role === 'visitor') {
                await visit('start-form', `/index.php/${ctx}/submission`);
                continue;
            }

            // The live start form: before a pick, then each section picked, then left with the pick unsaved
            const start = await visit('start-form', `/index.php/${ctx}/submission`, {png: true});
            if (!isOMP) {
                for (const r of start.radios) {
                    const radio = page.locator(`input[type=radio][name="sectionId"][value="${r.value}"]`);
                    await radio.check({force: true}).catch((e) => log('check failed', r.value, e.message));
                    await idle(page).catch(() => {});
                    const nm = `start-picked-${r.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
                    const s = await screen(page);
                    s.ua1 = await scan(page);
                    s.ua1.formText = (await page.locator('form').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1200);
                    record(`${nm}-${who.replace(/^u17ua1[a-z0-9]*?(mg|au)$/, '$1')}`, s);
                    fact(`${nm}-${who.replace(/^u17ua1[a-z0-9]*?(mg|au)$/, '$1')}`, {deprecatedBlock: s.ua1.deprecatedBlock, sectionPolicyLabel: s.ua1.sectionPolicyLabel,
                        policyShown: /UA1 policy text/.test(s.ua1.formText), formHead: s.ua1.formText.slice(0, 400)});
                }
                // leave with the pick unsaved: dialogs land in the run record
                await page.goto(app.url(`/index.php/${ctx}/about/submissions`)).catch(() => {});
                await idle(page).catch(() => {});
                fact(`left-start-unsaved-${who.replace(/^u17ua1[a-z0-9]*?(mg|au)$/, '$1')}`, {landed: strip(page.url())});

                // The About page's per-section offer, followed as the screen offers it
                const fresh = await scan(page);
                for (const l of fresh.startLinks.filter((x) => /sectionId=/.test(x.href))) {
                    await page.locator(`a[href$="${l.href.split('/').pop()}"]`).first().click().catch((e) => log('click failed', e.message));
                    await page.waitForLoadState('load').catch(() => {});
                    await idle(page).catch(() => {});
                    const s = await screen(page);
                    s.ua1 = await scan(page);
                    const nm = `followed-${l.href.match(/sectionId=(\d+)/)[1]}-${who.replace(/^u17ua1[a-z0-9]*?(mg|au)$/, '$1')}`;
                    record(nm, s);
                    fact(nm, {from: l.text, around: l.around, landed: strip(page.url()), radios: s.ua1.radios, deprecatedBlock: s.ua1.deprecatedBlock.length});
                    await page.goBack().catch(() => {});
                    await idle(page).catch(() => {});
                }
            }
        }
        record('ua1-facts', facts);
    } finally {
        await close();
    }
    if (process.env.PROBE_RUN === 'r1') {
        note(`About › Submissions and Make a Submission (${app.name}): policy blocks are '.section_policy' (h2 title + policy, then "Make a new submission to the <a> … section." only when signed in); the deprecated sectionPolicy.tpl would carry class 'section-policy section-id-<id>' and the label "Section Policy": scan both. Start form radios: input[type=radio][name="sectionId"]; check({force:true}) works.`);
    }
});
