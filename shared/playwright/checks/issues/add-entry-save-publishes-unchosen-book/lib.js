// Helpers for walk.js (U70 A8). Requiring this file runs nothing.
const {idle, sql, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Keep every `addToCatalog` request's body and answer, in order. */
function watchAddToCatalog(page) {
    const calls = [];
    page.on('request', (req) => {
        if (/addToCatalog/.test(req.url())) calls.push({method: req.method(), body: req.postData(), status: null});
    });
    page.on('response', async (res) => {
        if (!/addToCatalog/.test(res.url())) return;
        const call = calls.find((c) => c.status === null);
        if (!call) return;
        call.status = res.status();
        call.answer = flat(await res.text().catch(() => null), 600);
    });
    return calls;
}

/** The suggestions' titles, in the order shown (empty when the list is closed). */
async function suggestionTitles(panel) {
    return panel.options().evaluateAll((os) => os.map((o) => o.innerText.replace(/\s+/g, ' ').trim()));
}

/** The chosen books' tags: the titles their "Remove {title}" crosses name. */
async function chosenTags(panel) {
    return panel
        .root()
        .getByRole('button', {name: /^Remove /})
        .evaluateAll((bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ').trim().replace(/^Remove /, '')));
}

/** Type a word into the box and wait until its suggestions are on screen. */
async function typeAndWait(panel, word) {
    const answer = await panel.type(word);
    await panel.options().first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(panel.page);
    return {status: answer.status(), suggestions: await suggestionTitles(panel)};
}

/** What the panel and the page show after a press: panel open?, tags, notices, the list. */
async function after(page, panel, catalog) {
    await sleep(1500);
    await idle(page);
    const s = await screen(page);
    const open = await panel.root().isVisible().catch(() => false);
    return {
        panelOpen: open,
        tags: open ? await chosenTags(panel) : null,
        notices: s.notices,
        listTitles: await catalog.shownTitles().allInnerTexts().catch(() => null),
    };
}

/** The unpublished Copyediting/Production books and their current version's state (status 3 = published). */
function bookStates(app) {
    // main numbers a version major.minor; 3.5 keeps one `version` column.
    const version = app.line && app.line !== 'main' ? 'p.version' : "p.version_major || '.' || p.version_minor";
    return sql(
        app,
        `select s.submission_id, s.status, p.status, ${version}, ` +
            "(select setting_value from publication_settings ps where ps.publication_id = p.publication_id and setting_name = 'title' and locale = 'en') " +
            'from submissions s join publications p on p.publication_id = s.current_publication_id ' +
            'where s.submission_id in (1, 4, 7, 11, 13) order by 1'
    );
}

module.exports = {T, flat, sleep, watchAddToCatalog, suggestionTitles, chosenTags, typeAndWait, after, bookStates};
