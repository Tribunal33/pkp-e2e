// Issue report walk: docs/issues/U29-A13-section-editor-changes-reviewer-recommendations.md
// (spec U29 register A13). OJS only: OMP and OPS have no reviewer-recommendations API.
//
// No screen of a Section Editor, or of a manager-level role whose "Permit changes to
// Settings" is off, calls this API, so it is checked directly (the one case the campaign
// allows): the requests the "Reviewer Recommendations" tab's own code sends
// (reviewerRecommendationManagerStore.js -> useFetch: X-Csrf-Token from
// pkp.currentUser.csrfToken; PUT and DELETE tunnelled as POST with X-Http-Method-Override)
// are sent with fetch() from the user's own signed-in page, as the report's console snippet
// does. Runs on PKP's default test dataset (a dataset fleet), its journal `publicknowledge`
// and its users:
//   precondition: rvaca (manager) unticks "Permit changes to Settings" on the "Journal
//      editor" role, which dbarnes holds
//   steps: dbuskins (Section editor) and dbarnes each type Settings › Workflow's address,
//      then add / rename / deactivate / activate / delete one entry through the API
//   in use: "Revisions Required" (id 2) is the recommendation of submitted reviews on
//      submissions 10 and 13; rename and delete of it are tried
//   cost of a deactivation: dbarnes reads "Read Review" for Aisla McCrae on submission 10,
//      dbuskins deactivates "Revisions Required", dbarnes reads it again; phudson accepts
//      his review request on submission 12 and reads step 3's "Recommendation" list;
//      dbuskins deactivates every other entry; phudson reloads step 3, writes a review and
//      presses "Submit Review"; the stored value and the managers' mailboxes are read
// MODE=nb: the neighbour check (rvaca, then admin: the same five requests and the list),
//      which the fix must leave working.
//
// Reset first:  npm run fleet-prep -- --feature issues-x9 --dataset 2 --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-x9 PROBE_AGENT=x9 node bin/probe.js ojs <this file>
// Neighbour:    MODE=nb PROBE_RUN=nb-out … (and PROBE_RUN=nb-in with fix.diff applied)
// Fix trial:    PROBE_RUN=fix … with fix.diff applied (node bin/try-fix.js apply fix.diff ojs)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-x9-3_5 … (the
//               surface probe records the API's absence and stops)
// Facts: .reports/<feature>/x9/a13-<mode>[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const R = require('../empty-review-can-be-submitted/lib.js'); // reviewer step 3 and "Read Review" helpers

const T = 20_000;
const MODE = process.env.MODE || 'walk';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const DENIED = /The current role does not have access to this operation\./;
const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
const IN_USE = {id: 2, title: 'Revisions Required', submission: 10, reviewer: 'Aisla McCrae', reviewId: 15};
const PENDING = {submission: 12, reviewer: 'phudson'};

// The report's console snippet, run in the page.
async function api(page, method, path = '', body) {
    return page.evaluate(async ({method, path, body}) => {
        const r = await fetch(pkp.context.apiBaseUrl + 'reviewers/recommendations' + path, {
            method: method === 'GET' ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrf-Token': pkp.currentUser.csrfToken,
                ...(['PUT', 'DELETE'].includes(method) ? {'X-Http-Method-Override': method} : {}),
            },
            body: body && JSON.stringify(body),
        });
        let json = null;
        try { json = await r.json(); } catch (e) { /* not JSON */ }
        return {status: r.status, json, base: pkp.context.apiBaseUrl};
    }, {method, path, body});
}

// The five requests of the Steps on one new entry.
async function fiveRequests(page, title) {
    const add = await api(page, 'POST', '', {title: {en: title}, type: 3, status: 1});
    const out = {apiBaseUrl: strip(add.base), add: add.status, added: add.json && add.json.title};
    const id = add.json && add.json.id;
    if (!id) return out;
    out.id = id;
    const ed = await api(page, 'PUT', `/${id}`, {title: {en: `${title} (edited)`}, type: 3, status: 1});
    out.edit = ed.status; out.edited = ed.json && ed.json.title;
    out.deactivate = (await api(page, 'PUT', `/${id}/status`, {status: 0})).status;
    out.activate = (await api(page, 'PUT', `/${id}/status`, {status: 1})).status;
    out.del = (await api(page, 'DELETE', `/${id}`)).status;
    return out;
}

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const name = (k) => `a13-${k}`;
    if (app.name !== 'ojs') { o.surface = 'no reviewer-recommendations API on a press or a preprint server'; record(name(MODE), o); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: R.flat(e.message, 400)};
            record(name(`${MODE}-${key}-threw`), await screen(page).catch(() => ({url: page.url()})));
            await shot(page, name(`${MODE}-${key}-threw`)).catch(() => {});
        }
        console.log(`[a13 ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const as = async (user) => { await signIn(page, user, {contextPath: app.contextPath}); await page.goto(cu('/dashboard/editorial')); await idle(page); };
    const settingsScreen = async (label) => {
        await page.goto(cu('/management/settings/workflow'));
        await idle(page); await pause(300);
        const s = await screen(page);
        record(name(`${MODE}-${label}-settings`), s);
        return {url: strip(page.url()), denied: DENIED.test(`${s.text.main || ''}`)};
    };
    try {
        // Surface probe: the released lines have no such API.
        await as('rvaca');
        await step('surface', async () => (await api(page, 'GET')).status);
        if (o.surface === 404) { o.note = 'no reviewer-recommendations API on this line'; return; }

        if (MODE === 'nb') {
            for (const user of ['rvaca', 'admin']) {
                await as(user);
                await step(`${user}Settings`, () => settingsScreen(user));
                await as(user);
                await step(`${user}Requests`, () => fiveRequests(page, `Minor Revisions sxx9 ${user}`));
                await step(`${user}List`, async () => { const l = await api(page, 'GET'); return {status: l.status, itemMax: l.json && l.json.itemMax}; });
            }
            return;
        }

        // Precondition: "Journal editor" without "Permit changes to Settings".
        await step('precondition', async () => {
            await page.goto(cu('/management/settings/access'));
            await idle(page);
            await page.locator('#roles-button').first().click();
            await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
            await idle(page);
            const row = page.locator('#roleGridContainer tr.gridRow').filter({has: page.locator('[id$="-name"] .label', {hasText: /^\s*Journal editor\s*$/})}).first();
            await row.locator('a.show_extras').click();
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(300);
            const box = form.locator('input[name="permitSettings"]');
            const before = await box.isChecked();
            await box.uncheck();
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            return {role: 'Journal editor', permitSettingsBefore: before, after: false};
        });

        // Steps 1-2 for each user.
        for (const user of ['dbuskins', 'dbarnes']) {
            await as(user);
            await step(`${user}Settings`, () => settingsScreen(user));
            await as(user);
            await step(`${user}Requests`, () => fiveRequests(page, `Minor Revisions sxx9 ${user}`));
        }

        // An entry in use: rename and delete.
        await as('dbuskins');
        await step('inUse', async () => ({
            id: IN_USE.id,
            usedBy: sql(app, `SELECT review_id || ':' || submission_id FROM review_assignments WHERE reviewer_recommendation_id = ${IN_USE.id} ORDER BY 1`).split('\n'),
            rename: (await api(page, 'PUT', `/${IN_USE.id}`, {title: {en: 'Revisions Required sxx9'}, type: 3, status: 1})).status,
            del: (await api(page, 'DELETE', `/${IN_USE.id}`)).status,
        }));

        // What deactivating an entry in use costs.
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await step('readReviewBefore', () => R.editorReadsReview(page, app, IN_USE.submission, IN_USE.reviewer));
        await shot(page, name(`${MODE}-read-review-before`)).catch(() => {});
        const since = new Date();
        await as('dbuskins');
        await step('deactivateInUse', async () => (await api(page, 'PUT', `/${IN_USE.id}/status`, {status: 0})).status);
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await step('readReviewAfter', () => R.editorReadsReview(page, app, IN_USE.submission, IN_USE.reviewer));
        await shot(page, name(`${MODE}-read-review-after`)).catch(() => {});
        await step('storedValue', () => sql(app, `SELECT reviewer_recommendation_id FROM review_assignments WHERE review_id = ${IN_USE.reviewId}`));
        const options = async () => page.locator('#reviewStep3Form select[name="reviewerRecommendationId"] option').allInnerTexts().then((a) => a.map((x) => x.trim()));
        await signIn(page, PENDING.reviewer, {contextPath: app.contextPath});
        await step('reviewerOpens', () => R.openStep3(page, app, PENDING.submission, {accept: true}));
        await step('reviewerListOneOff', options);
        await as('dbuskins');
        await step('deactivateRest', async () => {
            const out = {};
            for (const id of [1, 3, 4, 5, 6]) out[id] = (await api(page, 'PUT', `/${id}/status`, {status: 0})).status;
            return out;
        });
        await signIn(page, PENDING.reviewer, {contextPath: app.contextPath});
        await step('reviewerReopens', () => R.openStep3(page, app, PENDING.submission));
        await step('reviewerListAllOff', options);
        await step('reviewerSubmits', async () => {
            await R.typeBoxes(page, app, {author: 'sxx9 review for the author'});
            return R.submitAndRead(page, app);
        });
        record(name(`${MODE}-reviewer-after-submit`), await screen(page));
        await shot(page, name(`${MODE}-reviewer-after-submit`)).catch(() => {});
        await step('told', async () => ({
            rvaca: await app.fleetMail.count({to: 'rvaca@mailinator.com', since}),
            dbarnes: await app.fleetMail.count({to: 'dbarnes@mailinator.com', since}),
            admin: await app.fleetMail.count({to: 'pkpadmin@mailinator.com', since}),
        }));
        await as('rvaca');
        await step('managerList', async () => {
            const l = await api(page, 'GET');
            return (l.json && l.json.items || []).map((i) => `${i.id} ${i.title && i.title.en} status=${i.status} removable=${i.removable}`);
        });
    } finally {
        record(name(MODE), o);
        await close();
    }
});
