// Helpers of walk.js here (issue report docs/issues/U13-A16-unassigned-staff-read-pre-acceptance-pages.md).
// Requiring this file runs nothing. Each helper does what a person does (types an address, presses a
// link) and records what the screen shows; a refusal or a missing control is recorded, never thrown.
const {screen, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PREVIEW = 'This is a preview and has not been published.';

/** The reader page's address per app ("article/view", "catalog/book", "preprint/view"). */
function pagePath(app, id) {
    const what = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'}[app.name];
    return `/index.php/${app.contextPath}/en/${what}/${id}`;
}

/**
 * Type the reader page's address and read it: the answer's status, the heading, whether the
 * preview notice shows, and the names of `authors` (strings) that the page prints.
 */
async function readPage(page, app, id, authors = []) {
    const path = pagePath(app, id);
    const response = await page.goto(app.url(path)).catch((e) => ({error: flat(e.message)}));
    await idle(page).catch(() => {});
    const status = response && response.status ? response.status() : response;
    const h1 = flat(await page.locator('h1').first().innerText({timeout: 5_000}).catch(() => null), 200);
    const body = await page.locator('body').innerText({timeout: 5_000}).catch(() => '');
    const shot = await screen(page).catch(() => null);
    return {
        path,
        status,
        h1,
        notFound: /404 Not Found/.test(body),
        previewNotice: body.includes(PREVIEW),
        authorsShown: authors.filter((a) => body.includes(a)),
        abstractShown: /Abstract/.test(body),
        jatsLink: (await page.locator('a.obj_galley_link.xml').count().catch(() => 0)) > 0,
        text: flat(shot && shot.text ? shot.text.main || '' : body, 900),
    };
}

/**
 * Open the workflow at its dashboard address (`dashboard/editorial?workflowSubmissionId=n`), as a
 * person following a link: what the screen shows and every answer of 400 or more on the way.
 */
async function tryWorkflow(page, app, id) {
    const answers = [];
    const onResponse = (r) => {
        if (r.status() >= 400 && /\/api\/|\$\$\$call\$\$\$/.test(r.url())) answers.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '')});
    };
    page.on('response', onResponse);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page).catch(() => {});
        await sleep(1500);
        const dialogs = await page.getByRole('dialog').allInnerTexts().catch(() => []);
        const shot = await screen(page).catch(() => null);
        return {
            dialogs: dialogs.map((d) => flat(d, 300)),
            text: flat(shot && shot.text ? (shot.text.dialog || shot.text.main) : '', 500),
            answers,
        };
    } finally {
        page.off('response', onResponse);
    }
}

/** The authors' names of a submission's current version, as the pages print them ("Given Family"). */
function authorNames(app, sql, id) {
    const rows = sql(app, `select coalesce(g.setting_value,'') || ' ' || coalesce(f.setting_value,'')
        from submissions s join authors a on a.publication_id = s.current_publication_id
        left join author_settings g on g.author_id = a.author_id and g.setting_name = 'givenName' and g.locale = 'en'
        left join author_settings f on f.author_id = a.author_id and f.setting_name = 'familyName' and f.locale = 'en'
        where s.submission_id = ${Number(id)} order by a.seq`);
    return rows ? rows.split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

module.exports = {sleep, flat, PREVIEW, pagePath, readPage, tryWorkflow, authorNames};
