// Helpers of the kept walk for docs/issues/U45-OJS9-author-response-doi-reminted.md (spec U45, register OJS9).
// Requiring this file runs nothing. The screens are driven by the helpers of the walks it reuses
// (../public-review-never-shown/lib.js, ../author-response-request-leaves-no-trace/lib.js,
// ../author-response-gone-after-revisions-upload/lib.js) and the shared DOIs page objects; this file
// adds the journal's DOI "Setup" save, the one API request that turns the "Author Response" kind on,
// and the database read that is the walk's evidence.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Settings › Distribution › DOIs › "Setup": "DOI Prefix" `prefix`, the kinds in `tick` ticked, "Save".
 * Returns the save's status, the kinds the form lists after it, and the request's CSRF header (the
 * one the next step's request carries, as the form's own does).
 */
async function setupSave(page, app, {prefix, tick = []}) {
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const settings = new DoiSettings(page, app.contextPath);
    await settings.goto('Setup');
    await settings.prefixBox().fill(prefix);
    for (const label of tick) await settings.kindBox(label).check();
    let csrf = null;
    const onReq = (r) => { if (/\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.method() !== 'GET') csrf = r.headers()['x-csrf-token'] || csrf; };
    page.on('request', onReq);
    const response = await settings.save(settings.setup);
    page.off('request', onReq);
    await idle(page);
    return {status: response.status(), kinds: await settings.kinds(), csrf};
}

/**
 * The journal settings request the "Setup" tab's "Save" sends, with `enabledDoiTypes` as given (the
 * form cannot send `authorResponse`: it has no box for it). Sent from the signed-in page, with the
 * session's CSRF token. Returns the status and the `enabledDoiTypes` the answer carries.
 */
async function putDoiTypes(page, app, {contextId, csrf, types}) {
    const url = app.url(`/index.php/${app.contextPath}/api/v1/contexts/${contextId}`);
    return page.evaluate(async ({url, csrf, types}) => {
        const token = csrf || (window.pkp && window.pkp.currentUser && window.pkp.currentUser.csrfToken);
        const r = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Csrf-Token': token, 'X-Http-Method-Override': 'PUT'},
            body: JSON.stringify({enabledDoiTypes: types}),
        });
        const body = await r.json().catch(() => null);
        return {status: r.status, enabledDoiTypes: body ? body.enabledDoiTypes : null, error: body && !body.id ? body : null};
    }, {url, csrf, types});
}

/** The journal's id and its stored `enabledDoiTypes`. */
function journal(app) {
    const id = Number(sql(app, `select journal_id from journals where path = '${app.contextPath}'`));
    const types = sql(app, `select setting_value from journal_settings where journal_id = ${id} and setting_name = 'enabledDoiTypes'`);
    return {id, enabledDoiTypes: types};
}

/**
 * The evidence after each assignment: submission `sid`'s author responses with their DOI, the
 * review of `reviewer` with its DOI, the publications' DOIs, every DOI row of the journal, and the
 * rows no item points at.
 */
function dbRead(app, {sid, reviewer, contextId}) {
    const rows = (q) => sql(app, q).split('\n').filter(Boolean);
    return {
        responses: rows(`select r.response_id || ' doi_id=' || coalesce(r.doi_id::text, 'null') || coalesce(' ' || d.doi, '')
            from review_round_author_responses r join review_rounds rr on rr.review_round_id = r.review_round_id
            left join dois d on d.doi_id = r.doi_id where rr.submission_id = ${sid} order by r.response_id`),
        review: rows(`select ra.review_id || ' doi_id=' || coalesce(ra.doi_id::text, 'null') || coalesce(' ' || d.doi, '')
            from review_assignments ra join users u on u.user_id = ra.reviewer_id left join dois d on d.doi_id = ra.doi_id
            where ra.submission_id = ${sid} and u.username = '${reviewer}' order by ra.review_id`),
        publications: rows(`select p.publication_id || ' doi_id=' || coalesce(p.doi_id::text, 'null') || coalesce(' ' || d.doi, '')
            from publications p left join dois d on d.doi_id = p.doi_id where p.submission_id = ${sid} order by p.publication_id`),
        dois: rows(`select doi_id || ' ' || doi || ' status=' || status from dois where context_id = ${contextId} order by doi_id`),
        orphans: rows(`select d.doi_id || ' ' || d.doi from dois d where d.context_id = ${contextId}
            and d.doi_id not in (select doi_id from publications where doi_id is not null)
            and d.doi_id not in (select doi_id from publication_galleys where doi_id is not null)
            and d.doi_id not in (select doi_id from issues where doi_id is not null)
            and d.doi_id not in (select doi_id from review_assignments where doi_id is not null)
            and d.doi_id not in (select doi_id from review_round_author_responses where doi_id is not null)
            order by d.doi_id`),
    };
}

/**
 * The DOIs page: tick submission `sid`, "Bulk Actions" › "Assign DOIs", confirm; the action's status,
 * the notice, any "DOI Updates Failed" window, and the row's expanded DOI table as the screen shows it.
 */
async function assignDois(page, app, sid) {
    const {DoisPage} = require('../../../pages/DoisPages.js');
    const dois = new DoisPage(page, app.contextPath);
    await dois.goto();
    const row = dois.row(sid);
    await row.waitFor({timeout: T});
    const response = await dois.runBulk('Assign DOIs', [sid]);
    const notice = page.getByText('Items successfully assigned new DOIs');
    await notice.first().waitFor({timeout: 5_000}).catch(() => {});
    const out = {
        status: response.status(),
        body: flat(await response.text().catch(() => null), 300),
        notice: (await notice.count()) > 0,
        failed: (await dois.failedDialog().count()) ? flat(await dois.failedDialog().innerText().catch(() => null), 400) : null,
    };
    const expanded = await dois.expand(dois.row(sid), sid).catch(() => null);
    out.expanded = expanded ? flat(await expanded.innerText().catch(() => null), 600) : null;
    out.doiBoxes = expanded ? await expanded.getByRole('textbox').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') || e.name || ''}=${e.value}`)) : null;
    return out;
}

module.exports = {T, flat, setupSave, putDoiTypes, journal, dbRead, assignDois};
