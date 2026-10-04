// Walk of U31 A10 (issue report docs/issues/U31-A10-back-to-search-nests-add-reviewer-window.md):
// on PKP's default test dataset (fleet reset first), dbarnes switches "Reviewer Suggestion at
// Submission" on, the author submits with a suggestion of a person with no account, dbarnes sends it
// to review, opens "Add Reviewer", presses the suggestion's "Select Reviewer", then "Back to Search"
// in the window that opens, then "Select Reviewer" on a reviewer and "Add Reviewer", and the stacking of a third window
// on top. OJS and OMP (OPS has no Review stage). Record names follow the script's own numbering;
// the report's Steps 1-7 are the setup, its 8-12 the records 5-9, its 13-15 the records 10-13.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=q5 node bin/probe.js all shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/walk.js
// Neighbour (WALK_MODE=nb, alone, on a fresh reset): the paths the fix must leave working:
//   nb1 a suggestion of a person holding the Reviewer role is selected in the same window;
//   nb2 the "Reviewers Suggested by Author" row's "Add Reviewer", then "Back to Search": one window, the search;
//   nb3 "Add Reviewer" › the no-account suggestion's "Select Reviewer" › username › "Add Reviewer":
//       the reviewer is on the round and the suggestion leaves the panel.
const {forEachApp, launch, signOut, screen, shot, record, note, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const RUN = process.env.PROBE_RUN || 'main';
const TITLE = 'Reviewer suggestions u31q5';
const QUINN_NAME = 'Quinn u31q5';

forEachApp(async (app) => {
    if (!H.WORDS[app.name]) return; // OPS: no surface
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: RUN, steps: {}};
    const {page, close} = await launch(app);
    const consoleLog = [];
    let stepNow = 'setup';
    page.on('console', (m) => {
        if (['error', 'warning'].includes(m.type())) consoleLog.push({step: stepNow, type: m.type(), text: H.flat(m.text(), 300)});
    });
    page.on('pageerror', (e) => consoleLog.push({step: stepNow, type: 'pageerror', text: H.flat(e.message, 300)}));
    const at = async (name, fn) => {
        stepNow = name;
        const s = {};
        try {
            const r = await fn();
            if (r !== undefined) s.result = r;
        } catch (e) {
            s.threw = H.flat(e.message, 400);
        }
        s.state = await H.windowsState(page).catch((e) => ({error: H.flat(e.message, 200)}));
        s.console = consoleLog.filter((c) => c.step === name);
        facts.steps[name] = s;
        record(`${MODE === 'nb' ? 'nb' : 's'}-${name}`, await screen(page).catch(() => null));
        await shot(page, `${MODE === 'nb' ? 'nb' : 's'}-${name}`).catch(() => {});
        return s;
    };
    try {
        const w = H.WORDS[app.name];
        if (MODE === 'nb') {
            const paul = {givenName: w.roleReviewer.name.split(' ')[0], familyName: w.roleReviewer.name.split(' ')[1], email: w.roleReviewer.email, affiliation: 'u31q5 Reviewer Institute', reason: 'Reviewed for us before.'};
            stepNow = 'setup';
            facts.setup = await H.setUp(page, app, {title: `${TITLE} nb`, suggestions: [H.QUINN, paul]});
            const id = facts.setup.submission.id;
            let modal = await H.openWorkflow(page, app, id);
            await at('nb1-role-reviewer-select', async () => {
                await H.openAddReviewer(page, modal);
                await H.selectSuggestion(page, w.roleReviewer.name);
            });
            await H.closeAll(page);
            await at('nb2-row-back-to-search', async () => {
                const {SuggestedReviewersPanel, ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
                await page.goto('about:blank');
                const panel = new SuggestedReviewersPanel(page);
                modal = await H.openWorkflow(page, app, id);
                await panel.loaded().catch(() => {});
                const win = await panel.addReviewerFromRow(QUINN_NAME);
                const before = await H.windowsState(page);
                await new ReviewerRequestWindow(page).backToSearchLink().click();
                await H.settle(page);
                await page.locator('[role="dialog"] .listPanel--selectReviewer').first().waitFor({timeout: H.T}).catch(() => {});
                return {before: {count: before.count, headings: before.windows.map((x) => x.headings)}};
            });
            await H.closeAll(page);
            await at('nb3-add-from-list', async () => {
                await page.goto('about:blank');
                modal = await H.openWorkflow(page, app, id);
                await H.openAddReviewer(page, modal);
                await H.selectSuggestion(page, QUINN_NAME);
                const top = H.windows(page).last();
                await top.locator('input[name="username"]').fill('qu31q5');
                const {waitForLegacyFormSettled} = require('../../../support/legacy.js');
                await waitForLegacyFormSettled(page, top).catch(() => {});
                const answered = page.waitForResponse((r) => /\/reviewer-grid\//.test(r.url()) && r.request().method() === 'POST', {timeout: 45_000});
                await top.getByRole('button', {name: 'Add Reviewer', exact: true}).last().click();
                const resp = await answered;
                await H.settle(page);
                return {post: resp.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: resp.status(), windowsLeft: await H.windows(page).count()};
            });
            await H.closeAll(page);
            await at('nb3-after', async () => {
                await page.goto('about:blank');
                modal = await H.openWorkflow(page, app, id);
                await H.sleep(1500);
                const text = H.flat(await modal.innerText(), 4000);
                return {reviewersHasQuinn: /Quinn u31q5/.test(text.split(/Reviewers Suggested by Author/)[0] || ''), suggestedPanel: /Reviewers Suggested by Author/.test(text), suggestedHasQuinn: /Reviewers Suggested by Author[\s\S]*Quinn u31q5/.test(text), text: text.slice(0, 2500)};
            });
            note(`q5 ${facts.line} ${RUN} nb ${app.name}: nb1 ${facts.steps['nb1-role-reviewer-select'].state.count} window(s), selected ${JSON.stringify((facts.steps['nb1-role-reviewer-select'].state.windows || []).map((x) => x.selected))}; nb2 ${facts.steps['nb2-row-back-to-search'].state.count} window(s); nb3 ${JSON.stringify(facts.steps['nb3-add-from-list'].result)} after ${JSON.stringify(facts.steps['nb3-after'].result && {r: facts.steps['nb3-after'].result.reviewersHasQuinn, p: facts.steps['nb3-after'].result.suggestedHasQuinn})}`);
            record('q5-nb-facts', facts);
            await signOut(page).catch(() => {});
            return;
        }

        // 1-4
        stepNow = 'setup';
        facts.setup = await H.setUp(page, app, {title: TITLE, suggestions: [H.QUINN]});
        const id = facts.setup.submission.id;
        let modal = await H.openWorkflow(page, app, id);
        // 5
        await at('5-add-reviewer', async () => {
            await H.openAddReviewer(page, modal);
        });
        // 6
        await at('6-select-suggestion', async () => {
            await H.selectSuggestion(page, QUINN_NAME);
        });
        // 7
        await at('7-back-to-search', async () => {
            await H.windows(page).last().getByRole('link', {name: 'Back to Search', exact: true}).click();
            await H.settle(page);
            await H.sleep(1500);
        });
        // 8
        await at('8-select-from-locate', async () => {
            await H.selectFromLocate(page, w.reviewer);
            await H.sleep(1000);
        });
        // 9
        await at('9-add-reviewer', async () => {
            const calls = [];
            const onResp = (r) => {
                if (r.request().method() === 'POST' && /reviewer/.test(r.url())) calls.push({url: r.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status(), navigation: r.request().isNavigationRequest()});
            };
            page.on('response', onResp);
            const urlBefore = page.url();
            await H.windows(page).last().getByRole('button', {name: 'Add Reviewer', exact: true}).last().click({timeout: 10_000});
            await page.waitForLoadState('load', {timeout: 15_000}).catch(() => {});
            await H.sleep(3000);
            await idle(page).catch(() => {});
            page.off('response', onResp);
            const top = H.windows(page).last();
            const errors = (await top.locator('label.error, .pkp_form_error, .error').allInnerTexts().catch(() => [])).map((t) => H.flat(t, 200)).filter(Boolean);
            return {urlBefore: urlBefore.replace(/^https?:\/\/[^/]+/, ''), urlAfter: page.url().replace(/^https?:\/\/[^/]+/, ''), calls, errors, body: H.flat(await page.locator('body').innerText().catch(() => ''), 600)};
        });
        // 10-13 (the second group: a third window stacks)
        await H.closeAll(page);
        await page.goto('about:blank');
        modal = await H.openWorkflow(page, app, id);
        await at('10-add-reviewer-again', async () => {
            await H.openAddReviewer(page, modal);
        });
        await at('11-select-suggestion', async () => {
            await H.selectSuggestion(page, QUINN_NAME);
        });
        await at('12-back-to-search', async () => {
            await H.windows(page).last().getByRole('link', {name: 'Back to Search', exact: true}).click();
            await H.settle(page);
            await H.sleep(1500);
        });
        await at('13-select-suggestion-again', async () => {
            await H.selectSuggestion(page, QUINN_NAME);
            await H.sleep(1500);
        });
        const st = (k) => facts.steps[k] && facts.steps[k].state;
        note(`q5 ${facts.line} ${RUN} steps ${app.name}: windows 5:${st('5-add-reviewer').count} 6:${st('6-select-suggestion').count} 7:${st('7-back-to-search').count} 8:${st('8-select-from-locate').count} 10:${st('10-add-reviewer-again').count} 11:${st('11-select-suggestion').count} 12:${st('12-back-to-search').count} 13:${st('13-select-suggestion-again').count}; 9: ${JSON.stringify(facts.steps['9-add-reviewer'].result || facts.steps['9-add-reviewer'].threw).slice(0, 500)}; page #advancedReviewerSearch after 7: ${st('7-back-to-search').page && st('7-back-to-search').page.advancedReviewerSearch}; console 7: ${JSON.stringify(facts.steps['7-back-to-search'].console.map((c) => c.text))}`);
        await H.closeAll(page);
        facts.console = consoleLog;
        record('q5-facts', facts);
        await signOut(page).catch(() => {});
    } catch (e) {
        facts.threw = H.flat(e.stack || e.message, 1500);
        facts.console = consoleLog;
        record(MODE === 'nb' ? 'q5-nb-facts' : 'q5-facts', facts);
        throw e;
    } finally {
        await close();
    }
});
