// PR review check — pkp/pkp-lib#13283 on `main`: pkp-lib#13493 with ojs#5920, omp#2503, ops#1444.
// Acceptance criterion 2 (#12267): the Site Settings "ORCID" tab, which the change shows on an
// install with one journal, press or server too, and its new "Custom Redirect Base URL", which
// every OAuth address the app builds is to use. PKP's default test dataset hosts exactly one
// context, the case the suites' scratch journals never show. Drives a dataset fleet as `admin`:
//
//   npm run fleet-prep -- --feature pr13493b --dataset 2 --reset
//   PROBE_FEATURE=pr13493b PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13493/site-orcid-tab.js
//
// What it records, in order (result-site-orcid-<pkp-lib sha>-<app>.json; no assertions):
//   1. Administration › Site Settings with the one context: the tabs and side tabs, whether
//      "ORCID" is among them, and that tab's fields (labels and descriptions verbatim).
//   2. ORCID turned on for `publicknowledge` on its own tab (Settings › Users & Roles › "ORCID":
//      "Public Sandbox", Client ID APP-TEST, Client Secret test-secret), then the OAuth addresses
//      the app builds with no redirect value stored (`states[0]`).
//   3. "Custom Redirect Base URL", each value typed after a fresh page load and saved (CASES
//      below): the save's answer, the words under the box and in the form, the `site_settings`
//      row afterwards and the box after a reload. After each stored value the OAuth addresses
//      again, each one's decoded `redirect_uri` in full:
//        - the profile's Identity tab, "Create or Connect your ORCID iD" (the popup's address);
//        - the registration page's same button, signed out;
//        - the link in the mail "Request verification" sends a contributor (CONTRIBUTOR below;
//          "Resend Verification Email" from the second press on).
//      With `https://example.com` stored and site-wide ORCID off: the context's own "ORCID" tab
//      (still editable, or locked as "configured globally").
//   4. "Enable ORCID functionality site-wide" ticked with the same placeholder credentials: the
//      context's tab then (U04 Rule 3), and again after the box is unticked.
//   5. A second, scratch context made through the `_test` API: the Site Settings tabs and the
//      "ORCID" tab's fields again.
// At the PR's base (pkp-lib 7cc6c81615) a one-context install has no "ORCID" site tab and no
// install has the redirect box: the script records `tabPresent: false` / `fieldPresent: false`,
// reads the OAuth addresses once, and takes step 4 after step 5, where the tab exists.
// Reset the fleet first: the script leaves ORCID on for the context, a second context and the
// site's ORCID credentials behind.
const {forEachApp, launch, signIn, idle, shot, record, sql, tag} = require('../../../probe');
const {CLIENT_ID, CLIENT_SECRET, pkpLibSha, attempt, readJournalTab, journalOrcidOn, requestVerification, requestMail, oauthParts} = require('./lib');

const FIELD = 'orcidCustomRedirectBaseUrl';
const CASES = [
    {name: 'untouched', value: null, readsOauth: false},
    {name: 'not-a-url', value: 'not a url', readsOauth: false},
    {name: 'no-slash', value: 'https://example.com', readsOauth: true, journalTab: true},
    {name: 'slash', value: 'https://example.com/', readsOauth: true},
    {name: 'cleared', value: '', readsOauth: true},
];
// a contributor without an iD on a submission of the dataset that is not published
const CONTRIBUTOR = {
    ojs: {submissionId: 4, name: 'Craig Montgomerie', to: 'cmontgomerie@mailinator.com'},
    omp: {submissionId: 2, name: 'Alvin Finkel', to: 'afinkel@mailinator.com'},
    ops: {submissionId: 1, name: 'Carlo Corino', to: 'ccorino@mailinator.com'},
};

forEachApp(async (app) => {
    const {OrcidSettingsTab, ProfileIdentityPage, openContributors} = require(`${app.suiteDir}/pages/OrcidPages.js`);
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {stubOrcidSite} = require('../../../support/orcid.js');
    const pages = {WorkflowPage, openContributors};
    const sha = pkpLibSha(app);
    const contexts = () => sql(app, `SELECT path FROM ${app.contextTables.table} ORDER BY 1`).split('\n').filter(Boolean);
    const storedRow = () => {
        const rows = sql(app, `SELECT '[' || coalesce(setting_value, '<null>') || ']' FROM site_settings WHERE setting_name = '${FIELD}'`);
        return rows === '' ? '(no row)' : rows;
    };
    const R = {app: app.name, pkpLib: sha, baseURL: app.baseURL, contextsAtStart: contexts(), rowAtStart: storedRow(), saves: [], states: []};

    const {page, context, close} = await launch(app);
    const reader = await launch(app); // signed out, for the registration page
    try {
        await signIn(page, 'admin', {contextPath: app.contextPath});

        // ── Site Settings: the tabs, the "ORCID" tab and its form ────────────────────────────
        const orcidPanel = () => page.getByRole('main').getByRole('tabpanel', {name: 'ORCID', exact: true});
        const openSiteOrcid = async () => {
            await page.goto(app.url('/index.php/index/en/admin/settings'));
            await idle(page);
            const tab = page.getByRole('main').getByRole('tab', {name: 'ORCID', exact: true});
            if ((await tab.count()) === 0) {
                return false;
            }
            await tab.first().click();
            await orcidPanel().waitFor({state: 'visible', timeout: 30_000});
            await idle(page);
            return true;
        };
        const tabNames = (first) =>
            page.evaluate((onlyFirst) => {
                const lists = [...document.querySelectorAll('main [role="tablist"]')].filter((l) => l.offsetParent);
                const names = (l) => [...l.querySelectorAll('[role="tab"]')].map((t) => t.textContent.replace(/\s+/g, ' ').trim());
                return onlyFirst ? (lists[0] ? names(lists[0]) : []) : lists.slice(1).map(names);
            }, first);
        const readSite = async (label) => {
            await page.goto(app.url('/index.php/index/en/admin/settings'));
            await idle(page);
            const out = {heading: await page.locator('main h1').first().innerText().catch(() => null), topTabs: await tabNames(true), sideTabs: {}};
            for (const top of out.topTabs) {
                await page.getByRole('main').getByRole('tablist').first().getByRole('tab', {name: top, exact: true}).click();
                await idle(page);
                out.sideTabs[top] = (await tabNames(false)).flat();
            }
            await shot(page, `site-settings-${sha}-${label}`);
            out.orcidTab = await openSiteOrcid();
            if (out.orcidTab) {
                out.fields = await orcidPanel()
                    .locator('.pkpFormField')
                    .evaluateAll((nodes) =>
                        nodes.map((n) => ({
                            label: ((n.querySelector('.pkpFormFieldLabel, legend') || {}).textContent || '').replace(/\s+/g, ' ').trim() || null,
                            description: ((n.querySelector('.pkpFormField__description') || {}).innerText || '').trim() || null,
                            shown: !!n.offsetParent,
                            controls: [...n.querySelectorAll('input, select')].map((c) => ({
                                name: c.name,
                                type: c.type,
                                value: c.type === 'checkbox' ? c.checked : c.type === 'password' ? `(${c.value.length} characters)` : c.value,
                                label: c.type === 'checkbox' && c.closest('label') ? c.closest('label').innerText.trim() : undefined,
                                options: c.tagName === 'SELECT' ? [...c.options].map((o) => o.textContent.trim()) : undefined,
                            })),
                        })),
                    );
                out.text = (await orcidPanel().innerText()).replace(/\n{2,}/g, '\n').trim();
                await shot(page, `site-orcid-tab-${sha}-${label}`);
            }
            return out;
        };
        R.site = await attempt(() => readSite('one-context'));
        console.log(`[${app.name}] ${sha} one context: top tabs ${JSON.stringify(R.site.topTabs)} · side ${JSON.stringify(R.site.sideTabs)} · ORCID tab ${R.site.orcidTab}`);

        // ── ORCID on for the context, through its own tab ───────────────────────────────────
        R.journalOn = await attempt(() => journalOrcidOn(page, app, OrcidSettingsTab, 'Public Sandbox'));

        // ── the OAuth addresses the app builds ──────────────────────────────────────────────
        const verdict = (redirectUri, custom) => {
            const expectedPrefix = `${(custom || app.baseURL).replace(/\/$/, '')}/index.php/${app.contextPath}/orcid/`;
            let host = null;
            try {
                host = new URL(redirectUri).host;
            } catch (error) {
                host = `unparsable: ${error.message}`;
            }
            return {redirectUri: redirectUri || null, expectedPrefix, wellFormed: !!redirectUri && redirectUri.startsWith(expectedPrefix), host};
        };
        const popupAddress = async (from, button) => {
            await stubOrcidSite(from.context());
            const [popup] = await Promise.all([from.waitForEvent('popup', {timeout: 20_000}), button.click()]);
            for (let i = 0; i < 40 && !/orcid\.org/.test(popup.url()); i++) {
                await from.waitForTimeout(250);
            }
            const address = popup.url();
            await popup.close().catch(() => {});
            return address;
        };
        const readOauth = async (label, custom) => {
            const state = {label, stored: storedRow()};
            state.profile = await attempt(async () => {
                const profile = new ProfileIdentityPage(page, app.contextPath);
                await profile.goto();
                await idle(page);
                if ((await profile.connectButton.count()) === 0) {
                    return {button: false};
                }
                const button = (await profile.connectButton.innerText()).replace(/\s+/g, ' ').trim();
                const parts = oauthParts(await popupAddress(page, profile.connectButton));
                return {button, ...parts, ...verdict(parts.redirectUri, custom)};
            });
            state.register = await attempt(async () => {
                await reader.page.goto(app.url(`/index.php/${app.contextPath}/en/user/register`));
                const button = reader.page.locator('#connect-orcid-button');
                if ((await button.count()) === 0) {
                    return {button: false};
                }
                const text = (await button.innerText()).replace(/\s+/g, ' ').trim();
                const parts = oauthParts(await popupAddress(reader.page, button));
                return {button: text, ...parts, ...verdict(parts.redirectUri, custom)};
            });
            state.mail = await attempt(async () => {
                const who = CONTRIBUTOR[app.name];
                const press = await requestVerification(page, app, pages, who);
                if (!press.pressed || press.status >= 400) {
                    return {press};
                }
                const mail = await requestMail(page, app, {to: who.to, since: press.since});
                const link = mail.authLink || {};
                return {contributor: who.name, pressed: press.pressed, status: press.status, subject: mail.subject, drained: mail.drained, ...link, ...verdict(link.redirectUri, custom)};
            });
            for (const where of ['profile', 'register', 'mail']) {
                const s = state[where];
                console.log(`[${app.name}] ${sha} ${label} · ${where}: ${s.error || (s.redirectUri ? `${s.wellFormed ? 'well-formed' : 'NOT of the expected form'} ${s.redirectUri}` : JSON.stringify(s))}`);
            }
            R.states.push(state);
        };
        await readOauth('none stored', null);

        // ── "Custom Redirect Base URL" ──────────────────────────────────────────────────────
        const saveSiteForm = async () => {
            const sent = [];
            const onResponse = (r) => {
                if (/\/index\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() !== 'GET') {
                    sent.push(r);
                }
            };
            page.on('response', onResponse);
            await orcidPanel().getByRole('button', {name: 'Save', exact: true}).click();
            for (let i = 0; i < 32 && !sent.length && !(await orcidPanel().locator('.pkpFieldError__message').count()); i++) {
                await page.waitForTimeout(250);
            }
            await idle(page);
            await page.waitForTimeout(500);
            page.off('response', onResponse);
            const out = {requests: sent.length};
            if (sent.length) {
                out.status = sent[0].status();
                const body = await sent[0].json().catch(() => null);
                out.answer = out.status >= 400 ? body : body && {[FIELD]: body[FIELD], orcidEnabled: body.orcidEnabled};
            }
            out.fieldErrors = (await orcidPanel().locator('.pkpFieldError__message').allInnerTexts()).map((t) => t.trim());
            out.formText = (await orcidPanel().innerText()).replace(/\n{2,}/g, '\n').trim();
            return out;
        };
        for (const c of CASES) {
            const facts = {case: c.name, typed: c.value};
            Object.assign(
                facts,
                await attempt(async () => {
                    const tabPresent = await openSiteOrcid();
                    const box = orcidPanel().locator(`input[name="${FIELD}"]`);
                    if (!tabPresent || (await box.count()) === 0) {
                        return {tabPresent, fieldPresent: false};
                    }
                    const out = {tabPresent, fieldPresent: true, boxBefore: await box.inputValue()};
                    if (c.value !== null) {
                        await box.fill(c.value);
                    }
                    Object.assign(out, await saveSiteForm());
                    await shot(page, `redirect-${sha}-${c.name}`);
                    out.row = storedRow();
                    await openSiteOrcid();
                    out.boxAfterReload = await box.inputValue();
                    return out;
                }),
            );
            R.saves.push(facts);
            console.log(`[${app.name}] ${sha} save ${c.name}: ${facts.error || (facts.fieldPresent ? `status ${facts.status ?? 'no request'} · errors ${JSON.stringify(facts.fieldErrors)} · row ${facts.row} · box after reload "${facts.boxAfterReload}"` : `tab ${facts.tabPresent}, no box`)}`);
            if (!facts.fieldPresent) {
                continue;
            }
            if (c.readsOauth) {
                await readOauth(`${c.name}: ${facts.row}`, /^\[https?:/.test(facts.row) ? facts.row.slice(1, -1) : null);
            }
            if (c.journalTab) {
                R.journalTabWithRedirectStored = {row: storedRow(), siteOrcidEnabled: sql(app, "SELECT setting_value FROM site_settings WHERE setting_name = 'orcidEnabled'"), ...(await attempt(() => readJournalTab(page, app, OrcidSettingsTab)))};
                await shot(page, `journal-tab-redirect-stored-${sha}`);
            }
        }

        // ── site-wide ORCID on: the context's tab locks; off again ──────────────────────────
        const siteWide = async (label) => {
            const out = {label, contexts: contexts(), redirectRow: storedRow()};
            const box = () => orcidPanel().getByRole('checkbox').first();
            if (!(await openSiteOrcid())) {
                return {...out, tabPresent: false};
            }
            out.boxLabel = (await orcidPanel().locator('label').filter({has: page.locator('input[type="checkbox"]')}).first().innerText()).trim();
            await box().check();
            await orcidPanel().locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
            await orcidPanel().locator('input[name="orcidClientId"]').fill(CLIENT_ID);
            await orcidPanel().locator('input[name="orcidClientSecret"]').fill(CLIENT_SECRET);
            out.ticked = await saveSiteForm();
            out.siteRowsTicked = sql(app, "SELECT setting_name || '=' || CASE WHEN setting_name = 'orcidClientSecret' THEN '(' || length(setting_value) || ' characters)' ELSE coalesce(setting_value, '<null>') END FROM site_settings WHERE setting_name LIKE 'orcid%' ORDER BY 1").split('\n');
            out.journalTabTicked = await attempt(() => readJournalTab(page, app, OrcidSettingsTab));
            await shot(page, `journal-tab-site-wide-${sha}`);
            await openSiteOrcid();
            await box().uncheck();
            out.unticked = await saveSiteForm();
            out.siteOrcidEnabledAfter = sql(app, "SELECT setting_value FROM site_settings WHERE setting_name = 'orcidEnabled'");
            out.journalTabUnticked = await attempt(() => readJournalTab(page, app, OrcidSettingsTab));
            return out;
        };
        const brief = (t) => (t.error ? t.error : `enable ${JSON.stringify(t.enable)} · API ${JSON.stringify(t.apiType)} · "configured globally" ${t.configuredGlobally}`);
        R.siteWide = await attempt(() => siteWide('one context'));
        if (R.siteWide.journalTabTicked) {
            console.log(`[${app.name}] ${sha} site-wide on (one context): ${brief(R.siteWide.journalTabTicked)} · off again: ${brief(R.siteWide.journalTabUnticked)}`);
        }

        // ── a second context ─────────────────────────────────────────────────────────────
        const scratch = tag('pr13493');
        R.secondContext = await attempt(async () => {
            await app.api.createContext({tag: scratch, users: [{username: `${scratch}mgr`, roles: ['manager']}]});
            return {path: scratch, contexts: contexts(), site: await readSite('two-contexts')};
        });
        if (R.secondContext.site) {
            console.log(`[${app.name}] ${sha} two contexts: top tabs ${JSON.stringify(R.secondContext.site.topTabs)} · ORCID tab ${R.secondContext.site.orcidTab} · fields ${JSON.stringify((R.secondContext.site.fields || []).map((f) => f.label))}`);
        }
        if (R.siteWide.tabPresent === false) {
            R.siteWideTwoContexts = await attempt(() => siteWide('two contexts'));
            if (R.siteWideTwoContexts.journalTabTicked) {
                console.log(`[${app.name}] ${sha} site-wide on (two contexts): ${brief(R.siteWideTwoContexts.journalTabTicked)} · off again: ${brief(R.siteWideTwoContexts.journalTabUnticked)}`);
            }
        }
        void context;
    } finally {
        record(`result-site-orcid-${sha}`, R);
        await reader.close();
        await close();
    }
});
