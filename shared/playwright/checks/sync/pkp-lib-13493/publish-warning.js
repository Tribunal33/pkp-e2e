// PR review check — pkp/pkp-lib#13283 on `main` (pkp-lib#13493 with ojs#5920, omp#2503, ops#1444),
// acceptance criterion 5: an unauthenticated or duplicate ORCID iD on a contributor is a warning
// in the publish window, no longer a refusal. The change moves the ORCID checks of
// PKP\publication\Repository::validatePublish() to validatePublishWarnings(), which only the
// legacy publish window (controllers/modals/publish/PublishHandler) reads. The check records what
// that window says and does, per app and case, on PKP's default test dataset; it asserts nothing,
// so it runs unchanged at the PR's base, where the window refuses.
//
//   npm run fleet-prep -- --feature pr13493a --dataset 1 --reset      # publishing changes the dataset
//   PROBE_FEATURE=pr13493a PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13493/publish-warning.js
//   CASES=control,api narrows the cases (the fleet is still expected fresh; the result file keeps
//   the other cases of an earlier run at the same commit).
//   CASES=crossref,crossref-complete … node bin/probe.js ojs …   # these two reload OJS's dataset themselves
//
// Per app: `rvaca` turns ORCID on for `publicknowledge` on Settings › Users & Roles › "ORCID"
// ("Enable ORCID functionality", "Public Sandbox", Client ID APP-TEST, Client Secret test-secret),
// then `dbarnes` walks the cases, each on an unpublished submission of its own (PLAN below):
//   - control: no iD on any contributor; the publish window's text, not confirmed.
//   - refused-control (OJS 18, OPS 4; OMP's dataset has no such book): a declined submission, which
//     the publish window refuses at the PR's base and head alike ("The following requirements must
//     be met…", no confirm button): what a refusal reads like here, beside the ORCID cases.
//   - unauthenticated: one contributor holds an iD with no access token.
//   - duplicate-unauthenticated / duplicate-verified: two contributors of one publication hold the
//     same iD, both without a token, then both with one.
//   - api: the route the window's form posts to (PUT …/publications/{id}/publish, sent from the
//     editor's page as the form sends it: POST, X-Http-Method-Override: PUT, X-Csrf-Token) for a
//     submission whose contributor holds an unauthenticated iD.
//   - add-entry (OMP): the Catalog page's "Add Entry" › "Save" with such a book.
//   - author-post (OPS): the preprint's own author (`ccorino`) on its "Title & Abstract" page:
//     whether a "Post" control is offered, and its window when it is (never confirmed).
//   - crossref, crossref-complete (OJS; OMP and OPS ship no subscriber of the warnings hook and
//     record the skip): the Crossref plugin's Publication::validatePublishWarnings subscriber
//     (plugins/generic/crossref/CrossrefPlugin.php validate()) assigns its own lines over the list
//     when it has something to warn about, so the ORCID line is not shown beside them. The two
//     cases reload OJS's dataset themselves and share that load; their windows are read, never
//     confirmed. The steps, on PKP's default test dataset for `main`, whose journal ships a
//     publisher ("Public Knowledge Project") and ISSNs (0378-5955), DOIs on for "Articles"
//     ("Upon reaching the copyediting stage"), no DOI prefix, no agency and no DOI on any article:
//       1. As `rvaca`: Settings › Users & Roles › "ORCID": tick "Enable ORCID functionality",
//          "ORCID API" "Public Sandbox", "Client ID" APP-TEST, "Client Secret" test-secret, "Save".
//       2. By SQL (ORCID's sign-in cannot complete on a test install), an unauthenticated iD on
//          the contributor of submission 6, "Investigating the Shared Background Required for
//          Argument: A Critique of Fogelin's Thesis on Deep Disagreement" (Production):
//            INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
//            SELECT a.author_id, '', 'orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097'
//            FROM authors a JOIN submissions s ON s.current_publication_id = a.publication_id
//            WHERE s.submission_id = 6;
//       3. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
//       4. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" 10.1234, "Save".
//       5. Same page, "Registration": "Registration Agency" "Crossref", "Depositor name" Public
//          Knowledge Project, "Depositor email" doi@mailinator.com, "Save".
//       6. As `dbarnes`: open submission 6, Publication › "Contributors", "Edit" on Dana Phillips:
//          "ORCID iD" shows the hollow icon, "https://sandbox.orcid.org/0000-0002-1825-0097
//          (unauthenticated)" and "This ORCID has not been verified. …". Leave the form.
//       7. Publication › "Title & Abstract", "Schedule For Publication".
//       8. "Review Publishing Details": "Publication Stage" "Version of Record (VoR)", "Revision
//          Significance" "Major Revision", "Assign To Current/Back Issue", issue "Vol. 1 No. 2
//          (2014)", "Confirm".
//       9. `crossref`: read the "Schedule For Publication" window's list under "The following
//          issues were found, but will not prevent publishing". Close it without "Publish".
//      10. `crossref-complete`: give what Crossref's lines asked for. On the dataset that is the
//          article's DOI alone: side menu "DOIs", tab "Articles", tick the row of submission 6,
//          "Bulk Actions" › "Assign DOIs", then the window's "Assign DOIs". (A journal without a
//          publisher or ISSN would also need Settings › Journal › "Masthead"; the dataset's has
//          both, and the script gives neither.)
//      11. Open submission 6 again, Publication › "Title & Abstract", "Schedule For Publication":
//          the window opens at once (the panel of step 8 was confirmed).
//      12. Read the window's list again. Close it without "Publish".
// In every other window case with a confirm button the button is pressed and the notice, the workflow's
// status, the stored status and the public page's answer signed out are recorded.
//
// What is set by SQL, because the screens cannot produce it on a test install (ORCID's own sign-in
// never completes here), each checked on the contributor's form before the window is opened:
//   - an unauthenticated iD: the `orcid` row alone in author_settings (locale ''), as an iD typed
//     on 3.4 arrives after the upgrade;
//   - a "verified" iD: that row plus orcidIsVerified, orcidAccessToken, orcidAccessScope,
//     orcidRefreshToken and orcidAccessExpiresOn, as VerifyIdentityWithOrcid stores them;
//   - the second contributor of a duplicate case on OJS and OPS, whose dataset submissions hold one
//     contributor each ("Second Contributor": authors, author_settings, the first one's role);
//     OMP's books 4 and 13 have several, so the first two take the iD.
// OJS: the "Review Publishing Details" panel is filled with "Version of Record", a major revision
// and "Assign To Current/Back Issue" › "Vol. 1 No. 2 (2014)"; its "Confirm" saves that on the
// publication, in the control too. OPS has one unpublished preprint (1), so the dataset is loaded
// afresh (and ORCID turned on again) before each case that follows a posting.
//
// Facts: result-<pkp-lib sha>-<app>.json (per case). Screenshots: window-<sha>-<case>,
// after-<sha>-<case>, contributor-<sha>-<case>-<n>, panel-<sha>-<case> (OJS),
// add-entry-<sha> (OMP), author-<sha> (OPS), doi-registration-<sha>-crossref and
// dois-page-<sha>-crossref-complete (OJS), each with the app's suffix.
const path = require('path');
const fs = require('fs');
const {forEachApp, launch, signIn, idle, screen, shot, record, sql, serverLog, outFile} = require('../../../probe');
const {resetDataset} = require('../../../dataset');
const {pkpLibSha, journalOrcidOn} = require('./lib');

const ORCID = 'https://sandbox.orcid.org/0000-0002-1825-0097';
const REQUIREMENTS = /The following requirements must be met before this can be (published|posted)\./;
const WARNINGS = 'The following issues were found, but will not prevent publishing';
const ORCID_MESSAGES = /Unauthenticated ORCiDs for contributors detected\.|Duplicate ORCiDs for contributors detected\.|hasUnauthenticatedOrcid|hasDuplicateOrcids/;
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const only = (process.env.CASES || '').split(',').filter(Boolean);
const ORCID_LINES = ['Unauthenticated ORCiDs for contributors detected.', 'Duplicate ORCiDs for contributors detected.'];
const DOI_PREFIX = '10.1234';
const DEPOSITOR = {name: 'Public Knowledge Project', email: 'doi@mailinator.com'};
const CROSSREF_OJS_ONLY =
    'OJS only: the Crossref plugin (plugins/generic/crossref/CrossrefPlugin.php validate()) is the one subscriber of Publication::validatePublishWarnings in the three apps; OMP and OPS ship none';

// The dataset's unpublished submissions the cases use (dataset.md): OJS's four at Production, OMP's
// five at Copyediting or Production, OPS's one.
const PLAN = {
    ojs: {
        publicPath: (id) => `/index.php/publicknowledge/article/view/${id}`,
        cases: {control: 5, 'refused-control': 18, unauthenticated: 6, 'duplicate-unauthenticated': 9, 'duplicate-verified': 15, api: 5, crossref: 6, 'crossref-complete': 6},
        reloadBefore: ['crossref'],
    },
    omp: {
        publicPath: (id) => `/index.php/publicknowledge/catalog/book/${id}`,
        cases: {control: 1, unauthenticated: 11, 'duplicate-unauthenticated': 4, 'duplicate-verified': 13, api: 1, 'add-entry': 7},
        skip: {crossref: CROSSREF_OJS_ONLY, 'crossref-complete': CROSSREF_OJS_ONLY},
    },
    ops: {
        publicPath: (id) => `/index.php/publicknowledge/preprint/view/${id}`,
        cases: {control: 1, 'refused-control': 4, 'author-post': 1, unauthenticated: 1, 'duplicate-unauthenticated': 1, 'duplicate-verified': 1, api: 1},
        reloadBefore: ['duplicate-unauthenticated', 'duplicate-verified', 'api'],
        skip: {crossref: CROSSREF_OJS_ONLY, 'crossref-complete': CROSSREF_OJS_ONLY},
    },
};

// ---- the database: reads, and the three states only ORCID's sign-in or SQL can make ----

const rows = (app, query) => sql(app, query).split('\n').filter(Boolean).map((line) => line.split('|'));

function publicationOf(app, submissionId) {
    return Number(rows(app, `select current_publication_id from submissions where submission_id = ${Number(submissionId)}`)[0][0]);
}

/** The publication's contributors in list order: {id, email, name}. */
function contributors(app, publicationId) {
    const name = (key) => `(select setting_value from author_settings s where s.author_id = a.author_id and s.setting_name = '${key}' and s.locale = 'en')`;
    return rows(app, `select a.author_id, a.email, ${name('givenName')}, ${name('familyName')} from authors a where a.publication_id = ${publicationId} order by a.seq, a.author_id`).map(
        ([id, email, given, family]) => ({id: Number(id), email, name: `${given} ${family}`.trim()}),
    );
}

/** The contributor's iD: the `orcid` row alone (unauthenticated), or with the token rows ("verified"). */
function setOrcid(app, authorId, {verified = false} = {}) {
    sql(app, `delete from author_settings where author_id = ${authorId} and setting_name like 'orcid%'`);
    const values = [['orcid', ORCID]];
    if (verified) {
        values.push(
            ['orcidIsVerified', '1'],
            ['orcidAccessToken', `00000000-1111-2222-3333-${String(authorId).padStart(12, '0')}`],
            ['orcidAccessScope', '/authenticate'],
            ['orcidRefreshToken', `55555555-6666-7777-8888-${String(authorId).padStart(12, '0')}`],
            ['orcidAccessExpiresOn', '2046-10-01 00:00:00'],
        );
    }
    sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) values ${values.map(([k, v]) => `(${authorId}, '', '${k}', '${v}')`).join(', ')}`);
    return rows(app, `select setting_name from author_settings where author_id = ${authorId} and setting_name like 'orcid%' order by 1`).map((r) => r[0]);
}

/** A second contributor for a publication that has one: "Second Contributor", the first one's country and role. */
function addSecondContributor(app, publicationId, first) {
    const email = 'second.contributor@mailinator.com';
    sql(app, `insert into authors (email, include_in_browse, publication_id, seq) values ('${email}', 1, ${publicationId}, 1)`);
    const id = Number(rows(app, `select max(author_id) from authors where publication_id = ${publicationId} and email = '${email}'`)[0][0]);
    sql(
        app,
        `insert into author_settings (author_id, locale, setting_name, setting_value) values (${id}, 'en', 'givenName', 'Second'), (${id}, 'en', 'familyName', 'Contributor')`,
    );
    sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) select ${id}, locale, setting_name, setting_value from author_settings where author_id = ${first.id} and setting_name = 'country'`);
    sql(
        app,
        `insert into credit_contributor_roles (contributor_id, credit_role_id, credit_degree, contributor_role_id) select ${id}, credit_role_id, credit_degree, contributor_role_id from credit_contributor_roles where contributor_id = ${first.id}`,
    );
    return {id, email, name: 'Second Contributor'};
}

/** What the database holds of the submission's current version: statuses (3 = published) and the date. */
function stored(app, submissionId) {
    const [submissionStatus, publicationStatus, datePublished] = rows(
        app,
        `select s.status, p.status, coalesce(p.date_published::text, '') from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${Number(submissionId)}`,
    )[0];
    return {submissionStatus: Number(submissionStatus), publicationStatus: Number(publicationStatus), datePublished: datePublished || null};
}

// ---- the screens ----

const workflowAddress = (app, submissionId, publicationId, page, dashboard = 'editorial') =>
    `/index.php/${app.contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}&workflowMenuKey=publication_${publicationId}_${page}`;
const left = (page) => page.locator('[data-cy="workflow-controls-left"]');
const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
const publishControl = (page) => right(page).getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/});
const publishWindow = (page) => page.getByRole('dialog').filter({has: page.locator('.pkpWorkflow__publishModal')}).last();
const texts = async (locator, n = 300) => (await locator.allInnerTexts().catch(() => [])).map((t) => flat(t, n)).filter(Boolean);

/** The public page of the submission, asked for signed out (no cookie): status and <title>. */
async function publicPage(app, plan, submissionId) {
    try {
        const response = await fetch(app.url(plan.publicPath(submissionId)), {redirect: 'follow'});
        const body = await response.text();
        return {path: plan.publicPath(submissionId), status: response.status, landed: new URL(response.url).pathname, title: flat((body.match(/<title>([\s\S]*?)<\/title>/) || [])[1], 160)};
    } catch (error) {
        return {path: plan.publicPath(submissionId), error: flat(error.message, 200)};
    }
}

/**
 * Publication › "Contributors": the list's lines, then the named contributor's form and its
 * "ORCID iD" field: its words, the "not been verified" note, the icons (FieldOrcid.vue draws the
 * hollow "unauthenticated" icon with the class `w-6`, the verified one without it; the first icon
 * is the label's tooltip) and the iD's link, which reads "… (unauthenticated)" on such an iD.
 */
async function contributorForm(page, app, submissionId, publicationId, name, label) {
    await page.goto(workflowAddress(app, submissionId, publicationId, 'contributors'));
    const list = page.locator('.listPanel--contributor');
    await list.locator('.listPanel__item').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const out = {contributor: name, list: await texts(list.locator('.listPanel__item'), 200)};
    await list.locator('.listPanel__item').filter({hasText: name}).first().getByRole('button', {name: 'Edit', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
    await modal.locator('[id^="contributor-givenName"]').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const field = modal.locator('.pkpFormField').filter({hasText: 'ORCID iD'}).last();
    await field.waitFor({state: 'visible', timeout: T});
    await field.scrollIntoViewIfNeeded();
    out.field = flat(await field.innerText(), 500);
    out.note = (await texts(field.locator('.pkpFormField__description'), 300))[0] || null;
    out.notVerifiedNote = /This ORCID has not been verified\./.test(out.field);
    out.icons = await field.locator('svg').evaluateAll((icons) => icons.map((icon) => ({class: icon.getAttribute('class'), paths: icon.querySelectorAll('path').length, markupLength: icon.outerHTML.length})));
    out.hollowIcon = out.icons.some((icon) => /\bw-6\b/.test(icon.class || '') && !/\bh-6\b/.test(icon.class || ''));
    out.link = await field.locator('a').first().getAttribute('href').catch(() => null);
    out.linkText = flat(await field.locator('a').first().innerText().catch(() => null), 200);
    out.fieldButtons = await texts(field.getByRole('button'), 60);
    await shot(page, label);
    return out;
}

/**
 * From the version's "Title & Abstract": the header's publish control ("Schedule For
 * Publication" on a journal, "Publish" on a press, "Post" on a preprint server) up to the publish
 * window. A journal's "Review Publishing Details" panel comes first and is filled and confirmed.
 * Answers with what was on the way and the window's locator (null when none opened).
 */
async function openPublishWindow(page, app, submissionId, publicationId, label, {dashboard = 'editorial'} = {}) {
    const out = {};
    await page.goto(workflowAddress(app, submissionId, publicationId, 'titleAbstract', dashboard));
    await left(page).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    out.statusBefore = flat(await left(page).innerText().catch(() => null), 120);
    out.headerButtons = await texts(right(page).getByRole('button'), 60);
    const control = publishControl(page).first();
    if (!(await control.isVisible().catch(() => false))) {
        out.control = null;
        return {out, win: null};
    }
    out.control = flat(await control.innerText(), 60);
    const win = publishWindow(page);
    if (app.name === 'ojs') {
        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
        const pub = new PublicationScreen(page, app.contextPath);
        const panel = await pub.pressPublish({or: win});
        if (panel) {
            await pub.fillVersionDetails(panel);
            await pub.awaitAssignmentPreselected(panel).catch(() => {});
            await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
            await pub.selectIssueOption(panel, /Vol\. 1 No\. 2 \(2014\)/);
            await sleep(500);
            out.panel = {
                stage: flat(await panel.locator('select[name="versionStage"] option:checked').innerText().catch(() => null), 60),
                significance: flat(await panel.locator('select[name="versionIsMinor"] option:checked').innerText().catch(() => null), 60),
                assignment: 'Assign To Current/Back Issue',
                issue: flat(await panel.locator('select[name="issueId"] option:checked').innerText().catch(() => null), 80),
            };
            await shot(page, `panel-${label}`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        }
    } else {
        await control.click();
    }
    const opened = await win
        .waitFor({state: 'visible', timeout: T})
        .then(() => true)
        .catch(() => false);
    if (!opened) {
        out.windowOpened = false;
        out.screenInstead = flat((await screen(page)).text.dialog, 800);
        await shot(page, `window-${label}`);
        return {out, win: null};
    }
    // the window's form is drawn by Vue after the legacy window's markup arrives
    await win.locator('.pkpWorkflow__publishModal .pkpFormField').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(800);
    return {out, win};
}

/** The publish window as shown: its whole text verbatim, which list it carries, the items, the buttons. */
async function readWindow(page, win, label) {
    const s = await screen(page);
    const body = win.locator('.pkpWorkflow__publishModal');
    const text = await body.innerText();
    const box = body.locator('.pkpNotification--warning');
    const formButtons = await texts(body.getByRole('button'), 60);
    const out = {
        title: flat(await win.getByRole('heading').first().innerText().catch(() => null), 120),
        text,
        dialogText: s.text.dialog,
        listsRequirements: REQUIREMENTS.test(text),
        listsWarnings: text.includes(WARNINGS),
        warningBox: (await box.count()) ? {heading: flat(await box.locator('strong').first().innerText().catch(() => null), 200), items: await texts(box.locator('li'))} : null,
        formItems: await texts(body.locator('.pkpForm li, form li')),
        orcidLineAmongWarnings: null,
        listItems: await texts(body.locator('li')),
        windowButtons: await texts(win.getByRole('button'), 60),
        confirmButton: formButtons.find((b) => /^(Publish|Post|Schedule For Publication)$/.test(b)) || null,
        notices: s.notices,
    };
    out.orcidLineAmongWarnings = out.warningBox ? out.warningBox.items.some((item) => ORCID_LINES.includes(item)) : false;
    await shot(page, `window-${label}`);
    return out;
}

/** Press the window's confirm button and record what follows. */
async function confirmWindow(page, app, plan, win, confirmLabel, submissionId, label) {
    const out = {};
    const log = serverLog(app);
    const from = log.mark();
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await win.locator('.pkpWorkflow__publishModal').getByRole('button', {name: confirmLabel, exact: true}).last().click();
    const response = await answered;
    out.request = response ? {status: response.status(), ...bodyFacts(await response.text().catch(() => ''))} : null;
    await right(page).getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(1500);
    const after = await screen(page);
    out.notices = after.notices;
    out.windowStillOpen = await win.isVisible().catch(() => false);
    if (out.windowStillOpen) out.windowText = await win.innerText().catch(() => null);
    out.statusAfter = flat(await left(page).innerText().catch(() => null), 120);
    out.headerButtonsAfter = await texts(right(page).getByRole('button'), 60);
    out.stored = stored(app, submissionId);
    out.publicPage = await publicPage(app, plan, submissionId);
    out.serverLog = log.since(from).slice(0, 5).map((line) => flat(line, 300));
    await shot(page, `after-${label}`);
    return out;
}

/** An answer of the publish route: whether it names the ORCID messages or any warning, and what it is. */
function bodyFacts(text) {
    const out = {length: text.length, orcidMessageInBody: ORCID_MESSAGES.test(text), saysWarning: /warning/i.test(text)};
    try {
        const json = JSON.parse(text);
        if (json && typeof json === 'object' && !Array.isArray(json)) {
            out.keys = Object.keys(json).length;
            if ('status' in json) out.publicationStatus = json.status;
            if ('datePublished' in json) out.datePublished = json.datePublished;
            out.warningKeys = Object.keys(json).filter((key) => /warn/i.test(key));
        }
    } catch {
        out.json = false;
    }
    if (text.length <= 1500) out.body = text;
    return out;
}

/** One window case: seed (when any), the contributors' forms, the window, the confirm when offered. */
async function windowCase(page, app, plan, sha, name, facts, {seed = null, confirm = true} = {}) {
    const submissionId = plan.cases[name];
    const publicationId = publicationOf(app, submissionId);
    const label = `${sha}-${name}`;
    Object.assign(facts, {submissionId, publicationId, before: stored(app, submissionId)});
    if (seed) {
        Object.assign(facts, seed(publicationId));
        facts.onScreen = [];
        for (const [index, person] of facts.holders.entries()) {
            facts.onScreen.push(await contributorForm(page, app, submissionId, publicationId, person.name, `contributor-${label}-${index + 1}`));
        }
    } else {
        facts.contributors = contributors(app, publicationId).map((c) => c.name);
        facts.orcidRows = Number(rows(app, `select count(*) from author_settings s join authors a on a.author_id = s.author_id where a.publication_id = ${publicationId} and s.setting_name like 'orcid%'`)[0][0]);
    }
    const {out, win} = await openPublishWindow(page, app, submissionId, publicationId, label);
    facts.way = out;
    if (!win) return facts;
    facts.window = await readWindow(page, win, label);
    if (confirm && facts.window.confirmButton) {
        facts.confirmed = await confirmWindow(page, app, plan, win, facts.window.confirmButton, submissionId, label);
    } else {
        facts.confirmed = null;
        facts.notConfirmed = confirm ? 'the window offers no confirm button' : 'the window is read, never confirmed';
        facts.stored = stored(app, submissionId);
        facts.publicPage = await publicPage(app, plan, submissionId);
    }
    return facts;
}

/** The first contributor gets the iD with no token. */
const seedUnauthenticated = (app) => (publicationId) => {
    const [first] = contributors(app, publicationId);
    return {seededBySql: 'the `orcid` row alone on one contributor', orcid: ORCID, holders: [{...first, orcidRows: setOrcid(app, first.id)}]};
};

/** Two contributors get the same iD; a publication with one contributor gets a second by SQL first. */
const seedDuplicate = (app, verified) => (publicationId) => {
    const people = contributors(app, publicationId);
    const added = people.length < 2;
    if (added) people.push(addSecondContributor(app, publicationId, people[0]));
    const holders = people.slice(0, 2).map((person) => ({...person, orcidRows: setOrcid(app, person.id, {verified})}));
    return {
        seededBySql: `the same iD on two contributors, ${verified ? 'each with the token rows ("verified")' : 'each the `orcid` row alone (unauthenticated)'}`,
        secondContributor: added ? 'added by SQL ("Second Contributor")' : "the dataset's own second contributor",
        contributorsInAll: people.length,
        orcid: ORCID,
        holders,
    };
};

/** The route the window's form posts to, sent from the editor's page as the form sends it. */
async function apiCase(page, app, plan, sha, facts) {
    const submissionId = plan.cases.api;
    const publicationId = publicationOf(app, submissionId);
    Object.assign(facts, {submissionId, publicationId, before: stored(app, submissionId), ...seedUnauthenticated(app)(publicationId)});
    facts.onScreen = [await contributorForm(page, app, submissionId, publicationId, facts.holders[0].name, `contributor-${sha}-api-1`)];
    await page.goto(workflowAddress(app, submissionId, publicationId, 'titleAbstract'));
    await left(page).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    facts.statusBefore = flat(await left(page).innerText().catch(() => null), 120);
    const log = serverLog(app);
    const from = log.mark();
    const answer = await page.evaluate(
        async ({submissionId, publicationId}) => {
            const url = `${pkp.context.apiBaseUrl}submissions/${submissionId}/publications/${publicationId}/publish`;
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'X-Csrf-Token': pkp.currentUser.csrfToken, 'X-Http-Method-Override': 'PUT', 'Content-Type': 'application/json', Accept: 'application/json'},
                body: '{}',
            });
            return {route: new URL(url, location.href).pathname, status: response.status, text: await response.text()};
        },
        {submissionId, publicationId},
    );
    facts.request = {sent: 'POST with X-Http-Method-Override: PUT and X-Csrf-Token, body {}', route: answer.route, status: answer.status, ...bodyFacts(answer.text)};
    facts.serverLog = log.since(from).slice(0, 5).map((line) => flat(line, 300));
    facts.stored = stored(app, submissionId);
    facts.publicPage = await publicPage(app, plan, submissionId);
    await page.reload();
    await left(page).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    facts.statusAfter = flat(await left(page).innerText().catch(() => null), 120);
    facts.headerButtonsAfter = await texts(right(page).getByRole('button'), 60);
    return facts;
}

/** What the journal holds for Crossref's checks, and the article's DOI. */
function journalFacts(app, publicationId) {
    const held = Object.fromEntries(
        rows(
            app,
            `select setting_name, coalesce(setting_value, '') from journal_settings where journal_id = (select journal_id from journals where path = '${app.contextPath}') and locale = '' and setting_name in ('publisherInstitution', 'onlineIssn', 'printIssn', 'registrationAgency', 'doiPrefix', 'doiCreationTime', 'enabledDoiTypes', 'enableDois') order by 1`,
        ),
    );
    const one = (query) => (rows(app, query)[0] || [null])[0] || null;
    return {
        publisherInstitution: held.publisherInstitution || null,
        onlineIssn: held.onlineIssn || null,
        printIssn: held.printIssn || null,
        enableDois: held.enableDois || null,
        enabledDoiTypes: held.enabledDoiTypes || null,
        doiCreationTime: held.doiCreationTime || null,
        doiPrefix: held.doiPrefix || null,
        registrationAgency: held.registrationAgency || null,
        crossrefPluginEnabled: one("select setting_value from plugin_settings where plugin_name = 'crossrefplugin' and setting_name = 'enabled'"),
        articleDoi: one(`select d.doi from publications p join dois d on d.doi_id = p.doi_id where p.publication_id = ${publicationId}`),
    };
}

/**
 * OJS `crossref` (steps 1-9 of the header): the journal as the dataset ships it, Crossref made the
 * registration agency through the manager's screens, then the publish window of an article whose
 * contributor holds an unauthenticated iD. Read, never confirmed.
 */
async function crossrefCase(page, app, plan, sha, facts) {
    const {DoiSettings} = require('../../../pages/DoisPages');
    const submissionId = plan.cases.crossref;
    const publicationId = publicationOf(app, submissionId);
    facts.journalAsShipped = journalFacts(app, publicationId);
    await signIn(page, 'rvaca', {contextPath: app.contextPath});
    const settings = new DoiSettings(page, app.contextPath);
    await settings.gotoPlugins('crossrefplugin');
    facts.plugin = {row: flat(await settings.pluginRow('crossrefplugin').innerText(), 200), enabledBefore: await settings.pluginBox('crossrefplugin').isChecked()};
    if (!facts.plugin.enabledBefore) await settings.setPluginEnabled('crossrefplugin', true);
    facts.plugin.enabledAfter = await settings.pluginBox('crossrefplugin').isChecked();
    await settings.goto('Setup');
    await idle(page);
    facts.setup = {prefixBefore: await settings.prefixBox().inputValue(), automaticAssignment: await settings.creationTimeShown(), kinds: await settings.kinds()};
    await settings.prefixBox().fill(DOI_PREFIX);
    facts.setup.prefixTyped = DOI_PREFIX;
    facts.setup.save = (await settings.pressSave(settings.setup)).status();
    await idle(page);
    await settings.openSideTab('Registration');
    facts.registration = {agencyBefore: await settings.agencyState()};
    await settings.chooseAgency('Crossref');
    await settings.field('depositorName').waitFor({state: 'visible', timeout: T});
    await settings.field('depositorName').fill(DEPOSITOR.name);
    await settings.field('depositorEmail').fill(DEPOSITOR.email);
    facts.registration.typed = DEPOSITOR;
    facts.registration.panelText = flat(await settings.registration.innerText(), 900);
    facts.registration.save = (await settings.pressSave(settings.registration)).status();
    await idle(page);
    await shot(page, `doi-registration-${sha}-crossref`);
    facts.journal = journalFacts(app, publicationId);
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await windowCase(page, app, plan, sha, 'crossref', facts, {seed: seedUnauthenticated(app), confirm: false});
}

/**
 * OJS `crossref-complete` (steps 10-12 of the header), on the load `crossref` left: what
 * Crossref's lines asked for is given (on the dataset, whose journal ships a publisher and an
 * ISSN, the article's DOI: the DOIs page's "Assign DOIs"), then the window again.
 */
async function crossrefCompleteCase(page, app, plan, sha, facts, asked) {
    const {DoisPage} = require('../../../pages/DoisPages');
    const submissionId = plan.cases['crossref-complete'];
    const publicationId = publicationOf(app, submissionId);
    facts.crossrefAskedFor = asked;
    facts.journalBefore = journalFacts(app, publicationId);
    if (facts.journalBefore.registrationAgency !== 'crossrefplugin') facts.note = 'Crossref is not the agency on this load: run after `crossref` (CASES=crossref,crossref-complete)';
    facts.missingForCrossref = [
        ...(facts.journalBefore.publisherInstitution ? [] : ['publisher']),
        ...(facts.journalBefore.onlineIssn || facts.journalBefore.printIssn ? [] : ['an ISSN']),
        ...(facts.journalBefore.articleDoi ? [] : ["the article's DOI"]),
    ];
    facts.given = [];
    if (!facts.journalBefore.articleDoi) {
        const dois = new DoisPage(page, app.contextPath);
        await dois.goto();
        facts.doisPage = {tabs: await texts(page.getByRole('tab'), 60), bulkButton: flat(await dois.bulkActionsButton().innerText().catch(() => null), 60), rowBefore: flat(await dois.row(submissionId).innerText().catch(() => null), 300)};
        const response = await dois.runBulk('Assign DOIs', [submissionId]);
        await idle(page);
        facts.doisPage.assign = response.status();
        facts.doisPage.rowAfter = flat(await dois.row(submissionId).innerText().catch(() => null), 300);
        await shot(page, `dois-page-${sha}-crossref-complete`);
        facts.given.push('a DOI for the article, on the DOIs page ("Assign DOIs")');
    }
    if (facts.missingForCrossref.some((x) => x !== "the article's DOI")) facts.notGiven = 'a publisher or ISSN the journal lacks is not given by this script: the dataset ships both';
    facts.journal = journalFacts(app, publicationId);
    await windowCase(page, app, plan, sha, 'crossref-complete', facts, {seed: seedUnauthenticated(app), confirm: false});
}

/** OMP: Catalog › "Add Entry", the book found and chosen, "Save". */
async function addEntryCase(page, app, plan, sha, facts) {
    const {CatalogPage} = require(path.join(app.suiteDir, 'pages', 'CatalogPages.js'));
    const submissionId = plan.cases['add-entry'];
    const publicationId = publicationOf(app, submissionId);
    const title = rows(app, `select setting_value from publication_settings where publication_id = ${publicationId} and setting_name = 'title' and locale = 'en'`)[0].join('|');
    Object.assign(facts, {submissionId, publicationId, title, before: stored(app, submissionId), ...seedUnauthenticated(app)(publicationId)});
    facts.onScreen = [await contributorForm(page, app, submissionId, publicationId, facts.holders[0].name, `contributor-${sha}-add-entry-1`)];
    const catalog = new CatalogPage(page, app.contextPath);
    await catalog.goto();
    await idle(page);
    facts.listBefore = await texts(catalog.shownTitles(), 160);
    const panel = await catalog.openAddEntry();
    await panel.type(title.split(' ')[0]);
    await panel.options().first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    facts.suggested = await texts(panel.options(), 160);
    await panel.option(title).click();
    await sleep(800);
    facts.chosen = await texts(panel.root().getByRole('button', {name: /^Remove /}), 200);
    const log = serverLog(app);
    const from = log.mark();
    const answered = page.waitForResponse((r) => /addToCatalog/.test(r.url()), {timeout: T}).catch(() => null);
    await panel.saveButton().click();
    const response = await answered;
    facts.request = response ? {method: response.request().method(), status: response.status(), ...bodyFacts(await response.text().catch(() => ''))} : null;
    await sleep(1500);
    await idle(page);
    const s = await screen(page);
    facts.notices = s.notices;
    facts.panelOpen = await panel.root().isVisible().catch(() => false);
    if (facts.panelOpen) {
        facts.panelText = flat(await panel.root().innerText(), 800);
        facts.fieldErrors = await texts(panel.root().locator('.pkpFieldError'));
        facts.footerErrors = await texts(panel.root().locator('.pkpFormErrors'));
        facts.saveDisabled = await panel.saveButton().isDisabled().catch(() => null);
    }
    await shot(page, `add-entry-${sha}`);
    facts.serverLog = log.since(from).slice(0, 5).map((line) => flat(line, 300));
    facts.stored = stored(app, submissionId);
    await catalog.goto();
    await idle(page);
    facts.listAfter = await texts(catalog.shownTitles(), 160);
    facts.inCatalogList = facts.listAfter.some((shown) => shown.includes(title));
    facts.publicPage = await publicPage(app, plan, submissionId);
    return facts;
}

/** OPS: the preprint's own author on its "Title & Abstract": is a "Post" control offered, and what its window says. */
async function authorPostCase(page, app, plan, sha, facts) {
    const submissionId = plan.cases['author-post'];
    const publicationId = publicationOf(app, submissionId);
    const author = 'ccorino';
    Object.assign(facts, {author, submissionId, publicationId, ...seedUnauthenticated(app)(publicationId)});
    try {
        await signIn(page, author, {contextPath: app.contextPath});
        const {out, win} = await openPublishWindow(page, app, submissionId, publicationId, `${sha}-author-post`, {dashboard: 'mySubmissions'});
        facts.way = out;
        facts.postControlOffered = out.control !== null;
        facts.buttonsNamingPost = await texts(page.getByRole('button', {name: /post/i}), 60);
        await shot(page, `author-${sha}`);
        if (win) facts.window = await readWindow(page, win, `${sha}-author-post`);
        facts.stored = stored(app, submissionId);
    } finally {
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    }
    return facts;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('this check drives a dataset fleet: fleet-prep --dataset (see the header)');
    const plan = PLAN[app.name];
    const sha = pkpLibSha(app);
    const {OrcidSettingsTab} = require(path.join(app.suiteDir, 'pages', 'OrcidPages.js'));
    const R = {app: app.name, pkpLib: sha, orcidId: ORCID, cases: {}};
    const {page, close} = await launch(app);

    /** ORCID on through the manager's screens, then the editor signed in. */
    const prepare = async () => {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        const saved = await journalOrcidOn(page, app, OrcidSettingsTab, 'Public Sandbox');
        saved.stored = Object.fromEntries(rows(app, `select setting_name, setting_value from ${app.contextTables.settings} where setting_name in ('orcidEnabled', 'orcidApiType', 'orcidClientId') order by 1`));
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        return saved;
    };
    const run = async (name, fn) => {
        if (only.length && !only.includes(name)) return;
        if (!(name in plan.cases)) {
            if (plan.skip && plan.skip[name]) {
                R.cases[name] = {skipped: plan.skip[name]};
                console.log(`[${app.name}] pkp-lib ${sha} ${name}: skipped · ${plan.skip[name]}`);
            }
            return;
        }
        const facts = {};
        try {
            if ((plan.reloadBefore || []).includes(name)) {
                // the one unpublished preprint was posted by an earlier case: the dataset afresh
                // (and the browser's cookies dropped: with the reloaded database the earlier session's
                // cookies make the next sign-in answer "Invalid username/email or password")
                // (the page is left first: an open dashboard goes on fetching and answers 500 while the dump loads)
                await page.goto('about:blank');
                await resetDataset(app.name, app.dataset, {log: () => {}});
                await page.context().clearCookies();
                R.cases[`${name}:reload`] = {datasetReloaded: true, orcid: await prepare()};
            }
            await fn(facts);
        } catch (error) {
            facts.error = flat(String((error && error.message) || error).split('\n')[0], 400);
            await shot(page, `error-${sha}-${name}`).catch(() => {});
        }
        R.cases[name] = facts;
        const w = facts.window;
        const c = facts.confirmed;
        console.log(
            `[${app.name}] pkp-lib ${sha} ${name}: ` +
                (facts.error ? `ERROR ${facts.error} · ` : '') +
                (w ? `requirements ${w.listsRequirements} · warnings ${w.listsWarnings} · items ${JSON.stringify(w.listItems)} · ORCID line among the warnings ${w.orcidLineAmongWarnings} · confirm ${JSON.stringify(w.confirmButton)} · ` : '') +
                (c ? `publish ${c.request ? c.request.status : 'no request'} · "${c.statusAfter}" · public ${c.publicPage.status} · ` : '') +
                (facts.request ? `request ${facts.request.status} (ORCID message in the answer: ${facts.request.orcidMessageInBody}) · ` : '') +
                ('postControlOffered' in facts ? `the author's Post control offered: ${facts.postControlOffered} · ` : '') +
                ('inCatalogList' in facts ? `panel open ${facts.panelOpen} · in the catalog list ${facts.inCatalogList} · public ${facts.publicPage.status} · ` : '') +
                (facts.stored ? `stored publication status ${facts.stored.publicationStatus}` : ''),
        );
    };

    try {
        R.orcidSettings = await prepare();
        await run('control', (facts) => windowCase(page, app, plan, sha, 'control', facts, {confirm: false}));
        await run('refused-control', (facts) => windowCase(page, app, plan, sha, 'refused-control', facts));
        await run('author-post', (facts) => authorPostCase(page, app, plan, sha, facts));
        await run('unauthenticated', (facts) => windowCase(page, app, plan, sha, 'unauthenticated', facts, {seed: seedUnauthenticated(app)}));
        await run('duplicate-unauthenticated', (facts) => windowCase(page, app, plan, sha, 'duplicate-unauthenticated', facts, {seed: seedDuplicate(app, false)}));
        await run('duplicate-verified', (facts) => windowCase(page, app, plan, sha, 'duplicate-verified', facts, {seed: seedDuplicate(app, true)}));
        await run('api', (facts) => apiCase(page, app, plan, sha, facts));
        await run('add-entry', (facts) => addEntryCase(page, app, plan, sha, facts));
        await run('crossref', (facts) => crossrefCase(page, app, plan, sha, facts));
        await run('crossref-complete', (facts) => crossrefCompleteCase(page, app, plan, sha, facts, ((R.cases.crossref || {}).window || {}).listItems || null));
    } catch (error) {
        R.error = flat(String((error && error.message) || error).split('\n')[0], 400);
        await shot(page, `error-${sha}`).catch(() => {});
    } finally {
        // a narrowed run (CASES=…) keeps the other cases of an earlier run at this commit
        const earlier = outFile(`result-${sha}.json`);
        if (only.length && fs.existsSync(earlier)) {
            try {
                const before = JSON.parse(fs.readFileSync(earlier, 'utf8'));
                R.cases = {...(before.cases || {}), ...R.cases};
                R.orcidSettings = before.orcidSettings || R.orcidSettings;
            } catch {
                // unreadable: this run's cases alone
            }
        }
        record(`result-${sha}`, R);
        await close();
    }
});
