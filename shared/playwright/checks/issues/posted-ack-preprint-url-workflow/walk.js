// Issue report U49 OPS6 (docs/issues/U49-OPS6-*.md): the "Preprint URL" in
// the email a preprint's contributors get when it is first posted.
//
//   steps (default): steps 1-7 — dbarnes posts preprint 1 (never posted); the
//                    email at ccorino@mailinator.com is read; signed out, its
//                    "Preprint URL" is opened, and ccorino signs in on the
//                    page it opens.
//   nb:              the control for the fix — dbarnes creates a "Minor
//                    Revision" of the posted preprint 2 and posts it; the
//                    email at ckwantes@mailinator.com is read (its links).
//
// On an install freshly loaded from PKP's default dataset (OPS main or stable-3_5_0):
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/posted-ack-preprint-url-workflow/walk.js [nb]
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {flat, openTitleAbstract, post, newVersion, mailsWithLinks} = require('./lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    const {page, close} = await launch(app);
    const facts = {line: app.line || 'main', mode};
    try {
        // Step 1.
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        if (mode === 'steps') {
            // Steps 2-4: preprint 1, "Title & Abstract", "Post", the window's "Post".
            await openTitleAbstract(page, app, 1);
            const since = new Date();
            facts.post = await post(page);
            record('step4-after-post', await screen(page));
            // Step 5: the email at ccorino@mailinator.com.
            facts.mails = await mailsWithLinks(app, 'ccorino@mailinator.com', since);
            const ack = facts.mails.find((m) => /Preprint Posted Acknowledgement/.test(m.subject));
            const link = ack && ack.links.find((l) => /^https?:/.test(l.words));
            facts.preprintUrl = link ? link.href : null;
            if (facts.preprintUrl) {
                // Step 6: signed out, open the "Preprint URL".
                await signOut(page);
                await page.goto(facts.preprintUrl);
                await idle(page);
                const s6 = await screen(page);
                record('step6-link-signed-out', s6);
                facts.step6 = {url: page.url(), title: s6.title, text: flat((s6.text && s6.text.main) || '', 400)};
                // Step 7: sign in as ccorino on the page it opened (when it is a login page).
                const user = page.locator('input#username');
                if (await user.isVisible().catch(() => false)) {
                    await user.fill('ccorino');
                    await page.locator('input#password').fill('ccorinoccorino');
                    await page.locator('form').filter({has: user}).getByRole('button', {name: /Login|Log In|Sign in/i}).first().click();
                    await page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: 30_000, waitUntil: 'commit'}).catch(() => {});
                    await idle(page);
                    const s7 = await screen(page);
                    record('step7-after-sign-in', s7);
                    facts.step7 = {url: page.url(), title: s7.title, main: flat((s7.text && s7.text.main) || '', 600), dialog: flat(s7.text && s7.text.dialog, 600)};
                }
                // The address Expected names, for comparison.
                await page.goto(app.url(`/index.php/${app.contextPath}/preprint/view/1`));
                await idle(page);
                const pub = await screen(page);
                record('expected-public-page', pub);
                facts.publicPage = {url: page.url(), title: pub.title};
            }
        } else if (mode === 'nb') {
            // N1: preprint 2 (posted), "Create New Version", "Minor Revision".
            facts.version = await newVersion(page, app, 2);
            // N2: the new version's "Title & Abstract", "Post", confirm.
            await openTitleAbstract(page, app, 2);
            const since = new Date();
            facts.post = await post(page);
            record('n2-after-post', await screen(page));
            // N3: the email at ckwantes@mailinator.com.
            facts.mails = await mailsWithLinks(app, 'ckwantes@mailinator.com', since);
        }
    } catch (e) {
        facts.error = String(e && e.message ? e.message : e).slice(0, 800);
        record(`${mode}-error-screen`, await screen(page).catch(() => null));
    } finally {
        record(`${mode}-facts`, facts);
        await close();
    }
    console.log(JSON.stringify(facts, null, 1).slice(0, 5000));
});
