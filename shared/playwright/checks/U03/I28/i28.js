// U03 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for
// docs/specs/U03-user-profile.md, from .reports/hk28/chunks/U03.md.
//
//   l70 — incidental L70 (Rule 14): on Profile › "API Key" the privacy link's raw `href` (getAttribute),
//         leading, trailing or inner whitespace; the same link on every other tab as the control
//         (Identity first). Pressing it on "API Key" and on "Identity": the page the new tab opens.
//         Read-only: the seeded `author.alex` (the row's account) and `reader.rosa` (another level),
//         on `publicknowledge`; the admin's site-level profile as the other end of Rule 14.
//   lv  — sweep block I28-3 from the U34 claim check (Rule 2, scenario 3): pressing another tab with a
//         change typed only into a rich-text box and never sent. On a scratch context, a throwaway
//         author (and a section editor for the second level), Profile › Contact:
//           c1 "Signature" alone, the tab pressed at once;  c2 "Signature" alone, then a click into "Phone"
//           c3 "Phone" alone (Cancel, then OK);             c4 both, "Signature" first (Cancel, then OK)
//           c5 both, "Phone" first;                          c6 "Mailing Address" alone
//           c7 Profile › Public "Bio Statement" alone;       c8 the page reloaded with "Signature" alone
//           c9 the page reloaded with "Phone" alone;         c10 c1 as the section editor
//         Each case reads the tab right after the press, the reopened tab, and (c1, c4) a full reload.
//
//   RUN=r1 PROBE_FEATURE=U03 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U03/I28/i28.js
//   RUN=r2 …  (a second, independent run: its own scratch context and facts names)
//   PHASES=l70,lv (default both)
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'l70,lv').split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const TABS = ['identity', 'contact', 'roles', 'publicProfile', 'changePassword', 'notificationSettings', 'apiSettings'];

async function sect(name, fn) {
    try { await fn(); } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
        record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1200)});
    }
}

forEachApp(async (app) => {
    const A = app.name;
    const ctxUrl = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const {page, close} = await launch(app);
    // The script's own dialog listener decides alone (the kit only records): `mode` answers confirm().
    const dialogsSeen = [];
    let mode = 'accept';
    page.on('dialog', async (d) => {
        dialogsSeen.push({type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : mode, url: page.url()});
        log('[browser dialog]', A, d.type(), flat(d.message(), 140), '->', d.type() === 'beforeunload' ? 'accept' : mode);
        if (d.type() === 'beforeunload' || mode === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const since = (n) => dialogsSeen.slice(n).map((d) => ({type: d.type, message: d.message, answered: d.answered}));

    async function snap(p, name, extra) {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(`${RUN}-${name}`, s);
        await shot(p, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    const tabLink = (name) => page.locator(`#profileTabs > ul > li > a[name="${name}"]`);
    const panel = () => page.locator('#profileTabs [role="tabpanel"][aria-hidden="false"]');
    async function pressTab(name) {
        await tabLink(name).click();
        await page.waitForTimeout(1200);
        await idle(page);
    }
    async function waitForm(formSel) {
        await page.locator(formSel).first().waitFor({state: 'visible', timeout: 30000});
        await idle(page);
    }
    // The rich-text box whose textarea name starts with `prefix` inside `formSel`: its editor's state.
    const editorIn = (formSel, prefix) => page.evaluate(([f, n]) => {
        const ta = [...document.querySelectorAll(`${f} textarea`)].find((t) => (t.getAttribute('name') || '').startsWith(n));
        if (!ta) return null;
        const e = window.tinymce && window.tinymce.get(ta.id);
        return {id: ta.id, name: ta.getAttribute('name'), init: !!(e && e.initialized), content: e ? e.getContent() : null, text: e && e.getBody() ? e.getBody().innerText.trim() : null, textarea: ta.value};
    }, [formSel, prefix]);
    async function waitEditor(formSel, prefix) {
        await page.waitForFunction(([f, n]) => {
            const ta = [...document.querySelectorAll(`${f} textarea`)].find((t) => (t.getAttribute('name') || '').startsWith(n));
            const e = ta && window.tinymce && window.tinymce.get(ta.id);
            return !!(e && e.initialized);
        }, [formSel, prefix], {timeout: 30000}).catch(() => {});
        await idle(page);
    }
    async function typeInto(formSel, prefix, text) {
        const ed = await editorIn(formSel, prefix);
        const body = page.frameLocator(`[id="${ed.id}_ifr"]`).locator('body');
        await body.click();
        await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
        await page.keyboard.type(text, {delay: 15});
        await page.waitForTimeout(300);
    }
    const phone = () => page.locator('form#contactForm input[name="phone"]');
    async function contactState() {
        const vis = await page.locator('form#contactForm').isVisible().catch(() => false);
        if (!vis) return {contactShown: false};
        return {
            contactShown: true,
            phone: await phone().inputValue().catch(() => null),
            signature: await editorIn('form#contactForm', 'signature'),
            mailingAddress: await editorIn('form#contactForm', 'mailingAddress'),
        };
    }
    const shown = async () => ({
        identity: await page.locator('form#identityForm').isVisible().catch(() => false),
        contact: await page.locator('form#contactForm').isVisible().catch(() => false),
        publicProfile: await page.locator('form#publicProfileForm').isVisible().catch(() => false),
        selectedTab: await page.locator('#profileTabs > ul > li[aria-selected="true"] > a').getAttribute('name').catch(() => null),
    });
    async function openContact(cp, label) {
        await page.goto(ctxUrl(cp, '/user/profile/contact')); await idle(page);
        await waitForm('form#contactForm');
        await waitEditor('form#contactForm', 'signature');
        await waitEditor('form#contactForm', 'mailingAddress');
        const st = await contactState();
        await snap(page, label, {state: st});
        return st;
    }
    async function reopenContact(label) {
        await pressTab('contact');
        await waitForm('form#contactForm');
        await waitEditor('form#contactForm', 'signature');
        const st = await contactState();
        await snap(page, label, {state: st});
        return st;
    }

    try {
        // ================================================================ L70
        if (on('l70')) await sect('l70', async () => {
            const out = {};
            for (const [user, cp] of [['author.alex', 'publicknowledge'], ['reader.rosa', 'publicknowledge'], ['admin', null]]) {
                await signIn(page, user, cp ? {contextPath: cp} : {});
                await idle(page);
                await page.goto(cp ? ctxUrl(cp, '/user/profile') : app.url('/index.php/index/user/profile')); await idle(page);
                await waitForm('form#identityForm');
                const u = {landed: page.url(), tabs: {}};
                for (const t of TABS) {
                    await pressTab(t);
                    await panel().locator('form').first().waitFor({state: 'visible', timeout: 30000}).catch(() => {});
                    await idle(page);
                    const s = await snap(page, `l70-${user.replace('.', '')}-${t}`);
                    const links = await panel().locator('a').evaluateAll((els) => els
                        .filter((a) => /privacy statement/i.test(a.innerText))
                        .map((a) => ({
                            raw: a.getAttribute('href'),
                            rawJSON: JSON.stringify(a.getAttribute('href')),
                            leading: (a.getAttribute('href') || '').match(/^\s*/)[0].length,
                            trailing: (a.getAttribute('href') || '').match(/\s*$/)[0].length,
                            inner: /\S\s+\S/.test((a.getAttribute('href') || '').trim()),
                            resolved: a.href,
                            target: a.getAttribute('target'),
                            text: a.innerText,
                            sentence: a.parentElement ? a.parentElement.innerText.trim().replace(/\s+/g, ' ') : null,
                        })));
                    u.tabs[t] = {links, url: s.url};
                    log('[l70]', A, user, t, JSON.stringify(links.map((l) => l.rawJSON)));
                    if (t === 'apiSettings') {
                        u.apiTab = flat(s.text && s.text.main, 700);
                        await loc(page, 'Profile › API Key: the privacy link', panel().getByRole('link', {name: 'privacy statement'}));
                    }
                    if (t === 'identity') await loc(page, 'Profile › Identity: the privacy link', panel().getByRole('link', {name: 'privacy statement'}));
                }
                // Press the link on "API Key" and, as the control, on "Identity".
                for (const t of ['apiSettings', 'identity']) {
                    await pressTab(t);
                    await panel().locator('form').first().waitFor({state: 'visible', timeout: 30000}).catch(() => {});
                    const link = panel().getByRole('link', {name: 'privacy statement'});
                    const popupP = page.waitForEvent('popup', {timeout: 15000}).catch(() => null);
                    await link.click();
                    const pop = await popupP;
                    const r = {popup: !!pop, openerUrl: page.url()};
                    if (pop) {
                        await pop.waitForLoadState('domcontentloaded').catch(() => {});
                        await pop.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
                        r.url = pop.url();
                        r.title = await pop.title().catch(() => null);
                        r.h1 = await pop.locator('h1').first().innerText().catch(() => null);
                        const ps = await snap(pop, `l70-${user.replace('.', '')}-${t}-pressed`);
                        r.bodyStart = flat(ps.text && (ps.text.main || ps.text.body), 300);
                        await pop.close().catch(() => {});
                    }
                    u[`pressed_${t}`] = r;
                    log('[l70 pressed]', A, user, t, JSON.stringify({url: r.url, title: r.title, h1: r.h1}));
                }
                out[user] = u;
            }
            record(`${RUN}-l70-summary`, out);
            if (RUN === 'r1') note(`ccI28 [${A}] · Profile tabs: press \`#profileTabs > ul > li > a[name="<tab>"]\` (identity, contact, roles, publicProfile, changePassword, notificationSettings, apiSettings); the open tab's panel is \`#profileTabs [role="tabpanel"][aria-hidden="false"]\`; its privacy link is getByRole('link', {name: 'privacy statement'}) and opens a popup (page.waitForEvent('popup')).`);
        });

        // ================================================================ I28-3 (leave with an unsent change)
        if (on('lv')) await sect('lv', async () => {
            const t = tag(`u03i28${RUN}`);
            await app.api.createContext({
                tag: t,
                context: {name: `U03 I28 ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`},
                users: [
                    {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
                    {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sven', familyName: 'Editorson'},
                ],
            });
            record(`${RUN}-lv-seed`, {t});
            log('[lv seed]', A, t);
            const out = {t, cases: {}};
            const leave = async (label) => {
                const n = dialogsSeen.length;
                await pressTab('identity');
                const r = {dialogs: since(n), shown: await shown()};
                if (r.shown.contact) r.stayed = await contactState();
                await snap(page, `${label}-pressed`, {leave: r});
                return r;
            };
            const reloadRead = async (label) => {
                const n = dialogsSeen.length;
                await page.reload(); await idle(page);
                const r = {dialogs: since(n), url: page.url()};
                await snap(page, `${label}-reloaded`, {r});
                return r;
            };

            await signIn(page, `${t}au`, {contextPath: t}); await idle(page);
            const before = await openContact(t, 'lv-c0-contact');
            out.before = before;
            await loc(page, 'Profile › Contact "Signature" (TinyMCE iframe)', page.locator('form#contactForm iframe[id^="signature"]'));
            await loc(page, 'Profile › Contact "Phone"', phone());
            await loc(page, 'Profile › Contact "Mailing Address" (TinyMCE iframe)', page.locator('form#contactForm iframe[id^="mailingAddress"]'));

            // c1: Signature alone, the other tab pressed at once
            mode = 'accept';
            await openContact(t, 'lv-c1-before');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c1');
            out.cases.c1 = {typed: await editorIn('form#contactForm', 'signature')};
            out.cases.c1.leave = await leave('lv-c1');
            out.cases.c1.reopened = await reopenContact('lv-c1-reopened');
            out.cases.c1.reload = await reloadRead('lv-c1');
            out.cases.c1.afterReload = await openContact(t, 'lv-c1-after-reload');

            // c2: Signature alone, then a click into "Phone" (nothing typed there)
            await openContact(t, 'lv-c2-before');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c2');
            await phone().click(); await page.waitForTimeout(400);
            out.cases.c2 = {textareaAfterBlur: (await editorIn('form#contactForm', 'signature')).textarea};
            out.cases.c2.leave = await leave('lv-c2');
            out.cases.c2.reopened = await reopenContact('lv-c2-reopened');

            // c3: Phone alone: Cancel, then OK
            await openContact(t, 'lv-c3-before');
            await phone().click(); await page.keyboard.type('555 0103');
            mode = 'dismiss';
            out.cases.c3 = {cancel: await leave('lv-c3-cancel')};
            mode = 'accept';
            out.cases.c3.ok = await leave('lv-c3-ok');
            out.cases.c3.reopened = await reopenContact('lv-c3-reopened');

            // c4: both, Signature first: Cancel, then OK; reopened and reloaded
            await openContact(t, 'lv-c4-before');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c4');
            await phone().click(); await page.keyboard.type('555 0104');
            mode = 'dismiss';
            out.cases.c4 = {cancel: await leave('lv-c4-cancel')};
            mode = 'accept';
            out.cases.c4.ok = await leave('lv-c4-ok');
            out.cases.c4.reopened = await reopenContact('lv-c4-reopened');
            out.cases.c4.reload = await reloadRead('lv-c4');
            out.cases.c4.afterReload = await openContact(t, 'lv-c4-after-reload');

            // c5: both, Phone first
            await openContact(t, 'lv-c5-before');
            await phone().click(); await page.keyboard.type('555 0105');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c5');
            out.cases.c5 = {ok: await leave('lv-c5-ok')};
            out.cases.c5.reopened = await reopenContact('lv-c5-reopened');

            // c6: Mailing Address alone
            await openContact(t, 'lv-c6-before');
            await typeInto('form#contactForm', 'mailingAddress', 'Unsent address c6');
            out.cases.c6 = {typed: await editorIn('form#contactForm', 'mailingAddress')};
            out.cases.c6.leave = await leave('lv-c6');
            out.cases.c6.reopened = await reopenContact('lv-c6-reopened');

            // c7: Public › Bio Statement alone
            await page.goto(ctxUrl(t, '/user/profile/publicProfile')); await idle(page);
            await waitForm('form#publicProfileForm');
            await waitEditor('form#publicProfileForm', 'biography');
            await snap(page, 'lv-c7-before', {bio: await editorIn('form#publicProfileForm', 'biography')});
            await loc(page, 'Profile › Public "Bio Statement" (TinyMCE iframe)', page.locator('form#publicProfileForm iframe[id^="biography"]'));
            await typeInto('form#publicProfileForm', 'biography', 'Unsent bio c7');
            out.cases.c7 = {typed: await editorIn('form#publicProfileForm', 'biography')};
            out.cases.c7.leave = await leave('lv-c7');
            await pressTab('publicProfile');
            await waitForm('form#publicProfileForm');
            await waitEditor('form#publicProfileForm', 'biography');
            out.cases.c7.reopened = {bio: await editorIn('form#publicProfileForm', 'biography')};
            await snap(page, 'lv-c7-reopened', {state: out.cases.c7.reopened});
            // c7b: Public › Homepage URL alone (the plain-box control on the same tab)
            await page.locator('form#publicProfileForm input[name="userUrl"]').click();
            await page.keyboard.type('https://example.org/c7b');
            out.cases.c7b = {leave: await leave('lv-c7b')};

            // c8: page reloaded with Signature alone (after a click into Phone, so the editor is left)
            await openContact(t, 'lv-c8-before');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c8');
            await phone().click(); await page.waitForTimeout(400);
            out.cases.c8 = {reload: await reloadRead('lv-c8')};
            out.cases.c8.after = await openContact(t, 'lv-c8-after');

            // c9: page reloaded with Phone alone (blurred into Country)
            await openContact(t, 'lv-c9-before');
            await phone().click(); await page.keyboard.type('555 0109');
            await page.locator('form#contactForm select[name="country"]').focus();
            out.cases.c9 = {reload: await reloadRead('lv-c9')};
            out.cases.c9.after = await openContact(t, 'lv-c9-after');

            // c10: the section editor, Signature alone
            await signIn(page, `${t}se`, {contextPath: t}); await idle(page);
            await openContact(t, 'lv-c10-before');
            await typeInto('form#contactForm', 'signature', 'Unsent signature c10');
            out.cases.c10 = {leave: await leave('lv-c10')};
            out.cases.c10.reopened = await reopenContact('lv-c10-reopened');

            out.dialogs = dialogsSeen;
            record(`${RUN}-lv-summary`, out);
            const brief = Object.fromEntries(Object.entries(out.cases).map(([k, v]) => [k, JSON.stringify(v.leave ? v.leave.dialogs.map((d) => d.type) : v.cancel ? [v.cancel.dialogs.map((d) => d.type), v.ok && v.ok.dialogs.map((d) => d.type)] : v.ok ? v.ok.dialogs.map((d) => d.type) : v.reload ? v.reload.dialogs.map((d) => d.type) : null)]));
            log('[lv]', A, JSON.stringify(brief));
            if (RUN === 'r1') note(`ccI28 [${A}] · Profile › Contact/Public rich-text boxes: find the editor by its textarea name inside the form (\`form#contactForm textarea[name^="signature"]\`, \`mailingAddress\`, \`form#publicProfileForm textarea[name^="biography"]\`), wait for \`tinymce.get(id).initialized\`, type into \`[id="<id>_ifr"]\` body. A tab-leave probe needs its own page.on('dialog') (the kit dismisses confirm()); the question is \`confirm()\` "The data on this form has changed…".`);
        });
    } finally {
        await close();
    }
});
