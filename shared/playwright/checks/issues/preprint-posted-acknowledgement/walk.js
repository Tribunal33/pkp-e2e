// Issue reports U49 OPS4 (docs/issues/U49-OPS4-*.md): the acknowledgement a
// preprint server sends its contributors when a preprint is posted.
//
//   steps (default): the Steps — dbarnes posts preprint 1 (never posted) and
//                    the email at ccorino@mailinator.com is read.
//   nb:              the control — dbarnes creates a minor version of the
//                    posted preprint 2, posts it, and the emails at
//                    ckwantes@mailinator.com are read.
//
// On a dataset fleet freshly reset to PKP's default dataset (OPS main or stable-3_5_0):
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js [nb]
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {openTitleAbstract, post, mailsTo} = require('./lib');
const {newVersion} = require('../new-version-galley-publisher-id-refused/lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    const {page, close} = await launch(app);
    const facts = {line: app.line || 'main', mode};
    try {
        await signIn(page, 'dbarnes');
        if (mode === 'steps') {
            // Precondition read: Settings › Workflow › Emails, "Preprint Posted".
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
            await idle(page);
            await page.getByRole('tab', {name: 'Emails', exact: true}).first().click().catch(() => {});
            await idle(page);
            const settings = await screen(page);
            record('step0-workflow-emails', settings);
            facts.preprintPostedSetting = /Preprint Posted[\s\S]{0,400}/.exec(settings.text.main || '')?.[0]?.replace(/\s+/g, ' ').slice(0, 300) || null;

            // Steps 2-3: open preprint 1, "Title & Abstract", "Post", confirm "Post".
            await openTitleAbstract(page, app, 1);
            record('step3-before-post', await screen(page));
            const since = new Date();
            facts.post = await post(page);
            record('step3-after-post', await screen(page));
            // Step 4: the email at ccorino@mailinator.com.
            facts.mails = await mailsTo(app, 'ccorino@mailinator.com', since);
        } else if (mode === 'nb') {
            // N1-N2: preprint 2 (posted), "Create New Version", "Minor Revision" (3.5: "Yes").
            facts.version = await newVersion(page, app, 2);
            // N3: the new version's "Title & Abstract", "Post", confirm.
            await openTitleAbstract(page, app, 2);
            const since = new Date();
            facts.post = await post(page);
            record('n3-after-post', await screen(page));
            // N4: the emails at ckwantes@mailinator.com.
            facts.mails = await mailsTo(app, 'ckwantes@mailinator.com', since);
        }
    } catch (e) {
        facts.error = String(e && e.message ? e.message : e).slice(0, 800);
        record(`${mode}-error-screen`, await screen(page).catch(() => null));
    } finally {
        record(`${mode}-facts`, facts);
        await close();
    }
    console.log(JSON.stringify(facts, null, 1).slice(0, 4000));
});
