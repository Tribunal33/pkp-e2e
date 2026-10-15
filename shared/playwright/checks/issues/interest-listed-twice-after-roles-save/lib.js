// Helpers of walk.js (issue report docs/issues/U03-A20-interest-listed-twice-after-roles-save.md)
// and of ../server-roles-save-erases-interests/walk.js (U03 OPS3).
// Requiring this file runs nothing. Every helper drives the screens a person uses, except
// storedInterests(), a read-only query for Evidence.
const {idle, signIn, signOut, sql} = require('../../../probe');
const REG = require('../server-site-register-asks-reviewing-interests/lib.js');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A newcomer as the steps fill the Register page (password: the username twice). */
function newcomer(username, email) {
    return {givenName: 'h15b', familyName: 'Newcomer', affiliation: 'h15b', country: 'Canada', email, username, password: `${username}${username}`};
}

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: flat(e && e.stack ? e.stack : e, 800)};
    }
    console.log('[h15b]', facts.app, name, JSON.stringify(facts.steps[name]).slice(0, 500));
    return facts.steps[name];
}

/**
 * The context's own Register page: fill, tick the privacy line (when shown) and the reviewer
 * opt-in, type the interests into the "Reviewing interests" box that appears, press "Register".
 */
async function registerOnContextPage(page, app, person, typed) {
    const open = await REG.openRegister(page, app, app.contextPath);
    await REG.fillNewcomer(page, person);
    const privacy = await REG.tick(REG.contextPageConsent(page));
    const optin = page.locator('#reviewerOptinGroup input[type="checkbox"]');
    const optinLabel = flat(await page.locator('#reviewerOptinGroup label').first().innerText().catch(() => null), 200);
    const reviewer = await REG.tick(optin);
    const box = page.locator('#reviewerInterests input[name="interests"]');
    const boxLabel = flat(await page.locator('#reviewerInterests .label').first().innerText().catch(() => null), 80);
    const boxShown = await box.isVisible().catch(() => false);
    if (boxShown) {
        await box.click();
        await box.pressSequentially(typed);
    }
    const reg = await REG.pressRegister(page);
    return {open, privacy, optinLabel, reviewer, boxLabel, boxShown, typed: boxShown ? typed : null, ...reg};
}

/**
 * The site-wide Register page: fill, tick "Reader" and the privacy line under the context, the
 * site's privacy line when shown, type the interests into the "If you requested to be a reviewer…"
 * box, press "Register".
 */
async function registerOnSitePage(page, app, person, typed) {
    const open = await REG.openRegister(page, app, null);
    await REG.fillNewcomer(page, person);
    const block = REG.contextBlock(page, REG.CONTEXT_NAME[app.name]);
    const reader = await REG.tick(block.getByRole('checkbox', {name: 'Reader', exact: true}));
    const consent = await REG.tick(block.locator('.context_privacy input[type="checkbox"]'));
    const siteConsent = await REG.tick(REG.siteConsent(page));
    const prompt = flat(await page.locator('form#register .reviewer_nocontext_interests .label').first().innerText().catch(() => null), 200);
    const box = REG.siteInterestsBox(page);
    const boxShown = (await box.count()) ? await box.first().isVisible().catch(() => false) : false;
    if (boxShown) {
        await box.first().click();
        await box.first().pressSequentially(typed);
    }
    const reg = await REG.pressRegister(page);
    return {open, reader, consent, siteConsent, prompt, boxShown, typed: boxShown ? typed : null, ...reg};
}

/** Profile › "Roles" of the context, read: the interests field, its chips, the role boxes. */
async function readRoles(page, contextPath) {
    const r = await REG.readRolesInterests(page, contextPath);
    return {interests: r.interests, rolesText: flat(r.rolesText, 400)};
}

/** Profile › "Roles": open it, then press "Save" untouched; the request sent and the notice shown. */
async function saveRoles(page, contextPath, {before} = {}) {
    const profile = await REG.openRoles(page, contextPath);
    if (before) await before(profile);
    const chipsBefore = await profile.interestChips().allInnerTexts().catch(() => []);
    const sent = [];
    const onReq = (r) => { if (r.method() === 'POST' && /\/profile-tab\/save-roles/.test(r.url())) sent.push(r); };
    page.on('request', onReq);
    let toast = null;
    try {
        await profile.saveButton().click();
        const t0 = Date.now();
        while (Date.now() - t0 < 3000 && !toast) {
            const x = flat(await profile.toast.innerText().catch(() => ''), 200);
            if (x) toast = x;
            await new Promise((r) => setTimeout(r, 150));
        }
        await idle(page).catch(() => {});
    } finally {
        page.off('request', onReq);
    }
    const posts = [];
    for (const q of sent) {
        const res = await q.response().catch(() => null);
        posts.push({body: (q.postData() || '').replace(/csrfToken=[^&]+/, 'csrfToken=…'), status: res ? res.status() : null});
    }
    return {chipsBefore, posts, toast};
}

/** Remove a chip from the Roles tab's "Reviewing interests" (its "x"). */
async function removeChip(profile, text) {
    const chip = profile.form('roles').locator('#interests ul.tagit li.tagit-choice').filter({hasText: text});
    await chip.locator('.tagit-close').first().click();
    // tag-it fades the chip out and drops its hidden field only when the fade ends: wait for it,
    // or a "Save" pressed at once still posts the interest.
    await chip.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    return {removed: (await chip.count()) === 0};
}

/** The manager `rvaca`: Settings › "Users & Roles", search, "Edit", "View more details". */
async function managerView(page, app, search, words) {
    await signOut(page).catch(() => {});
    await signIn(page, 'rvaca');
    const r = await REG.readManagerEdit(page, app, search, words);
    return {aroundInterests: r.aroundInterests, rows: r.rows, moreDetails: r.moreDetails, landed: r.landed};
}

/** Read-only, for Evidence: the site's interest entries named as one of the words, and who is linked to each. */
function storedInterests(app, words) {
    const names = words.map((w) => `'${w}'`).join(',');
    try {
        return sql(app, `select s.controlled_vocab_entry_id || ':' || s.setting_value || ':' || coalesce((select string_agg(u.username, ',' order by u.username) from user_interests ui join users u on u.user_id=ui.user_id where ui.controlled_vocab_entry_id=s.controlled_vocab_entry_id), '') from controlled_vocab_entry_settings s join controlled_vocab_entries e on e.controlled_vocab_entry_id=s.controlled_vocab_entry_id join controlled_vocabs v on v.controlled_vocab_id=e.controlled_vocab_id where v.symbolic='interest' and s.setting_name='name' and s.setting_value in (${names}) order by 1`).split('\n').filter(Boolean);
    } catch (e) {
        return [`error: ${flat(e.message, 200)}`];
    }
}

module.exports = {flat, newcomer, step, registerOnContextPage, registerOnSitePage, readRoles, saveRoles, removeChip, managerView, storedInterests};
