// Helpers of the U35 OPS4 walk (issue report
// docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md). Requiring this file runs nothing.
// The "Participants" windows are the U35 A3 walk's (../typed-participant-message-not-sent/lib.js);
// this file adds "Edit" with one box changed, the read of the two places a notice can show, and a
// listener on the page's own requests for pending notices.
const {screen, shot, record, idle} = require('../../../probe');
const P = require('../typed-participant-message-not-sent/lib.js');

const {sleep, flat} = P;

/** Per app, on PKP's default test dataset: a submission in Production and what the steps choose. */
const CASES = {
    ojs: {id: 5, stage: 'workflow_5', role: 'Section editor', person: 'Minoti Inoue', template: 'Discussion (Production)'},
    omp: {id: 4, stage: 'workflow_5', role: 'Series editor', person: 'Minoti Inoue', template: 'Discussion (Production)'},
    ops: {id: 1, stage: 'workflow_5', role: 'Moderator', person: 'Minoti Inoue', template: 'Discussion (Production)'},
};

/**
 * Listen to the requests for pending notices the page itself sends (`notification/fetchNotification`):
 * who asked (the page's own script by GET, the stage's notification box by POST), in which order
 * they were sent and answered, and the notices each answer carried. `take()` returns the calls
 * since the last `take()`.
 */
function watchFetches(page) {
    let calls = [];
    const t0 = Date.now();
    page.on('request', (rq) => {
        if (!/notification\/fetch-?notification/i.test(rq.url())) return;
        const call = {by: rq.method() === 'POST' ? 'stage box (POST)' : 'page (GET)', options: /requestOptions/.test(rq.postData() || ''), sentAt: Date.now() - t0};
        calls.push(call);
        rq.response()
            .then(async (rs) => {
                if (!rs) return;
                call.answeredAt = Date.now() - t0;
                call.status = rs.status();
                const json = await rs.json().catch(() => null);
                const general = json && json.content && json.content.general;
                call.notices = general ? Object.values(general).flatMap((level) => Object.values(level).map((n) => flat(n.text, 120))) : [];
            })
            .catch(() => {});
    });
    return {
        take() {
            const out = calls;
            calls = [];
            return out;
        },
    };
}

/** The boxes the stage's main column shows above its panels: [{heading, text}] ("Notification" over a sentence). */
function stageBoxes(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        return [...document.querySelectorAll('[role=dialog] div.border.border-light.p-3')]
            .filter(vis)
            .filter((b) => b.querySelector(':scope > h3') && b.querySelector(':scope > p'))
            .map((b) => ({heading: b.querySelector(':scope > h3').innerText.trim(), text: b.querySelector(':scope > p').innerText.trim()}));
    });
}

/** The heading right under the stage's boxes, to say where a box sits. */
function firstPanelHeading(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const box = [...document.querySelectorAll('[role=dialog] div.border.border-light.p-3')].filter(vis)[0];
        if (!box) return null;
        const after = [...document.querySelectorAll('[role=dialog] h2, [role=dialog] h3, [role=dialog] h4')]
            .filter(vis)
            .filter((h) => box.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING && !box.contains(h));
        return after[0] ? after[0].innerText.trim() : null;
    });
}

/** After an action: where its notice shows, and the page's requests for pending notices. */
async function where(page, fetches, pressed, name) {
    const box = await stageBoxes(page);
    const out = {
        topRight: pressed.notices || [],
        stageBox: box,
        boxAbove: box.length ? await firstPanelHeading(page) : null,
        windowOpen: pressed.windowOpen,
        saveStatus: pressed.status,
        fetches: fetches.take(),
    };
    out.place = out.stageBox.length ? (out.topRight.length ? 'both' : 'stage box') : out.topRight.length ? 'top right' : 'nowhere';
    record(`${name}-where`, out);
    await shot(page, name).catch(() => {});
    return out;
}

/** "Assign", the role, "Search", the person, "OK". */
async function assign(page, fetches, c, name) {
    const win = await P.openAssign(page);
    const listed = await P.chooseRoleAndPerson(page, win, c.role, c.person);
    if (!listed) return {place: 'not driven', reason: `${c.person} not listed under ${c.role}`};
    fetches.take();
    return where(page, fetches, await P.press(page, win, 'OK', /save-?participant/i, name), name);
}

/** Row menu › "Edit", the "only allowed to recommend" box changed, "OK". */
async function edit(page, fetches, c, name) {
    await P.wf(page).getByRole('button', {name: `${c.person} More Actions`, exact: true}).first().click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const win = page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
    const box = win.locator('input[name="recommendOnly"]');
    await box.waitFor({timeout: 30000});
    await idle(page);
    const was = await box.isChecked();
    await box.setChecked(!was);
    fetches.take();
    const out = await where(page, fetches, await P.press(page, win, 'OK', /save-?participant/i, name), name);
    out.recommendOnly = {was, set: !was};
    return out;
}

/** Row menu › "Notify", the predefined message chosen, a message typed, "Notify". */
async function notify(page, fetches, c, text, name) {
    const win = await P.openNotify(page, c.person);
    await P.chooseTemplate(page, win, c.template);
    await P.typeMessage(page, win, text);
    fetches.take();
    return where(page, fetches, await P.press(page, win, 'Notify', /send-?notification/i, name), name);
}

module.exports = {P, CASES, sleep, flat, watchFetches, stageBoxes, where, assign, edit, notify, screen};
