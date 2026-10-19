// U41 claim check, chunk H19 (housekeeping 2026-10-19): two incidentals rows on the contributor API.
//   Row 6:  a contributor record sent back exactly as `GET …/submissions/{id}/publications/{id}/contributors/{id}`
//           returned it, as a `PUT` (main: 500 "Nested arrays may not be passed to whereIn method." from the
//           `contributorRoles` objects; `"orcidVerificationRequested": null` refused).
//   Row 15: a contributor `PUT` that changes one field, with and without `affiliations`, and what is left of the
//           contributor's affiliations after it (main: any PUT; 3.5: a PUT without `affiliations`).
// Spec: docs/specs/U41-contributors-and-affiliations.md, Fields "Affiliations", "Contributor Roles" (A14),
// "CRediT roles…" (A29), footnote b (API cluster) and f-a29.
//
// Runs on a DATASET fleet freshly reset to PKP's default test dataset (no scratch context: the reset is the
// fresh state), as `dbarnes` (editor, manager-level) on `publicknowledge`. The requests are sent from dbarnes's
// own signed-in page with its CSRF token (the session a person has, not a constructed key). Every outcome is
// read three ways right after the request: the answer, a GET of the contributor, the stored rows; and on the
// contributor's own "Edit" form ("Affiliations" rows).
//
//   mode roundtrip (contributor X):
//     A0  screens: workflow "Contributors", the X row's "Edit" (affiliation rows); given name changed, "Close"
//         (what asks on the way out), "Edit" again (the given name), "Close".
//     A1  GET X: the record's shape (keys, contributorRoles, orcidVerificationRequested, affiliations).
//     A2  PUT the GET's body unchanged.                                          reads after.
//     A3  PUT the body with contributorRoles as their ids (as the form sends them).  reads after.
//     A4  PUT A3's body with every key A3's 400 named removed.                    reads after.
//     A5  screens: "Edit" on X after the PUTs (and after a reload).
//   mode onefield (X and contributor Y), in this order:
//     C1  main only (the record has contributorType): PUT X {contributorType as read, givenName}, no affiliations.
//     B1  PUT X {givenName} alone (no contributorType, no affiliations).          reads after; "Edit" on X.
//     B0  screens: "Edit" on Y, given name changed, "Save" (the form's own PUT: the control). reads after.
//     C2  main only: PUT Y {contributorType as read, givenName, affiliations as the GET returned them}.
//     B2  PUT Y {givenName, affiliations as the GET returned them} (no contributorType). reads after; "Edit" on Y.
//     B3  3.5 only: PUT Y {givenName} alone after B2.                             reads after; "Edit" on Y.
//
// Reset first (each run, each mode):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main, one app per call, under the app lock):
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=<feature> PKP_E2E_DATASET=<n> PROBE_AGENT=<id> PROBE_RUN=r1 \
//       node bin/probe.js ojs shared/playwright/checks/U41/H19/h19.js roundtrip
// stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=s1 … (no lock).
// Outputs: h19-<mode>-facts-<run>-<app>.json and the screens beside it. No assertions: the reader judges.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, serverLog, note} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const mode = process.argv[2] || 'roundtrip';

/** Per app: submission, the contributor's given name and family name (`name`, the list row's filter, which a changed
 * given name leaves alone); latest, unpublished version; one typed affiliation. */
const CASES = {
    ojs: {X: {sub: 6, given: 'Dana', name: 'Phillips'}, Y: {sub: 7, given: 'Domatilia', name: 'Sokoloff'}},
    omp: {X: {sub: 1, given: 'Arthur', name: 'Clark'}, Y: {sub: 2, given: 'Alvin', name: 'Finkel'}},
    ops: {X: {sub: 1, given: 'Carlo', name: 'Corino'}, Y: {sub: 4, given: 'Diaga', name: 'Diouf'}},
};

function resolve(app, c) {
    const q = `select a.author_id || '|' || a.publication_id from authors a join publications p on p.publication_id = a.publication_id
        join author_settings s on s.author_id = a.author_id and s.setting_name = 'givenName' and s.locale = 'en'
        where p.submission_id = ${c.sub} and s.setting_value = '${c.given}' order by p.publication_id desc limit 1`;
    const [id, pub] = sql(app, q.replace(/\s+/g, ' ')).split('|').map(Number);
    // the row's place in the list (by seq), for a row whose names a PUT has emptied
    const order = sql(app, `select author_id from authors where publication_id = ${pub} order by seq, author_id`).split('\n').map(Number);
    return {...c, id, pub, index: order.indexOf(id), rel: `submissions/${c.sub}/publications/${pub}/contributors/${id}`};
}

/** The stored rows: given and family name, email, country, the non-empty settings, affiliations (id, ror, English name). */
function stored(app, id) {
    const setting = (n) => sql(app, `select setting_value from author_settings where author_id = ${id} and setting_name = '${n}' and locale = 'en'`);
    return {
        givenName: setting('givenName'),
        familyName: setting('familyName'),
        email: sql(app, `select email from authors where author_id = ${id}`),
        country: sql(app, `select coalesce(setting_value, '') from author_settings where author_id = ${id} and setting_name = 'country'`),
        settings: sql(app, `select setting_name || ':' || locale from author_settings where author_id = ${id} and coalesce(setting_value, '') <> '' order by 1`)
            .split('\n')
            .filter(Boolean),
        affiliations: sql(
            app,
            `select a.author_affiliation_id || ' ' || coalesce(a.ror, '-') || ' ' || coalesce((select setting_value from author_affiliation_settings s where s.author_affiliation_id = a.author_affiliation_id and s.setting_name = 'name' and s.locale = 'en'), '-') from author_affiliations a where a.author_id = ${id} order by 1`,
        )
            .split('\n')
            .filter(Boolean),
    };
}

/** One REST call from the signed-in page, with its CSRF token. */
async function api(page, method, rel, body) {
    return page.evaluate(
        async ({method, rel, body}) => {
            /* global pkp */
            const res = await fetch(`${pkp.context.apiBaseUrl}${rel}`, {
                method,
                headers: {'X-Csrf-Token': pkp.currentUser.csrfToken, 'Content-Type': 'application/json', Accept: 'application/json'},
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const t = await res.text();
            let j = null;
            try {
                j = JSON.parse(t);
            } catch (e) {
                /* not JSON */
            }
            if (j && typeof j === 'object' && j.trace) j = {...j, trace: `(${j.trace.length} frames)`};
            return {status: res.status, json: j, text: j ? undefined : t.slice(0, 800)};
        },
        {method, rel, body},
    );
}

const affOf = (j) => (j && Array.isArray(j.affiliations) ? j.affiliations.map((a) => ({id: a.id, ror: a.ror, name: a.name})) : j && j.affiliations);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('h19.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[h19 ${app.name}] ${k}: ${flat(JSON.stringify(v), 1800)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, flat(e.message, 600));
            await shot(page, `h19-${mode}-${key}-error`).catch(() => {});
        }
    };

    /** Workflow "Contributors" of the submission (the latest version's entry). */
    const openContributors = async (sub) => {
        await wf.gotoEditorial(sub);
        await idle(page);
        await wf.expandLatestVersionNode().catch(() => {});
        const links = wf.menuLink('Contributors');
        for (let i = (await links.count()) - 1; i >= 0; i--) {
            if (await links.nth(i).isVisible().catch(() => false)) {
                await links.nth(i).click();
                await idle(page);
                await sleep(500);
                return true;
            }
        }
        return false;
    };
    const editDialog = () => page.getByRole('dialog', {name: 'Edit', exact: true});
    const openEdit = async (name, index = null) => {
        let item = wf.dialog().locator('li.listPanel__item').filter({hasText: name}).first();
        const found = await item.waitFor({timeout: index == null ? T : 8000}).then(() => true, () => false);
        if (!found) {
            if (index == null) throw new Error(`no contributor row "${name}"`);
            item = wf.dialog().locator('li.listPanel__item').nth(index);
            await item.waitFor({timeout: T});
            fact(`row "${name}" not found by name; opened row ${index + 1}`, flat(await item.innerText().catch(() => ''), 200));
        }
        await item.getByRole('button', {name: /^Edit/}).first().click();
        const dlg = editDialog();
        await dlg.waitFor({timeout: T});
        await dlg.locator('input[name="givenName-en"]').waitFor({timeout: T});
        await idle(page);
        await sleep(500);
        return dlg;
    };
    const affRows = (dlg) =>
        dlg
            .locator('.pkpFormField--affiliations tbody tr')
            .evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()))
            .catch(() => null);
    const closeEdit = async (dlg) => {
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await dlg.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await sleep(800);
        await idle(page);
    };
    /** "Edit" on the contributor: its "Affiliations" rows and given name, read and closed unsaved. */
    const readForm = async (key, c, {reload = false} = {}) => {
        if (reload) {
            await page.reload();
            await idle(page);
        }
        if (!(await openContributors(c.sub))) return fact(`${key} form`, 'no Contributors entry');
        record(`h19-${mode}-${key}-list`, await screen(page));
        const rows = await wf.dialog().locator('li.listPanel__item').allInnerTexts().catch(() => []);
        const row = flat(rows.find((t) => t.includes(c.name)) || rows[c.index] || null, 300);
        const dlg = await openEdit(c.name, c.index);
        const s = await screen(page);
        record(`h19-${mode}-${key}-edit`, s);
        await shot(page, `h19-${mode}-${key}-edit`);
        const box = async (n) => dlg.locator(`input[name="${n}"]`).first().inputValue({timeout: 3000}).catch(() => '(no box)');
        const out = {
            listRow: row,
            givenName: await box('givenName-en'),
            familyName: await box('familyName-en'),
            email: await box('email'),
            affiliationRows: await affRows(dlg),
        };
        if (out.affiliationRows && !out.affiliationRows.length) {
            out.affiliationsField = flat(await dlg.locator('.pkpFormField--affiliations').first().innerText().catch(() => 'no .pkpFormField--affiliations'), 400);
        }
        await closeEdit(dlg);
        fact(`${key} form`, out);
        return out;
    };
    /** After a request: the answer, then a GET and the stored rows. */
    const after = async (key, c, r) => {
        fact(`${key} answer`, {status: r.status, affiliations: affOf(r.json), body: r.status >= 300 ? r.json || r.text : '(record)'});
        const g = await api(page, 'GET', c.rel);
        fact(`${key} GET after`, {status: g.status, givenName: g.json && g.json.givenName, affiliations: affOf(g.json)});
        fact(`${key} stored after`, stored(app, c.id));
        return g;
    };

    try {
        const cases = CASES[app.name];
        const X = resolve(app, cases.X);
        const Y = resolve(app, cases.Y);
        fact('cases', {X, Y});
        fact('stored at start', {X: stored(app, X.id), Y: stored(app, Y.id)});
        await signIn(page, 'dbarnes');

        if (mode === 'roundtrip') {
            await part('A0', async () => {
                await readForm('A0', X);
                // the Edit window left with something changed and unsaved
                const dlg = await openEdit(X.name);
                await dlg.locator('input[name="givenName-en"]').fill(`${X.given} h19 unsaved`);
                await dlg.locator('input[name="givenName-en"]').blur();
                const n0 = dialogs.length;
                await closeEdit(dlg);
                await sleep(2000);
                fact('A0 leave changed form', {dialogs: dialogs.slice(n0), editStillOpen: await editDialog().isVisible().catch(() => false)});
                record(`h19-${mode}-A0-after-close`, await screen(page));
                if (await editDialog().isVisible().catch(() => false)) await closeEdit(editDialog());
                const again = await openEdit(X.name);
                fact('A0 given name on reopening', await again.locator('input[name="givenName-en"]').inputValue());
                await closeEdit(again);
                fact('A0 stored', stored(app, X.id));
            });
            let read = null;
            await part('A1', async () => {
                const g = await api(page, 'GET', X.rel);
                read = g.json;
                fact('A1 GET', {status: g.status, keys: read && Object.keys(read)});
                if (!read) return;
                fact('A1 shape', {
                    contributorRoles: read.contributorRoles,
                    contributorType: read.contributorType,
                    userGroupId: read.userGroupId,
                    orcidVerificationRequested: read.orcidVerificationRequested,
                    affiliations: read.affiliations,
                    creditRoles: read.creditRoles,
                    nullKeys: Object.keys(read).filter((k) => read[k] === null),
                    objectArrays: Object.keys(read).filter((k) => Array.isArray(read[k]) && read[k].some((v) => v && typeof v === 'object')),
                });
                record(`h19-${mode}-A1-get`, read);
            });
            if (!read) return;
            await part('A2', async () => after('A2', X, await api(page, 'PUT', X.rel, read)));
            const ids = Array.isArray(read.contributorRoles) ? read.contributorRoles.map((r) => (r && typeof r === 'object' ? r.id : r)) : undefined;
            const b3 = ids === undefined ? {...read} : {...read, contributorRoles: ids};
            let refused = [];
            await part('A3', async () => {
                fact('A3 contributorRoles sent', b3.contributorRoles);
                const r = await api(page, 'PUT', X.rel, b3);
                if (r.status === 400 && r.json && typeof r.json === 'object') refused = Object.keys(r.json);
                await after('A3', X, r);
            });
            await part('A4', async () => {
                const b4 = Object.fromEntries(Object.entries(b3).filter(([k]) => !refused.includes(k)));
                fact('A4 keys removed', refused);
                const r = await api(page, 'PUT', X.rel, b4);
                await after('A4', X, r);
                // a second pass if A4 was refused on other keys
                if (r.status === 400 && r.json && typeof r.json === 'object') {
                    const more = Object.keys(r.json);
                    const b4b = Object.fromEntries(Object.entries(b4).filter(([k]) => !more.includes(k)));
                    fact('A4b keys removed too', more);
                    await after('A4b', X, await api(page, 'PUT', X.rel, b4b));
                }
            });
            await part('A5', async () => {
                await readForm('A5', X);
                await readForm('A5r', X, {reload: true});
            });
        } else if (mode === 'onefield') {
            // open a context page first, so pkp.context is there
            await openContributors(X.sub);
            const first = await api(page, 'GET', X.rel);
            const typed = !!(first.json && 'contributorType' in first.json); // main has contributor types, 3.5 not
            fact('record has contributorType', typed);
            if (typed) {
                await part('C1', async () => {
                    const body = {contributorType: first.json.contributorType, givenName: {en: `${X.given} h19c1`}};
                    fact('C1 body', body);
                    await after('C1', X, await api(page, 'PUT', X.rel, body));
                    await readForm('C1', X, {reload: true});
                });
            }
            await part('B1', async () => {
                const body = {givenName: {en: `${X.given} h19b1`}};
                fact('B1 body', body);
                await after('B1', X, await api(page, 'PUT', X.rel, body));
                await readForm('B1', X, {reload: true});
            });
            await part('B0', async () => {
                await openContributors(Y.sub);
                const dlg = await openEdit(Y.name);
                fact('B0 rows before', await affRows(dlg));
                await dlg.locator('input[name="givenName-en"]').fill(`${Y.given} h19b0`);
                const answer = page.waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answer;
                let sent = null;
                try {
                    const b = r && r.request().postDataJSON();
                    sent = b && {keys: Object.keys(b), affiliations: b.affiliations, contributorRoles: b.contributorRoles, override: r.request().headers()['x-http-method-override'] || null};
                } catch (e) {
                    sent = 'unreadable';
                }
                fact('B0 form save', {status: r && r.status(), sent});
                await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page);
                await sleep(800);
                record(`h19-${mode}-B0-after-save`, await screen(page));
                const g = await api(page, 'GET', Y.rel);
                fact('B0 GET after', {status: g.status, givenName: g.json && g.json.givenName, affiliations: affOf(g.json)});
                fact('B0 stored after', stored(app, Y.id));
                await readForm('B0', Y, {reload: true});
            });
            if (typed) {
                await part('C2', async () => {
                    const g = await api(page, 'GET', Y.rel);
                    const body = {contributorType: g.json.contributorType, givenName: {...g.json.givenName, en: `${Y.given} h19c2`}, affiliations: g.json.affiliations};
                    fact('C2 body', body);
                    await after('C2', Y, await api(page, 'PUT', Y.rel, body));
                    await readForm('C2', Y, {reload: true});
                });
            }
            await part('B2', async () => {
                const g = await api(page, 'GET', Y.rel);
                const body = {givenName: {...(g.json && g.json.givenName), en: `${Y.given} h19b2`}, affiliations: g.json && g.json.affiliations};
                fact('B2 body', body);
                await after('B2', Y, await api(page, 'PUT', Y.rel, body));
                await readForm('B2', Y, {reload: true});
            });
            if (!typed) await part('B3', async () => {
                const body = {givenName: {en: `${Y.given} h19b3`}};
                fact('B3 body', body);
                await after('B3', Y, await api(page, 'PUT', Y.rel, body));
                await readForm('B3', Y, {reload: true});
            });
        }
    } finally {
        fact('dialogs', dialogs);
        fact('server log', log.since(from).slice(-15).map((l) => flat(l, 400)));
        record(`h19-${mode}-facts`, facts);
        await close();
    }
});
