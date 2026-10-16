// U04 drift sweep 2026-10-16, chunk SW2 (.reports/U04/sweep-chunks.md): Rules 5-7, 9-10 and
// scenarios S2, S3, S6 of docs/specs/U04-orcid-integration.md; footnotes c, d, f, h, i, o, s and
// the register entries A2, A3, A4, A8, A13, A15. The verification landing and the What-is-ORCID
// page (Rules 9-10, S6) are mostly settled by the kept I05 script (shared/playwright/checks/U04/I05);
// this script drives what I05 does not.
//
// Seeds its own scratch context per run and app: ORCID on (Public Sandbox, the dummy pair), the
// author-email toggle on; one throwaway account per permission level with no iD (manager,
// sectionEditor, externalReviewer, copyeditor, author, reader; OPS: manager, sectionEditor,
// editorialBoardMember, author, reader), three with a verified iD (v1 S3's Delete, v2 Delete with
// an unsaved change, v3 the popup's returns) and one with an unauthenticated iD (u1). Phases:
//   levels    every level (and `admin`): the Identity tab's ORCID block, "Create or Connect your
//             ORCID iD" pressed (popup address and size, the tab's own address), the "What is
//             ORCID?" link pressed (A4).
//   states    v1: the verified block, "Delete" -> the window -> "Cancel" (same page, reload),
//             "Delete" -> "OK" (same page, reload, the account's settings, the revoke job);
//             u1: the unauthenticated block, its "Authorize and Connect" popup, the iD link,
//             the tab's "Save" pressed with nothing changed (same page, reload, settings);
//             v2: Given Name changed and not saved, then "Delete" -> "OK";
//             author: Given Name changed and not saved, another tab and back, then another page.
//   popupret  v3: the popup's return address (its redirect_uri) loaded in the popup the two ways
//             ORCID returns a browser, Deny (error=access_denied) and Authorize (code=...), on
//             the fleet as it is (outbound HTTP dead): the popup, the profile, the settings.
//   register  signed out: the journal's Register page (block position, About link with typed
//             values, Connect popup), the popup's return with a code, a registration without
//             connecting, the new account's Identity tab; the site's Register page (control).
//   deny      the emailed link's Deny (Rule 6b): a contributor with no iD asked by "Request
//             verification" (all apps) and, OJS and OMP, a contributor holding an unauthenticated
//             iD asked by the Accept decision (toggle on), each link opened signed out with
//             error=access_denied; the contributor's settings before and after.
//   pages     signed out: `orcid/about` and `orcid/verify` on publicknowledge (ORCID off, read
//             only) and the scratch context (header, footer, title), and a tampered link.
// No step reaches ORCID: the browser's requests to orcid.org are answered locally
// (shared/playwright/support/orcid.js) and the app server's outbound calls die at the dead-port
// [proxy]. Facts: .reports/U04/ccSW2/sw2-facts-<run>-<app>.json.
//   PROBE_RUN=r1 PROBE_FEATURE=U04 PROBE_AGENT=ccSW2 node bin/probe.js all shared/playwright/checks/U04/SW2/sw2.js
//   PROBE_RUN=r2 …   (PHASES=levels,states,… narrows; ONLY=ojs narrows the apps)
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql,
    serverLog, drainJobs, outFile, rawKeys} = require('../../../probe');
const {stubOrcidSite} = require('../../../support/orcid');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'levels,states,popupret,register,deny,pages').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
// Reads of a locator that may be absent: never wait out an actionability timeout.
const txt = async (l, n = 400) => ((await l.count()) ? flat(await l.first().innerText({timeout: 3000}).catch(() => null), n) : null);
const attr = async (l, a) => ((await l.count()) ? l.first().getAttribute(a, {timeout: 3000}).catch(() => null) : null);
const val = async (l) => ((await l.count()) ? l.first().inputValue({timeout: 3000}).catch(() => null) : null);
const ORCID_ID = 'https://sandbox.orcid.org/0000-0002-1825-0097';
const DENIAL = 'error=access_denied&error_description=User%20denied%20access';
const CODE = 'code=u04sw2';
const QUESTION = 'Are you sure you want to remove this ORCID?';

const LEVELS = {
    ojs: ['manager', 'sectionEditor', 'externalReviewer', 'copyeditor', 'author', 'reader'],
    omp: ['manager', 'sectionEditor', 'externalReviewer', 'copyeditor', 'author', 'reader'],
    ops: ['manager', 'sectionEditor', 'editorialBoardMember', 'author', 'reader'],
};
const short = (role) => ({manager: 'mg', sectionEditor: 'se', externalReviewer: 'rv', copyeditor: 'ce',
    editorialBoardMember: 'eb', author: 'au', reader: 'rd'}[role]);

forEachApp(async (app) => {
    const sf = outFile('sw2-state');
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => {
        record('sw2-facts', {[k]: v}, {merge: true});
        console.log(`[u04 sw2 ${RUN} ${app.name}] ${k}:`, flat(JSON.stringify(v), 1800));
    };
    const log = serverLog(app);
    const userOrcid = (username) => sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken') then '(set)' else s.setting_value end from users u join user_settings s on s.user_id=u.user_id where u.username='${username}' and s.setting_name like 'orcid%' order by 1`).split('\n').filter(Boolean);
    const userName = (username) => sql(app, `select s.setting_value from users u join user_settings s on s.user_id=u.user_id where u.username='${username}' and s.setting_name='givenName' limit 1`);
    const revokeJobs = () => Number(sql(app, `select count(*) from jobs where payload like '%RevokeOrcidToken%'`)) || 0;

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u04sw2');
        S.t = t;
        const levelUsers = LEVELS[app.name].map((role) => ({username: `${t}${short(role)}`, roles: [role],
            givenName: role.charAt(0).toUpperCase() + role.slice(1), familyName: 'Level'}));
        const c = await app.api.createContext({
            tag: t,
            context: {name: `U04 SW2 ${t}`, acronym: 'USW'},
            orcid: {enabled: true, apiType: 'publicSandbox', sendMailToAuthorsOnPublication: true},
            users: [
                ...levelUsers,
                {username: `${t}v1`, roles: ['author'], givenName: 'Vera', familyName: 'One', orcid: ORCID_ID, orcidIsVerified: true},
                {username: `${t}v2`, roles: ['author'], givenName: 'Vera', familyName: 'Two', orcid: ORCID_ID, orcidIsVerified: true},
                {username: `${t}v3`, roles: ['author'], givenName: 'Vera', familyName: 'Three', orcid: ORCID_ID, orcidIsVerified: true},
                {username: `${t}u1`, roles: ['author'], givenName: 'Una', familyName: 'One', orcid: ORCID_ID, orcidIsVerified: false},
                {username: `${t}cb`, roles: ['author'], givenName: 'Cleo', familyName: 'Contributor'},
                {username: `${t}cu`, roles: ['author'], givenName: 'Cora', familyName: 'Unverified'},
            ],
        });
        S.path = c.path || t;
        S.levels = LEVELS[app.name].map((role) => ({role, username: `${t}${short(role)}`}));
        S.seeded = true;
        save();
        fact('seed', {path: S.path, levels: S.levels});
    }
    const t = S.t;
    const P = S.path;
    const u = (p) => app.url(`/index.php/${P}${p}`);

    // The Identity tab, settled on the form the tab loads.
    const openIdentity = async (page) => {
        await page.goto(u('/user/profile'));
        await page.locator('form#identityForm').waitFor({timeout: T});
        await idle(page);
    };
    // What the Identity tab's ORCID block holds.
    const readBlock = async (page) => {
        const form = page.locator('form#identityForm');
        const box = form.locator('.orcid_container');
        const icon = async (l) => ((await l.locator('svg').count()) ? l.locator('svg').first().evaluate((s) => s.outerHTML.replace(/\s+/g, ' ').slice(0, 160)).catch(() => null) : null);
        const about = box.getByRole('link', {name: 'What is ORCID?'});
        const vlink = form.locator('#orcid-link');
        const ulink = box.locator('a[target="_blank"]:not(#orcid-link)');
        const del = form.locator('#deleteOrcidButton');
        const input = form.locator('input[name="orcid"]');
        return {
            containers: await box.count(),
            label: await txt(box.locator('label'), 80),
            text: await txt(box, 400),
            connect: await form.locator('#connect-orcid-button').count(),
            connectText: await txt(form.locator('#connect-orcid-button'), 80),
            aboutLinks: await about.count(),
            aboutHref: rel(await attr(about, 'href')),
            verifiedLink: await vlink.count(),
            verifiedLinkText: await txt(vlink, 120),
            verifiedLinkHref: await attr(vlink, 'href'),
            verifiedIcon: await icon(vlink),
            unauthLink: await ulink.count(),
            unauthLinkText: await txt(ulink, 120),
            unauthLinkHref: await attr(ulink, 'href'),
            unauthIcon: await icon(ulink),
            connectIcon: await icon(form.locator('#connect-orcid-button')),
            deleteButtons: await del.count(),
            deleteText: await txt(del, 40),
            deleteVisible: (await del.count()) ? await del.first().isVisible() : false,
            orcidInputType: await attr(input, 'type'),
            orcidInputValue: await val(input),
            buttons: (await form.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
            url: rel(page.url()),
        };
    };
    // Press a control that runs openORCID(); return the popup's address and size.
    const pressPopup = async (page, control) => {
        await stubOrcidSite(page.context());
        const before = rel(page.url());
        const [popup] = await Promise.all([page.waitForEvent('popup', {timeout: T}), control.click()]);
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await sleep(500);
        const size = await popup.evaluate(() => ({outerWidth: window.outerWidth, outerHeight: window.outerHeight,
            innerWidth: window.innerWidth, innerHeight: window.innerHeight})).catch((e) => ({error: flat(e.message, 120)}));
        const addr = popup.url();
        let q = {};
        try {
            const x = new URL(addr);
            q = {host: x.host, path: x.pathname, client_id: x.searchParams.get('client_id'), scope: x.searchParams.get('scope'),
                response_type: x.searchParams.get('response_type'), redirect_uri: rel(x.searchParams.get('redirect_uri')),
                redirectFull: x.searchParams.get('redirect_uri')};
        } catch (e) { /* not a URL */ }
        await sleep(300);
        return {popup, out: {popupUrlParts: q, popupSize: size, pageBefore: before, pageAfter: rel(page.url()),
            pagesInContext: page.context().pages().length}};
    };

    // ------------------------------------------------------------------ levels (Rule 5 no-iD state, S2, A4)
    if (on('levels')) {
        const who = [...S.levels, {role: 'siteAdmin', username: 'admin'}];
        const {page, close} = await launch(app);
        try {
            for (const {role, username} of who) {
                await signIn(page, username, username === 'admin' ? {} : {contextPath: P});
                await openIdentity(page);
                const s = await screen(page);
                record(`sw2-levels-${role}-identity`, s);
                await shot(page, `sw2-levels-${role}-identity`).catch(() => {});
                const block = await readBlock(page);
                const form = page.locator('form#identityForm');
                const connect = await pressPopup(page, form.locator('#connect-orcid-button'));
                await connect.popup.close().catch(() => {});
                await sleep(300);
                const about = await pressPopup(page, form.locator('.orcid_container').getByRole('link', {name: 'What is ORCID?'}));
                await about.popup.close().catch(() => {});
                await sleep(300);
                fact(`levels ${role}`, {block, connect: connect.out, about: about.out, pageAfterBoth: rel(page.url()),
                    stillIdentity: await form.isVisible().catch(() => false)});
                await signOut(page).catch(() => {});
            }
            await loc(page, 'Identity tab connect button', page.locator('#connect-orcid-button'));
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ states (Rule 5 iD states, 6c, A13, S3)
    if (on('states')) {
        const {page, close} = await launch(app);
        const dialogs = [];
        // This listener decides alone (the kit's steps back): record every question, then
        // accept it, so a tab switch or a page leave goes ahead the way "OK"/"Leave" would.
        page.on('dialog', (d) => {
            dialogs.push({type: d.type(), message: d.message(), at: new Date().toISOString()});
            d.accept().catch(() => {});
        });
        try {
            // v1: verified; Delete -> Cancel, then Delete -> OK.
            const v1 = `${t}v1`;
            await signIn(page, v1, {contextPath: P});
            await openIdentity(page);
            record('sw2-states-v1-identity', await screen(page));
            await shot(page, 'sw2-states-v1-identity').catch(() => {});
            fact('states v1 block', {block: await readBlock(page), settings: userOrcid(v1)});
            const form = page.locator('form#identityForm');
            // The verified link pressed (opens ORCID's record in a new tab).
            const linkPress = await pressPopup(page, form.locator('#orcid-link'));
            await linkPress.popup.close().catch(() => {});
            fact('states v1 iD link pressed', linkPress.out);
            await form.locator('#deleteOrcidButton').click();
            const dlg = page.getByRole('dialog').filter({hasText: QUESTION}).last();
            await dlg.waitFor({timeout: T});
            await sleep(400);
            const ds = await screen(page);
            record('sw2-states-v1-delete-window', ds);
            await shot(page, 'sw2-states-v1-delete-window').catch(() => {});
            const winText = ds.text.dialog;
            const winButtons = (await dlg.getByRole('button').allInnerTexts()).map((x) => flat(x, 40));
            const winTitle = await txt(dlg.locator('h1, h2, h3, .pkp_modal_header, [class*="title"], [class*="Title"]'), 80);
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
            await idle(page);
            await sleep(600);
            const afterCancel = await readBlock(page);
            await openIdentity(page);
            fact('states v1 delete cancel', {window: {title: winTitle, text: flat(winText, 300), buttons: winButtons},
                sameShowsVerified: afterCancel.verifiedLink, sameDelete: afterCancel.deleteButtons,
                reloadShows: await readBlock(page), settings: userOrcid(v1), notices: ds.notices});
            const jobsBefore = revokeJobs();
            const from = log.mark();
            const posted = page.waitForResponse((r) => /identity/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await page.locator('form#identityForm #deleteOrcidButton').click();
            const dlg2 = page.getByRole('dialog').filter({hasText: QUESTION}).last();
            await dlg2.waitFor({timeout: T});
            await dlg2.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await posted;
            await idle(page);
            await sleep(1200);
            const sOk = await screen(page);
            record('sw2-states-v1-after-ok', sOk);
            await shot(page, 'sw2-states-v1-after-ok').catch(() => {});
            const sameAfterOk = await readBlock(page);
            const settingsAfterOk = userOrcid(v1);
            const jobsAfter = revokeJobs();
            await openIdentity(page);
            record('sw2-states-v1-after-ok-reload', await screen(page));
            fact('states v1 delete ok', {post: r ? {url: rel(r.url()), status: r.status()} : null, same: sameAfterOk,
                reload: await readBlock(page), settings: settingsAfterOk, revokeJobsBefore: jobsBefore, revokeJobsAfter: jobsAfter,
                notices: sOk.notices, serverLog: log.since(from).map((l) => flat(l, 300))});
            await signOut(page).catch(() => {});

            // u1: unauthenticated.
            const u1 = `${t}u1`;
            await signIn(page, u1, {contextPath: P});
            await openIdentity(page);
            record('sw2-states-u1-identity', await screen(page));
            await shot(page, 'sw2-states-u1-identity').catch(() => {});
            fact('states u1 block', {block: await readBlock(page), settings: userOrcid(u1)});
            const uform = page.locator('form#identityForm');
            const auth = await pressPopup(page, uform.locator('#connect-orcid-button'));
            await auth.popup.close().catch(() => {});
            const ulink = await pressPopup(page, uform.locator('.orcid_container a[target="_blank"]:not(#orcid-link)'));
            await ulink.popup.close().catch(() => {});
            const uabout = await pressPopup(page, uform.locator('.orcid_container').getByRole('link', {name: 'What is ORCID?'}));
            await uabout.popup.close().catch(() => {});
            fact('states u1 presses', {authorize: auth.out, idLink: ulink.out, about: uabout.out});
            // "Save" with nothing changed.
            const saved = page.waitForResponse((x) => /identity/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await uform.getByRole('button', {name: 'Save', exact: true}).click();
            const sr = await saved;
            await idle(page);
            await sleep(800);
            const sSave = await screen(page);
            record('sw2-states-u1-after-save', sSave);
            const sameAfterSave = await readBlock(page);
            await openIdentity(page);
            fact('states u1 save', {post: sr ? sr.status() : null, notices: sSave.notices, same: sameAfterSave,
                reload: await readBlock(page), settings: userOrcid(u1)});
            await signOut(page).catch(() => {});

            // v2: Given Name changed and not saved, then Delete -> OK.
            const v2 = `${t}v2`;
            await signIn(page, v2, {contextPath: P});
            await openIdentity(page);
            const gn = page.locator('form#identityForm input[name^="givenName"]').first();
            const gnBefore = await gn.inputValue();
            await gn.fill(`${gnBefore}Changed`);
            await gn.blur();
            await page.locator('form#identityForm #deleteOrcidButton').click();
            const dlg3 = page.getByRole('dialog').filter({hasText: QUESTION}).last();
            await dlg3.waitFor({timeout: T});
            await dlg3.getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page);
            await sleep(1200);
            const s2 = await screen(page);
            record('sw2-states-v2-after-ok', s2);
            const sameV2 = {block: await readBlock(page), givenName: await val(page.locator('form#identityForm input[name^="givenName"]'))};
            await openIdentity(page);
            fact('states v2 unsaved change then delete', {typed: `${gnBefore}Changed`, same: sameV2, notices: s2.notices,
                reload: {block: await readBlock(page), givenName: await val(page.locator('form#identityForm input[name^="givenName"]'))},
                storedGivenName: userName(v2), settings: userOrcid(v2)});
            await signOut(page).catch(() => {});

            // author (no iD): leave the Identity tab with an unsaved change.
            const au = `${t}au`;
            await signIn(page, au, {contextPath: P});
            await openIdentity(page);
            const g = page.locator('form#identityForm input[name^="givenName"]').first();
            await g.fill('LeftUnsaved');
            await g.blur();
            const d0 = dialogs.length;
            const tabs = (await page.locator('#profileTabs [role="tab"], #profileTabs > ul a').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            const contactTab = page.locator('#profileTabs').getByRole('tab', {name: /Contact/}).first();
            await contactTab.click().catch(() => {});
            await idle(page);
            await sleep(800);
            const dTab = dialogs.slice(d0);
            const identityTab = page.locator('#profileTabs').getByRole('tab', {name: /Identity/}).first();
            await identityTab.click().catch(() => {});
            await idle(page);
            await sleep(800);
            const backValue = await val(page.locator('form#identityForm input[name^="givenName"]'));
            const d1 = dialogs.length;
            await page.goto(u('/about')).catch((e) => ({err: e.message}));
            await idle(page);
            fact('states leave identity unsaved', {tabs, dialogOnTabSwitch: dTab, valueAfterBack: backValue,
                dialogOnLeave: dialogs.slice(d1), landed: rel(page.url()), storedGivenName: userName(au)});
            await signOut(page).catch(() => {});
            fact('states dialogs', dialogs);
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ popupret (Rule 6b on the profile, Rule 5's completion, 6d)
    if (on('popupret')) {
        const {page, close} = await launch(app);
        try {
            const v3 = `${t}v3`;
            await signIn(page, v3, {contextPath: P});
            for (const [name, q] of [['deny', DENIAL], ['authorize', CODE]]) {
                await openIdentity(page);
                const before = userOrcid(v3);
                // v3 holds a verified iD, so the tab offers no connect button; the popup's
                // return address is the one the other accounts' buttons carry (same context).
                const ret = u(`/orcid/authorizeOrcid?targetOp=profile`);
                const from = log.mark();
                await stubOrcidSite(page.context());
                // The popup the button opens has the profile as its opener; a window opened
                // from the profile the same way carries the same opener, and ORCID's redirect
                // is a navigation of that window.
                const opened = page.waitForEvent('popup', {timeout: T});
                await page.evaluate(() => { window.__sw2 = window.open('about:blank', '_blank', 'width=540,height=700'); });
                const pop = await opened;
                const resp = await pop.goto(`${ret}&${q}`).catch((e) => ({err: e.message}));
                await sleep(2500);
                const closed = pop.isClosed();
                const body = closed ? null : await txt(pop.locator('body'), 400);
                const html = closed ? null : flat(await pop.content().catch(() => null), 600);
                if (!closed) await pop.screenshot({path: outFile(`sw2-popupret-${name}-popup.png`)}).catch(() => {});
                const sPage = await screen(page);
                record(`sw2-popupret-${name}-profile`, sPage);
                const after = userOrcid(v3);
                fact(`popupret ${name}`, {address: rel(`${ret}&${q}`), status: resp && resp.status ? resp.status() : resp,
                    popupClosed: closed, popupBody: body, popupHtml: html, profileNotices: sPage.notices,
                    profileBlock: await readBlock(page), settingsBefore: before, settingsAfter: after,
                    serverLog: log.since(from).map((l) => flat(l, 400))});
                if (!closed) await pop.close().catch(() => {});
            }
            await signOut(page).catch(() => {});
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ register (Rule 7, A4 on the form, A3's half)
    if (on('register')) {
        const {page, close} = await launch(app);
        try {
            await page.goto(u('/user/register'));
            await idle(page);
            const form = page.locator('form#register');
            await form.waitFor({timeout: T});
            const s = await screen(page);
            record('sw2-register-journal', s);
            await shot(page, 'sw2-register-journal').catch(() => {});
            const firstOf = await form.locator('#connect-orcid-button, input, select, textarea').first().evaluate((e) => e.id || e.name || e.tagName).catch(() => null);
            const firstVisible = await form.locator('#connect-orcid-button, input:visible, select:visible').first().evaluate((e) => e.id || e.name).catch(() => null);
            const block = {
                connect: await form.locator('#connect-orcid-button').count(),
                connectText: await txt(form.locator('#connect-orcid-button'), 80),
                aboutLinks: await form.getByRole('link', {name: 'What is ORCID?'}).count(),
                hiddenOrcid: await attr(form.locator('input[name="orcid"]'), 'type'),
                firstControl: firstOf, firstVisibleControl: firstVisible,
                legendBefore: await txt(form.locator('fieldset').first().locator('legend'), 60),
            };
            // Typed values, then the About link (A4 on the form).
            await form.locator('input[name="givenName"]').fill('Typed');
            await form.locator('input[name="email"]').fill(`typed-${t}@mail.test`);
            const about = await pressPopup(page, form.getByRole('link', {name: 'What is ORCID?'}));
            await about.popup.close().catch(() => {});
            const keep = {givenName: await form.locator('input[name="givenName"]').inputValue(), email: await form.locator('input[name="email"]').inputValue()};
            const connect = await pressPopup(page, form.locator('#connect-orcid-button'));
            const ret = connect.out.popupUrlParts.redirect_uri;
            // The return with a code, in the popup (ORCID's "Authorize").
            const from = log.mark();
            let retOut = null;
            if (ret) {
                const resp = await connect.popup.goto(app.url(`${ret}${ret.includes('?') ? '&' : '?'}${CODE}`)).catch((e) => ({err: e.message}));
                await sleep(2500);
                const closed = connect.popup.isClosed();
                retOut = {address: `${ret}&${CODE}`, status: resp && resp.status ? resp.status() : resp, popupClosed: closed,
                    popupBody: closed ? null : await txt(connect.popup.locator('body'), 300),
                    pageNotices: (await screen(page)).notices, formAfter: {givenName: await val(form.locator('input[name="givenName"]'))},
                    serverLog: log.since(from).map((l) => flat(l, 400))};
            }
            await connect.popup.close().catch(() => {});
            fact('register journal', {block, about: about.out, typedKept: keep, connect: connect.out, popupReturnWithCode: retOut});
            // Register without connecting.
            const username = `${t}rg`;
            await page.goto(u('/user/register'));
            await form.waitFor({timeout: T});
            await idle(page);
            await form.locator('input[name="givenName"]').fill('Reg');
            await form.locator('input[name="familyName"]').fill('Istrant');
            await form.locator('input[name="affiliation"]').fill('PKP').catch(() => {});
            await form.locator('select[name="country"]').selectOption({label: 'Canada'});
            await form.locator('input[name="email"]').fill(`${username}@mail.test`);
            await form.locator('input[name="username"]').fill(username);
            await form.locator('input[name="password"]').fill(`Pass${username}`);
            await form.locator('input[name="password2"]').fill(`Pass${username}`);
            const consent = form.locator('input[name="privacyConsent"]');
            if (await consent.count()) await consent.check();
            await form.getByRole('button', {name: 'Register', exact: true}).click();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const sDone = await screen(page);
            record('sw2-register-done', sDone);
            await shot(page, 'sw2-register-done').catch(() => {});
            const headings = (await page.locator('h1, h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
            await openIdentity(page).catch(() => {});
            record('sw2-register-new-identity', await screen(page));
            fact('register without connecting', {landed: rel(page.url()), headings, errors: await txt(page.locator('#formErrors'), 300),
                newIdentity: await readBlock(page).catch((e) => ({error: flat(e.message, 200)})), settings: userOrcid(username)});
            await signOut(page).catch(() => {});
            // Control: the site's Register page.
            await page.goto(app.url('/index.php/index/user/register'));
            await idle(page);
            record('sw2-register-site', await screen(page));
            fact('register site control', {url: rel(page.url()), forms: await page.locator('form#register').count(),
                connect: await page.locator('#connect-orcid-button').count(),
                aboutLinks: await page.getByRole('link', {name: 'What is ORCID?'}).count()});
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ deny (Rule 6b on the emailed link)
    if (on('deny')) {
        const A2 = require('../../issues/orcid-denied-page-raw-placeholder/lib');
        const authorOrcid = (pub) => sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken','orcidEmailToken') then '(set)' else s.setting_value end from authors a join author_settings s on s.author_id=a.author_id where a.publication_id=${pub} and s.setting_name like 'orcid%' order by 1`).split('\n').filter(Boolean);
        const {page, close} = await launch(app);
        try {
            const cases = [];
            // (a) Rule 8: no iD, "Request verification" by the manager.
            if (!S.subA) {
                const sa = await app.api.createSubmission({tag: `${t}a`, context: P, submitter: `${t}cb`, title: `U04 SW2 request ${t}`, submitted: true});
                S.subA = {id: sa.submissionId, pub: sa.publicationId};
                save();
            }
            await signIn(page, `${t}mg`, {contextPath: P});
            const sinceA = new Date();
            const modal = await A2.openContributorEditor(page, {...app, contextPath: P}, S.subA.id, 'Cleo Contributor');
            fact('deny request', await A2.requestVerification(page, modal));
            await signOut(page).catch(() => {});
            cases.push({name: 'request-noid', pub: S.subA.pub, to: `${t}cb@mail.test`, since: sinceA});
            // (b) Rule 13: an unauthenticated iD, the Accept decision (OJS, OMP).
            if (app.name !== 'ops') {
                if (!S.subB) {
                    const sinceB = new Date();
                    let sb;
                    try {
                        sb = await app.api.createSubmission({tag: `${t}b`, context: P, submitter: `${t}cu`, title: `U04 SW2 accept ${t}`,
                            submitted: true, author: {orcid: ORCID_ID, orcidIsVerified: false},
                            decisions: ['sendExternalReview', 'accept'], reviewRounds: [{reviewers: []}]});
                    } catch (e) {
                        fact('deny accept seed error', flat(e.message, 600));
                    }
                    if (sb) {
                        S.subB = {id: sb.submissionId, pub: sb.publicationId, since: sinceB.toISOString()};
                        save();
                    }
                }
                if (S.subB) cases.push({name: 'accept-unauth', pub: S.subB.pub, to: `${t}cu@mail.test`, since: new Date(S.subB.since)});
            }
            const d = await drainJobs(app);
            fact('deny drain', {passes: d.passes, out: flat(d.output, 300)});
            for (const c of cases) {
                const before = authorOrcid(c.pub);
                const link = await A2.readAuthorizationLink(page, app, c.to, c.since);
                if (!link || !link.redirectUri) {
                    fact(`deny ${c.name}`, {email: null, before});
                    continue;
                }
                const from = log.mark();
                const resp = await page.goto(`${app.url(rel(link.redirectUri))}&${DENIAL}`);
                await idle(page);
                const out = await A2.readVerifyPage(page, `sw2-deny-${c.name}`);
                record(`sw2-deny-${c.name}`, out.screen);
                delete out.screen;
                fact(`deny ${c.name}`, {email: {subject: link.subject, redirect: rel(link.redirectUri)}, status: resp ? resp.status() : null,
                    ...out, before, after: authorOrcid(c.pub), serverLog: log.since(from).map((l) => flat(l, 300))});
            }
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ pages (Rule 10 "every journal", S6 header/footer, tampered link)
    if (on('pages')) {
        const {page, close} = await launch(app);
        try {
            const read = async (name, address) => {
                const from = log.mark();
                const resp = await page.goto(app.url(address));
                await idle(page);
                const s = await screen(page);
                record(`sw2-pages-${name}`, s);
                await shot(page, `sw2-pages-${name}`).catch(() => {});
                fact(`pages ${name}`, {address, status: resp ? resp.status() : null, title: await page.title(),
                    header: await page.locator('header.pkp_structure_head, .pkp_structure_head').count(),
                    siteName: await txt(page.locator('.pkp_site_name'), 80),
                    footer: await page.locator('.pkp_structure_footer_wrapper, .pkp_structure_footer, footer').count(),
                    footerText: await txt(page.locator('.pkp_structure_footer_wrapper, .pkp_structure_footer'), 200),
                    heading: await txt(page.locator('.page_message h2, .page h1, .page h2'), 80),
                    description: await txt(page.locator('.page_message .description, .page_message'), 400),
                    rawKeys: await rawKeys(page).catch((e) => ({error: flat(e.message, 200)})),
                    serverLog: log.since(from).map((l) => flat(l, 300))});
            };
            await read('scratch-about', `/index.php/${P}/orcid/about`);
            await read('scratch-verify', `/index.php/${P}/orcid/verify`);
            // The emailed link's shape on this context's own submission whose contributor holds a
            // verified iD: a token the contributor no longer holds (a used link: the success
            // clears it) naming that contributor, and the same with another author_id (tampered).
            if (!S.subV) {
                const sv = await app.api.createSubmission({tag: `${t}v`, context: P, submitter: `${t}au`, title: `U04 SW2 used link ${t}`,
                    submitted: true, author: {orcid: ORCID_ID, orcidIsVerified: true}});
                S.subV = {id: sv.submissionId, pub: sv.publicationId,
                    author: Number(sql(app, `select author_id from authors where publication_id=${sv.publicationId} order by author_id limit 1`))};
                save();
            }
            fact('pages used-link seed', {sub: S.subV, settings: sql(app, `select setting_name, case when setting_name like '%Token' then '(set)' else setting_value end from author_settings where author_id=${S.subV.author} and setting_name like 'orcid%' order by 1`).split('\n')});
            await read('scratch-verify-used', `/index.php/${P}/orcid/verify?token=used${t}&state=${S.subV.pub}&author_id=${S.subV.author}&code=u04sw2`);
            await read('scratch-verify-tampered', `/index.php/${P}/orcid/verify?token=tampered${t}&state=${S.subV.pub}&author_id=${S.subV.author + 100000}&code=u04sw2`);
            await read('pk-off-about', `/index.php/${app.contextPath}/orcid/about`);
            await read('pk-off-verify', `/index.php/${app.contextPath}/orcid/verify`);
        } finally {
            await close();
        }
    }
});
