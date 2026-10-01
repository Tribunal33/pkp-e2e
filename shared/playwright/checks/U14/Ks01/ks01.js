// U14 claim check Ks01 (upstream sync, pkp/pkp-lib#13422 "Refine comments
// rendering - mainly author section"): what a comment shows about its writer.
//
//   PROBE_FEATURE=U14 PROBE_AGENT=ccKs01 PROBE_RUN=r1 node bin/probe.js ojs shared/playwright/checks/U14/Ks01/ks01.js
//
// OJS alone has the landing-page blocks; the Comments page's comment panel and
// report panel (another component) are read here as the control. One process
// seeds its own scratch journal and drives every phase:
//
//   seed     readers on both ends of each axis: ORCID iD verified / not
//            verified / none, each with and without an affiliation; article
//            S1 with one approved comment by each and two pending ones;
//            article S2 shaped as scenario 2 (a pending comment by the
//            verified, affiliated Reader, an approved one, an approved one
//            reported by a verified and by an unverified Reader)
//   anon     S1 signed out: every comment's writer part as data (texts,
//            the link's address, name, target, icon, the line each sits on),
//            and a press on the verified and the unverified icon
//   levels   S1 signed in as each writer, an uninvolved Reader, an Author, a
//            Reviewer, a Section Editor, the Journal Manager, the Site Admin
//   panel    the Comments page: the table, each writer's comment panel, the
//            two report panels
//   write    the verified, affiliated Reader writes through the box (read at
//            once and after a reload); the unverified one too
//   approve  scenario 2: the pending comment's panel, "Approve Comment", the
//            landing page signed out after it; the newest-first order on S1
//   profile  affiliation renamed, added, cleared; a name changed; a preferred
//            public name set: the landing page and the panel on the next load
//   leave    the box left with text typed (the sweep's way out)
//   panelicons  the panels' ORCID row as markup and picture (read-only; any time after seed)
//   orcid    a journal of its own with ORCID on: the writer deletes the iD
//            on Profile › Identity; the landing page and the panel after it
//
//   PHASES=seed,anon,… narrows; later phases reuse the state file of the seed phase.

const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile} = require('../../../probe');

const ALL_PHASES = ['seed', 'anon', 'levels', 'panel', 'write', 'approve', 'profile', 'leave', 'orcid', 'panelicons'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[ks01]', ...a);

const BOX_LABEL = 'What do you think about this publication? Type your comments here.';
const ORCID_V = 'https://orcid.org/0000-0002-1825-0097';
const ORCID_V2 = 'https://orcid.org/0000-0002-1694-233X';
const ORCID_U = 'https://orcid.org/0000-0001-5109-3700';
const ORCID_U2 = 'https://orcid.org/0000-0002-9079-593X';

async function textOf(locator) {
    try {
        if ((await locator.count()) === 0) return null;
        return (await locator.first().innerText()).trim();
    } catch { return null; }
}

/** One link as data: what it reads, where it leads, its icon, where it sits. */
const linkData = (a) => a.evaluate((el) => {
    // The landing page's link holds its icon; the panels' icon sits before the link.
    const prev = el.previousElementSibling;
    const icon = el.querySelector('svg, img') || (prev && /^(svg|img)$/i.test(prev.tagName) ? prev : null);
    const iconInside = !!el.querySelector('svg, img');
    const rect = (r) => r ? {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)} : null;
    return {
        href: el.getAttribute('href'),
        resolved: el.href,
        text: el.innerText.trim(),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        target: el.getAttribute('target'),
        rel: el.getAttribute('rel'),
        class: el.getAttribute('class'),
        rect: rect(el.getBoundingClientRect()),
        iconInside,
        icon: icon ? {
            tag: icon.tagName.toLowerCase(),
            class: icon.getAttribute('class'),
            ariaLabel: icon.getAttribute('aria-label'),
            ariaHidden: icon.getAttribute('aria-hidden'),
            title: icon.querySelector('title') ? icon.querySelector('title').textContent : null,
            paths: icon.querySelectorAll('path').length,
            fills: [...icon.querySelectorAll('[fill]')].map((p) => p.getAttribute('fill')),
            html: icon.outerHTML.replace(/\s+/g, ' ').slice(0, 1200),
            rect: rect(icon.getBoundingClientRect()),
        } : null,
    };
});

/** The landing page's comments as data, the writer part in detail. */
async function readComments(page) {
    const section = page.locator('#public-comments');
    const out = {sectionCount: await section.count()};
    if (!out.sectionCount) return out;
    out.parts = [];
    for (const h of await section.getByRole('heading', {level: 3}).all()) {
        out.parts.push({label: (await h.innerText()).trim(), expanded: await h.getByRole('button').getAttribute('aria-expanded')});
    }
    out.comments = [];
    for (const article of await section.locator('article').all()) {
        const footer = article.locator('footer');
        const links = [];
        for (const a of await footer.locator('a').all()) links.push(await linkData(a));
        out.comments.push({
            visible: await article.isVisible(),
            notice: await textOf(article.locator('[class*="NeedsApproval"]')),
            time: await textOf(article.locator('time')),
            body: await textOf(article.locator('[class*="messageBody"]')),
            menuButtons: await article.getByRole('button').count(),
            lines: (await article.innerText()).trim().split('\n').map((s) => s.trim()).filter(Boolean),
            footerText: await textOf(footer),
            footerHtml: (await footer.first().evaluate((el) => el.outerHTML.replace(/\s+/g, ' ')).catch(() => null)),
            name: await textOf(footer.locator('[class*="authorName"] > span').first()),
            nameWhole: await textOf(footer.locator('[class*="authorName"]')),
            affiliationCount: await footer.locator('[class*="authorAffiliation"]').count(),
            affiliation: await textOf(footer.locator('[class*="authorAffiliation"]')),
            links,
            layout: await footer.first().evaluate((el) => {
                const r = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}; };
                return {
                    footer: r(el),
                    name: r(el.querySelector('[class*="authorName"] > span')),
                    orcid: r(el.querySelector('a')),
                    affiliation: r(el.querySelector('[class*="authorAffiliation"]')),
                };
            }).catch(() => null),
        });
    }
    const sidebar = page.locator('.entry_details .item.comments');
    out.sidebar = {count: await sidebar.count(), link: await textOf(sidebar.getByRole('link', {name: /^All Comments/}))};
    return out;
}

const brief = (blocks) => (blocks.comments || []).map((c) => [c.body, c.name, c.links.map((l) => `${l.href}|${l.text}|${l.icon && l.icon.class}`).join(','), c.affiliation, c.notice].filter((x) => x !== null && x !== ''));

async function landing(page, app, ctx, id, name, {shotToo = false} = {}) {
    await page.goto(app.url(`/index.php/${ctx}/article/view/${id}`));
    await idle(page);
    const s = await screen(page);
    const blocks = await readComments(page);
    record(name, {screen: s, blocks});
    if (shotToo) await shot(page, name);
    return blocks;
}

/** The open panel (comment or report) as data. */
async function readPanel(page) {
    const dialog = page.getByRole('dialog').last();
    const links = [];
    for (const a of await dialog.locator('a').all()) {
        const d = await linkData(a);
        if (/docs\.pkp\.sfu\.ca/.test(d.href || '')) continue;
        links.push(d);
    }
    return {
        url: page.url(),
        links,
        buttons: await dialog.getByRole('button').evaluateAll((els) => els.map((b) => ({text: b.innerText.trim() || b.getAttribute('aria-label'), disabled: b.disabled}))),
        text: (await dialog.innerText()).trim(),
    };
}

async function commentsPage(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/userComments`));
    await idle(page);
}

async function openCommentPanel(page, commentText) {
    const row = page.getByRole('row').filter({hasText: commentText}).first();
    await row.getByRole('button', {name: 'More Actions'}).click();
    await sleep(300);
    await page.getByRole('menuitem', {name: 'View Comment'}).click();
    await page.getByRole('dialog').getByText('Comment preview').waitFor({timeout: 20_000});
    await idle(page);
    await sleep(400);
}

async function closePanel(page) {
    await page.getByRole('dialog').last().getByRole('button', {name: 'Close'}).first().click();
    await sleep(600);
    await idle(page);
}

/** Press a link that opens elsewhere and say where the browser went; orcid.org is answered by a stub (the test install has no outside network). */
async function pressLink(page, link) {
    const context = page.context();
    const requests = [];
    const handler = async (route) => {
        requests.push(route.request().url());
        await route.fulfill({status: 200, contentType: 'text/html', body: '<title>stub</title>stub for orcid.org'});
    };
    await context.route(/^https?:\/\/orcid\.org\//, handler);
    const before = page.url();
    const popupWait = context.waitForEvent('page', {timeout: 6000}).catch(() => null);
    let error = null;
    await link.click({timeout: 8000}).catch((e) => { error = String(e).slice(0, 300); });
    const popup = await popupWait;
    let popupUrl = null;
    if (popup) {
        await popup.waitForLoadState('domcontentloaded', {timeout: 8000}).catch(() => {});
        popupUrl = popup.url();
        await popup.close().catch(() => {});
    }
    await sleep(500);
    const after = page.url();
    await context.unroute(/^https?:\/\/orcid\.org\//, handler);
    return {before, after, sameTab: before !== after, popupUrl, requests, error};
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') { log(`${app.name}: no landing-page blocks; not driven by this script`); return; }
    const stateFile = outFile('ks01-state.json');
    let st = {};

    // ── seed ───────────────────────────────────────────────────────────────
    if (on('seed')) {
        const t = tag('u14s01');
        const users = [
            {username: `${t}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Manager'},
            {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Sectioned'},
            {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Author'},
            {username: `${t}rev`, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Reviewer'},
            {username: `${t}rd`, roles: ['reader'], givenName: 'Rob', familyName: 'Bystander'},
            {username: `${t}va`, roles: ['reader'], givenName: 'Vera', familyName: 'Verified', orcid: ORCID_V, orcidIsVerified: true, affiliation: 'Ks01 Verified Institute'},
            {username: `${t}vn`, roles: ['reader'], givenName: 'Vince', familyName: 'Verifiedbare', orcid: ORCID_V2, orcidIsVerified: true},
            {username: `${t}ua`, roles: ['reader'], givenName: 'Uma', familyName: 'Unverified', orcid: ORCID_U, orcidIsVerified: false, affiliation: 'Ks01 Unverified College'},
            {username: `${t}un`, roles: ['reader'], givenName: 'Ugo', familyName: 'Unverifiedbare', orcid: ORCID_U2, orcidIsVerified: false},
            {username: `${t}na`, roles: ['reader'], givenName: 'Nora', familyName: 'Noid', affiliation: 'Ks01 Plain University'},
            {username: `${t}nn`, roles: ['reader'], givenName: 'Nils', familyName: 'Nothing'},
        ];
        st.tag = t;
        st.context = await app.api.createContext({tag: t, enablePublicComments: true, users});
        st.s1 = await app.api.createSubmission({
            tag: `${t}s1`, context: t, submitter: `${t}au`, published: true, title: `Ks01 article one ${t}`,
            userComments: [
                {user: `${t}va`, text: 'Ks01 approved by verified with affiliation.', approved: true},
                {user: `${t}vn`, text: 'Ks01 approved by verified without affiliation.', approved: true},
                {user: `${t}ua`, text: 'Ks01 approved by unverified with affiliation.', approved: true},
                {user: `${t}un`, text: 'Ks01 approved by unverified without affiliation.', approved: true},
                {user: `${t}na`, text: 'Ks01 approved by no iD with affiliation.', approved: true},
                {user: `${t}nn`, text: 'Ks01 approved by no iD without affiliation.', approved: true},
                {user: `${t}un`, text: 'Ks01 pending by unverified without affiliation.'},
                {user: `${t}nn`, text: 'Ks01 pending by no iD without affiliation.'},
            ],
        });
        st.s2 = await app.api.createSubmission({
            tag: `${t}s2`, context: t, submitter: `${t}au`, published: true, title: `Ks01 article two ${t}`,
            userComments: [
                {user: `${t}va`, text: 'Ks01 scenario two pending by the verified Reader.'},
                {user: `${t}nn`, text: 'Ks01 scenario two approved.', approved: true},
                {user: `${t}na`, text: 'Ks01 scenario two approved and reported.', approved: true, reports: [
                    {user: `${t}ua`, note: 'Ks01 report by the unverified Reader.'},
                    {user: `${t}va`, note: 'Ks01 report by the verified Reader.'},
                    {user: `${t}nn`, note: 'Ks01 report by the Reader with no iD.'},
                ]},
            ],
        });
        fs.writeFileSync(stateFile, JSON.stringify(st, null, 2));
        record('seed', st);
        log('seeded', t, st.s1.submissionId, st.s2.submissionId);
    } else {
        st = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
    const t = st.tag;
    const ctx = t;
    const s1 = st.s1.submissionId;
    const s2 = st.s2.submissionId;
    const U = (x) => `${t}${x}`;

    const {page, close} = await launch(app);
    try {
        // ── anon: the landing page signed out ───────────────────────────────
        if (on('anon')) {
            const b = await landing(page, app, ctx, s1, 'anon-s1', {shotToo: true});
            log('anon s1', JSON.stringify(b.parts), JSON.stringify(brief(b)));
            const section = page.locator('#public-comments');
            await loc(page, 'a comment (landing page)', section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}));
            await loc(page, "a comment's writer name", section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}).locator('footer [class*="authorName"] > span').first());
            await loc(page, "a comment's ORCID iD icon link", section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}).getByRole('link', {name: 'ORCID iD'}));
            await loc(page, "a comment's affiliation line", section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}).locator('footer [class*="authorAffiliation"]'));
            await loc(page, 'every ORCID iD link in the comments', section.getByRole('link', {name: 'ORCID iD'}));
            // One comment's picture per end of the iD axis.
            for (const [key, text] of [['va', 'Ks01 approved by verified with affiliation.'], ['ua', 'Ks01 approved by unverified with affiliation.'], ['vn', 'Ks01 approved by verified without affiliation.'], ['nn', 'Ks01 approved by no iD without affiliation.']]) {
                await section.locator('article').filter({hasText: text}).first().screenshot({path: outFile(`anon-s1-comment-${key}.png`)}).catch(() => {});
            }
            // Hover and focus: what the icon says to a pointer and a keyboard.
            const vLink = section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}).locator('footer a').first();
            const uLink = section.locator('article').filter({hasText: 'Ks01 approved by unverified with affiliation.'}).locator('footer a').first();
            await vLink.hover().catch(() => {});
            await sleep(700);
            const hover = {tooltips: await page.locator('[role="tooltip"]:visible').allInnerTexts(), aria: await section.locator('article').filter({hasText: 'Ks01 approved by verified with affiliation.'}).ariaSnapshot()};
            record('anon-s1-icon-hover', hover);
            // Press each end.
            const pressV = await pressLink(page, vLink);
            await page.goto(app.url(`/index.php/${ctx}/article/view/${s1}`)); await idle(page);
            const pressU = await pressLink(page, section.locator('article').filter({hasText: 'Ks01 approved by unverified with affiliation.'}).locator('footer a').first());
            record('anon-s1-icon-press', {verified: pressV, unverified: pressU});
            log('press', JSON.stringify(pressV), JSON.stringify(pressU));
            // Scenario 2's article before the approval.
            const b2 = await landing(page, app, ctx, s2, 'anon-s2-before-approval');
            log('anon s2', JSON.stringify(b2.parts), b2.sidebar.link, JSON.stringify(brief(b2)));
        }

        // ── levels: the same page per permission level and per writer ────────
        if (on('levels')) {
            for (const [key, user, where] of [
                ['va', U('va'), {contextPath: ctx}], ['un', U('un'), {contextPath: ctx}], ['nn', U('nn'), {contextPath: ctx}],
                ['rd', U('rd'), {contextPath: ctx}], ['au', U('au'), {contextPath: ctx}], ['rev', U('rev'), {contextPath: ctx}],
                ['se', U('se'), {contextPath: ctx}], ['mgr', U('mgr'), {contextPath: ctx}], ['admin', 'admin', {}],
            ]) {
                await signIn(page, user, where);
                const b = await landing(page, app, ctx, s1, `level-${key}-s1`, {shotToo: ['va', 'un'].includes(key)});
                log('level', key, JSON.stringify(b.parts), JSON.stringify(brief(b)));
                // The sweep: what a comment's "…" offers this viewer, on another's comment and on one's own.
                const menus = {};
                for (const [mk, text] of [['other', 'Ks01 approved by no iD with affiliation.'], ['ownApproved', key === 'va' ? 'Ks01 approved by verified with affiliation.' : key === 'un' ? 'Ks01 approved by unverified without affiliation.' : key === 'nn' ? 'Ks01 approved by no iD without affiliation.' : null], ['ownPending', key === 'un' ? 'Ks01 pending by unverified without affiliation.' : key === 'nn' ? 'Ks01 pending by no iD without affiliation.' : null]]) {
                    if (!text) continue;
                    const article = page.locator('#public-comments article').filter({hasText: text}).first();
                    if (!(await article.count()) || !(await article.getByRole('button').count())) { menus[mk] = null; continue; }
                    await article.getByRole('button').first().click();
                    await sleep(300);
                    menus[mk] = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
                    await page.keyboard.press('Escape');
                    await sleep(200);
                }
                record(`level-${key}-s1-menus`, menus);
                // The Report dialog's first line names the writer: read it on a writer with an iD and an affiliation.
                if (key === 'rd') {
                    for (const [rk, text] of [['va', 'Ks01 approved by verified with affiliation.'], ['ua', 'Ks01 approved by unverified with affiliation.'], ['nn', 'Ks01 approved by no iD without affiliation.']]) {
                        const article = page.locator('#public-comments article').filter({hasText: text}).first();
                        await article.getByRole('button').first().click();
                        await sleep(300);
                        await page.getByRole('menuitem', {name: 'Report'}).click();
                        await page.getByRole('dialog').waitFor({timeout: 10_000});
                        await sleep(300);
                        const dialog = page.getByRole('dialog').last();
                        const links = [];
                        for (const a of await dialog.locator('a').all()) links.push(await linkData(a));
                        record(`level-rd-report-dialog-${rk}`, {screen: await screen(page), links, html: await dialog.evaluate((el) => el.innerHTML.replace(/\s+/g, ' ').slice(0, 6000))});
                        await dialog.getByRole('button', {name: 'Cancel'}).click();
                        await sleep(400);
                    }
                }
                await signOut(page);
            }
        }

        // ── panel: the Comments page ─────────────────────────────────────────
        if (on('panel')) {
            await signIn(page, U('mgr'), {contextPath: ctx});
            await commentsPage(page, app, ctx);
            record('mgr-comments-page', await screen(page));
            await shot(page, 'mgr-comments-page');
            await loc(page, 'a Comments page row by its comment text', page.getByRole('row').filter({hasText: 'Ks01 approved by verified with affiliation.'}));
            const panels = {};
            for (const [key, text] of [
                ['va', 'Ks01 approved by verified with affiliation.'], ['vn', 'Ks01 approved by verified without affiliation.'],
                ['ua', 'Ks01 approved by unverified with affiliation.'], ['un', 'Ks01 approved by unverified without affiliation.'],
                ['na', 'Ks01 approved by no iD with affiliation.'], ['nn', 'Ks01 approved by no iD without affiliation.'],
                ['un-pending', 'Ks01 pending by unverified without affiliation.'],
            ]) {
                await openCommentPanel(page, text);
                record(`mgr-panel-${key}`, {screen: await screen(page), panel: await readPanel(page)});
                panels[key] = (await readPanel(page)).links.map((l) => [l.href, l.text, l.icon && l.icon.class, l.target]);
                if (['va', 'ua'].includes(key)) {
                    await shot(page, `mgr-panel-${key}`);
                    const link = page.getByRole('dialog').last().locator('a[href*="orcid.org"]').first();
                    await loc(page, "the comment panel's ORCID iD link", link);
                    record(`mgr-panel-${key}-press`, await pressLink(page, link));
                }
                await closePanel(page);
            }
            log('panels', JSON.stringify(panels));
            // The report panels: a verified, an unverified reporter and one with no iD.
            await page.getByRole('tab', {name: 'Reported'}).click();
            await idle(page);
            await openCommentPanel(page, 'Ks01 scenario two approved and reported.');
            record('mgr-panel-reported', {screen: await screen(page), panel: await readPanel(page)});
            const reports = {};
            for (const [key, reason] of [['ua', 'Ks01 report by the unverified Reader.'], ['va', 'Ks01 report by the verified Reader.'], ['nn', 'Ks01 report by the Reader with no iD.']]) {
                const row = page.getByRole('dialog').last().getByRole('row').filter({hasText: reason}).first();
                await row.getByRole('button', {name: 'More Actions'}).click();
                await sleep(300);
                await page.getByRole('menuitem', {name: 'View Report'}).click();
                await page.getByRole('dialog').getByText('Report preview').waitFor({timeout: 20_000});
                await idle(page);
                await sleep(400);
                const panel = await readPanel(page);
                record(`mgr-report-panel-${key}`, {screen: await screen(page), panel});
                reports[key] = panel.links.map((l) => [l.href, l.text, l.icon && l.icon.class]);
                if (key === 'ua') await shot(page, 'mgr-report-panel-ua');
                await closePanel(page);
            }
            log('report panels', JSON.stringify(reports));
            await signOut(page);
        }

        // ── write: through the box, read at once and after a reload ─────────
        if (on('write')) {
            for (const [key, text] of [['va', 'Ks01 written through the box by the verified Reader.'], ['un', 'Ks01 written through the box by the unverified Reader.']]) {
                await signIn(page, U(key), {contextPath: ctx});
                await page.goto(app.url(`/index.php/${ctx}/article/view/${s1}`));
                await idle(page);
                const box = page.getByRole('textbox', {name: BOX_LABEL});
                await box.fill(text);
                const posted = page.waitForResponse((r) => /\/comments(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).then((r) => ({status: r.status(), url: r.url()})).catch((e) => ({error: String(e).slice(0, 200)}));
                await page.locator('#public-comments').getByRole('button', {name: 'Submit', exact: true}).click();
                const answer = await posted;
                await idle(page);
                await sleep(500);
                const atOnce = await readComments(page);
                record(`write-${key}-at-once`, {answer, screen: await screen(page), blocks: atOnce});
                await shot(page, `write-${key}-at-once`);
                const reloaded = await landing(page, app, ctx, s1, `write-${key}-reloaded`);
                log('write', key, JSON.stringify(answer), 'at once', JSON.stringify(brief(atOnce)[0]), 'reload', JSON.stringify(brief(reloaded)[0]));
                await signOut(page);
                await sleep(1200);   // the two written comments a second apart, for the order
            }
        }

        // ── approve: scenario 2 and the newest-first order ──────────────────
        if (on('approve')) {
            await signIn(page, U('mgr'), {contextPath: ctx});
            await commentsPage(page, app, ctx);
            await page.getByRole('tab', {name: 'Hidden/Needs Approval'}).click();
            await idle(page);
            record('approve-pending-tab', await screen(page));
            await openCommentPanel(page, 'Ks01 scenario two pending by the verified Reader.');
            record('approve-s2-panel-pending', {screen: await screen(page), panel: await readPanel(page)});
            await shot(page, 'approve-s2-panel-pending');
            const approved = page.waitForResponse((r) => /setApproval/.test(r.url()), {timeout: 20_000}).then((r) => ({status: r.status(), url: r.url()})).catch((e) => ({error: String(e).slice(0, 200)}));
            await page.getByRole('dialog').last().getByRole('button', {name: 'Approve Comment'}).click();
            const answer = await approved;
            await idle(page);
            record('approve-s2-after', {answer, screen: await screen(page)});
            // The two written comments on S1 too, the verified one first so the unverified one is not the newest by approval.
            for (const text of ['Ks01 written through the box by the unverified Reader.', 'Ks01 written through the box by the verified Reader.']) {
                await commentsPage(page, app, ctx);
                await page.getByRole('tab', {name: 'Hidden/Needs Approval'}).click();
                await idle(page);
                if (!(await page.getByRole('row').filter({hasText: text}).count())) { log('approve: no row', text); continue; }
                await openCommentPanel(page, text);
                record(`approve-s1-panel-${/unverified/.test(text) ? 'un' : 'va'}`, {screen: await screen(page), panel: await readPanel(page)});
                await page.getByRole('dialog').last().getByRole('button', {name: 'Approve Comment'}).click();
                await sleep(800);
                await idle(page);
            }
            await signOut(page);
            const b2 = await landing(page, app, ctx, s2, 'anon-s2-after-approval', {shotToo: true});
            log('anon s2 after', JSON.stringify(b2.parts), b2.sidebar.link, JSON.stringify(brief(b2)));
            const b1 = await landing(page, app, ctx, s1, 'anon-s1-after-approval');
            log('anon s1 after', JSON.stringify(b1.parts), JSON.stringify(b1.comments.map((c) => [c.time, c.body])));
        }

        // ── profile: the comment follows the profile at the next load ───────
        if (on('profile')) {
            const {ProfilePage} = require('../../../pages/ProfilePage.js');
            const contact = async (user, key, fn) => {
                await signIn(page, user, {contextPath: ctx});
                const profile = new ProfilePage(page, ctx);
                await profile.goto('contact');
                record(`profile-${key}-contact-before`, await screen(page));
                await fn(profile);
                await profile.save();
                await idle(page);
                record(`profile-${key}-contact-saved`, {screen: await screen(page), affiliation: await profile.affiliation('en').inputValue(), country: await profile.country().inputValue()});
                await signOut(page);
            };
            // 1. va renames the affiliation.
            await contact(U('va'), 'va-rename', async (p) => { await p.country().selectOption({label: 'Canada'}); await p.affiliation('en').fill('Ks01 Renamed Institute'); });
            // 2. nn adds one.
            await contact(U('nn'), 'nn-add', async (p) => { await p.country().selectOption({label: 'Canada'}); await p.affiliation('en').fill('Ks01 Added Academy'); });
            // 3. na clears hers.
            await contact(U('na'), 'na-clear', async (p) => { await p.country().selectOption({label: 'Canada'}); await p.affiliation('en').fill(''); });
            const b1 = await landing(page, app, ctx, s1, 'profile-anon-s1-affiliations', {shotToo: true});
            log('after affiliations', JSON.stringify(b1.comments.map((c) => [c.name, c.affiliationCount, c.affiliation])));
            // 4. ua changes the given name; va sets a preferred public name.
            const identity = async (user, key, fn) => {
                await signIn(page, user, {contextPath: ctx});
                const profile = new ProfilePage(page, ctx);
                await profile.goto('identity');
                record(`profile-${key}-identity-before`, await screen(page));
                await fn(profile);
                await profile.save();
                await idle(page);
                record(`profile-${key}-identity-saved`, {screen: await screen(page)});
                await signOut(page);
            };
            await identity(U('ua'), 'ua-name', async (p) => { await p.givenName('en').fill('Ursula'); });
            const b2 = await landing(page, app, ctx, s1, 'profile-anon-s1-given-name');
            log('after given name', JSON.stringify(b2.comments.map((c) => c.name)));
            await identity(U('va'), 'va-public-name', async (p) => { await p.preferredPublicName('en').fill('Dr V. Verified'); });
            const b3 = await landing(page, app, ctx, s1, 'profile-anon-s1-public-name');
            log('after public name', JSON.stringify(b3.comments.map((c) => c.name)));
            // The writer herself, signed in, on the same load.
            await signIn(page, U('va'), {contextPath: ctx});
            const b4 = await landing(page, app, ctx, s1, 'profile-va-s1-after');
            log('va after', JSON.stringify(b4.comments.filter((c) => /verified with affiliation|verified Reader/.test(c.body || '')).map((c) => [c.name, c.affiliation])));
            await signOut(page);
            // The panel on the next load.
            await signIn(page, U('mgr'), {contextPath: ctx});
            await commentsPage(page, app, ctx);
            record('profile-mgr-comments-page', await screen(page));
            for (const [key, text] of [['va', 'Ks01 approved by verified with affiliation.'], ['nn', 'Ks01 approved by no iD without affiliation.'], ['na', 'Ks01 approved by no iD with affiliation.'], ['ua', 'Ks01 approved by unverified with affiliation.']]) {
                await openCommentPanel(page, text);
                const panel = await readPanel(page);
                record(`profile-mgr-panel-${key}`, {screen: await screen(page), panel});
                log('panel after profile', key, JSON.stringify(panel.text.split('\n').filter(Boolean).slice(0, 14)));
                await closePanel(page);
            }
            await signOut(page);
        }

        // ── leave: the box left with text typed ─────────────────────────────
        if (on('leave')) {
            const dialogs = [];
            const onDialog = async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
            page.on('dialog', onDialog);
            await signIn(page, U('rd'), {contextPath: ctx});
            await page.goto(app.url(`/index.php/${ctx}/article/view/${s1}`));
            await idle(page);
            const box = page.getByRole('textbox', {name: BOX_LABEL});
            await box.fill('Ks01 typed and never submitted.');
            await page.locator('h1').first().click();   // the box loses the focus
            await sleep(300);
            await page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Archives'}).click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            const away = page.url();
            await page.goBack();
            await idle(page);
            const backValue = await page.getByRole('textbox', {name: BOX_LABEL}).inputValue().catch(() => null);
            const b = await landing(page, app, ctx, s1, 'leave-rd-s1-after');
            record('leave-rd-s1', {dialogs, away, boxAfterBack: backValue, boxAfterReload: await page.getByRole('textbox', {name: BOX_LABEL}).inputValue().catch(() => null), listed: b.comments.map((c) => c.body)});
            log('leave', JSON.stringify(dialogs), away, JSON.stringify(backValue));
            page.off('dialog', onDialog);
            await signOut(page);
        }

        // ── panelicons: the panels' ORCID row, markup and picture ───────────
        if (on('panelicons')) {
            await signIn(page, U('mgr'), {contextPath: ctx});
            await commentsPage(page, app, ctx);
            const rows = {};
            for (const [key, text] of [['va', 'Ks01 approved by verified with affiliation.'], ['ua', 'Ks01 approved by unverified with affiliation.']]) {
                await openCommentPanel(page, text);
                const link = page.getByRole('dialog').last().locator('a[href*="orcid.org"]').first();
                const row = link.locator('xpath=..');
                rows[key] = {
                    html: await row.evaluate((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 2500)),
                    icon: await row.locator('svg, img').first().evaluate((el) => ({tag: el.tagName.toLowerCase(), class: el.getAttribute('class'), use: el.querySelector('use') ? el.querySelector('use').getAttribute('href') : null, html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 1500), ariaLabel: el.getAttribute('aria-label'), ariaHidden: el.getAttribute('aria-hidden')})).catch(() => null),
                    block: await row.locator('xpath=..').innerText(),
                };
                await row.screenshot({path: outFile(`mgr-panel-orcid-row-${key}.png`)}).catch(() => {});
                await closePanel(page);
            }
            record('mgr-panel-orcid-rows', rows);
            log('panel rows', JSON.stringify(rows).slice(0, 1500));
            await signOut(page);
        }

        // ── orcid: the iD removed on the profile (its own journal, ORCID on) ─
        if (on('orcid')) {
            const {ProfilePage} = require('../../../pages/ProfilePage.js');
            const o = tag('u14s01o');
            await app.api.createContext({tag: o, enablePublicComments: true, orcid: {enabled: true}, users: [
                {username: `${o}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Manager'},
                {username: `${o}au`, roles: ['author'], givenName: 'Alex', familyName: 'Author'},
                {username: `${o}ov`, roles: ['reader'], givenName: 'Olga', familyName: 'Orcidverified', orcid: ORCID_V, orcidIsVerified: true},
                {username: `${o}ou`, roles: ['reader'], givenName: 'Otto', familyName: 'Orcidunverified', orcid: ORCID_U, orcidIsVerified: false},
            ]});
            const os = await app.api.createSubmission({
                tag: `${o}s1`, context: o, submitter: `${o}au`, published: true, title: `Ks01 orcid article ${o}`,
                userComments: [
                    {user: `${o}ov`, text: 'Ks01 orcid journal: by the verified Reader.', approved: true},
                    {user: `${o}ou`, text: 'Ks01 orcid journal: by the unverified Reader.', approved: true},
                ],
            });
            record('orcid-seed', {tag: o, submission: os});
            const before = await landing(page, app, o, os.submissionId, 'orcid-anon-before');
            log('orcid before', JSON.stringify(brief(before)));
            for (const key of ['ov', 'ou']) {
                await signIn(page, `${o}${key}`, {contextPath: o});
                const profile = new ProfilePage(page, o);
                await profile.goto('identity');
                await idle(page);
                record(`orcid-${key}-identity-before`, await screen(page));
                const del = profile.form('identity').getByRole('button', {name: 'Delete', exact: true});
                const count = await del.count();
                let dialogText = null;
                if (count) {
                    await del.first().click();
                    await sleep(600);
                    const dialog = page.getByRole('dialog').last();
                    dialogText = await dialog.innerText().catch(() => null);
                    record(`orcid-${key}-delete-dialog`, await screen(page));
                    await dialog.getByRole('button', {name: 'OK', exact: true}).click();   // the dialog "Confirm": "OK" / "Cancel"
                    await sleep(800);
                    await idle(page);
                }
                record(`orcid-${key}-identity-after`, {deleteButtons: count, dialogText, screen: await screen(page)});
                const own = await landing(page, app, o, os.submissionId, `orcid-${key}-landing-after`);
                log('orcid', key, 'delete buttons', count, JSON.stringify(dialogText), JSON.stringify(brief(own)));
                await signOut(page);
            }
            const after = await landing(page, app, o, os.submissionId, 'orcid-anon-after', {shotToo: true});
            log('orcid after', JSON.stringify(brief(after)));
            await signIn(page, `${o}mgr`, {contextPath: o});
            await commentsPage(page, app, o);
            for (const [key, text] of [['ov', 'Ks01 orcid journal: by the verified Reader.'], ['ou', 'Ks01 orcid journal: by the unverified Reader.']]) {
                await openCommentPanel(page, text);
                const panel = await readPanel(page);
                record(`orcid-mgr-panel-${key}-after`, {screen: await screen(page), panel});
                log('orcid panel after', key, JSON.stringify(panel.links.map((l) => l.href)));
                await closePanel(page);
            }
            await signOut(page);
        }
    } finally {
        await close();
    }
});
