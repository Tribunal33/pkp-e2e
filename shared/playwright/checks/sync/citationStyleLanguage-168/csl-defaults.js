// Kept check for pkp/citationStyleLanguage#168 (issue #128, stable-3_5_0 only: "Plugin settings should have a
// default selection for author/translator roles"). Drives the 3.5 line's fleet, context `publicknowledge`:
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=csl168 PROBE_AGENT=k1 PHASE=<phase> [LABEL=<l>] [SEL=<json>] \
//     node bin/probe.js all shared/playwright/checks/sync/citationStyleLanguage-168/csl-defaults.js
// Phases, one process each:
//   seed    author.alex's submission (unpublished), plus contributors planted on its publication, one per
//           contributor group: Translator, a manager-created group with the Author role and no locale key
//           ("Guest Writer"), and on OMP a Volume Editor; the plugin switched on with no settings saved
//           (the state the issue describes: enabled, never configured)
//   read    manager.maya: the APA citation (the plugin's own `get` endpoint, a manager may read an unpublished
//           one) and the settings form's ticked contributor boxes, plus the stored plugin_settings rows
//   save    manager.maya: the settings form submitted through its own POST with the contributor boxes ticked
//           as SEL says ({"groupAuthor": ["Author", ...], "groupTranslator": [], ...}, by label); every other
//           field as the form renders it
//   forget  the contributor settings rows deleted (back to "never saved")
// No assertions: the session judges.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, record, outFile, idle, tag} = require('../../../probe');
const fs = require('fs');

const PHASE = process.env.PHASE;
const LABEL = process.env.LABEL || PHASE;
const GROUP_SETTINGS = ['groupAuthor', 'groupTranslator', 'groupEditor', 'groupChapterAuthor'];
const PLUGIN = 'citationstylelanguageplugin';

function sql(app, query) {
    return execFileSync('psql', ['-X', '-d', app.db, '-tA', '-F', '|', '-c', query], {encoding: 'utf8'}).trim();
}

function groupId(app, localeKey) {
    return sql(app, `select ug.user_group_id from user_groups ug join user_group_settings s using (user_group_id)
        where ug.context_id = 1 and s.setting_name = 'nameLocaleKey' and s.setting_value = '${localeKey}'`);
}

function plantAuthor(app, publicationId, userGroupId, given, family, seq) {
    const id = sql(app, `insert into authors (email, include_in_browse, publication_id, seq, user_group_id)
        values ('${given.toLowerCase()}@example.org', 1, ${publicationId}, ${seq}, ${userGroupId}) returning author_id`).split('\n')[0];
    sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) values
        (${id}, 'en', 'givenName', '${given}'), (${id}, 'en', 'familyName', '${family}')`);
    return id;
}

function stored(app) {
    return sql(app, `select setting_name, setting_type, coalesce(setting_value, '<NULL>') from plugin_settings
        where plugin_name = '${PLUGIN}' and context_id = 1 order by setting_name`).split('\n').filter(Boolean);
}

const formUrl = (app) => app.url(`/index.php/${app.contextPath}/$$$call$$$/grid/settings/plugins/settings-plugin-grid/manage?verb=settings&plugin=${PLUGIN}&category=generic`);

// The settings form as the modal loads it: every contributor box with its label and whether it is ticked.
async function readForm(page, app) {
    return page.evaluate(async (url) => {
        const res = await fetch(url, {credentials: 'same-origin'});
        const json = await res.json();
        const doc = new DOMParser().parseFromString(json.content, 'text/html');
        const boxes = {};
        doc.querySelectorAll('input[type=checkbox]').forEach((el) => {
            const name = el.name.replace('[]', '');
            if (!/^group/.test(name)) return;
            const label = doc.querySelector(`label[for="${el.id}"]`)?.textContent.trim() || el.parentElement?.textContent.trim();
            (boxes[name] = boxes[name] || []).push({value: el.value, label, checked: el.checked});
        });
        return {status: res.status, boxes};
    }, formUrl(app));
}

async function saveForm(page, app, sel) {
    return page.evaluate(async ({url, sel}) => {
        const res = await fetch(url, {credentials: 'same-origin'});
        const json = await res.json();
        const doc = new DOMParser().parseFromString(json.content, 'text/html');
        const form = doc.querySelector('form');
        doc.querySelectorAll('input[type=checkbox]').forEach((el) => {
            const name = el.name.replace('[]', '');
            if (!(name in sel)) return;
            const label = doc.querySelector(`label[for="${el.id}"]`)?.textContent.trim() || el.parentElement?.textContent.trim();
            el.checked = sel[name].includes(label);
        });
        const body = new URLSearchParams();
        form.querySelectorAll('input, select, textarea').forEach((el) => {
            if (!el.name || el.disabled) return;
            if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
            if (el.tagName === 'SELECT' && el.multiple) {
                [...el.selectedOptions].forEach((o) => body.append(el.name, o.value));
                return;
            }
            body.append(el.name, el.value);
        });
        const action = form.getAttribute('action') || url + '&save=1';
        const post = await fetch(action, {method: 'POST', body, credentials: 'same-origin',
            headers: {'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest'}});
        const text = await post.text();
        return {action, status: post.status, sent: [...body.keys()].filter((k) => /^group/.test(k)).map((k) => k), response: text.slice(0, 300)};
    }, {url: formUrl(app), sel});
}

async function citation(page, app, state) {
    const url = app.url(`/index.php/${app.contextPath}/citationstylelanguage/get/apa?submissionId=${state.submissionId}&publicationId=${state.publicationId}&return=json`);
    const res = await page.request.get(url);
    const text = await res.text();
    let content = text;
    try { content = JSON.parse(text).content; } catch (e) { /* the raw body */ }
    return {status: res.status(), text: String(content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()};
}

forEachApp(async (app) => {
    const stateFile = outFile('state');
    if (PHASE === 'seed') {
        const scratch = tag('csl');
        const sub = await app.api.createSubmission({tag: scratch, context: app.contextPath, submitter: 'author.alex', title: 'Citation defaults probe'});
        const submissionId = sub.submissionId ?? sub.id;
        const publicationId = sql(app, `select current_publication_id from submissions where submission_id = ${submissionId}`);
        // The line's submission seed skips the contributor roles (a main-only class), leaving the submitter's own
        // contributor without a group; a 3.5 submission puts it in Author.
        sql(app, `update authors set user_group_id = ${groupId(app, 'default.groups.name.author')} where publication_id = ${publicationId} and user_group_id is null`);
        const custom = sql(app, `insert into user_groups (context_id, role_id, is_default, show_title, permit_self_registration, permit_metadata_edit, permit_settings, masthead)
            values (1, 65536, 0, 1, 0, 0, 0, 0) returning user_group_id`).split('\n')[0];
        sql(app, `insert into user_group_settings (user_group_id, locale, setting_name, setting_value) values
            (${custom}, 'en', 'name', 'Guest Writer'), (${custom}, 'en', 'abbrev', 'GW')`);
        const planted = {};
        const translator = groupId(app, 'default.groups.name.translator');
        if (translator) planted.translator = plantAuthor(app, publicationId, translator, 'Tomas', 'Translator', 5);
        planted.custom = plantAuthor(app, publicationId, custom, 'Cora', 'Custom', 6);
        const volumeEditor = groupId(app, 'default.groups.name.volumeEditor');
        if (volumeEditor) planted.volumeEditor = plantAuthor(app, publicationId, volumeEditor, 'Vera', 'Volumeeditor', 7);
        sql(app, `delete from plugin_settings where plugin_name = '${PLUGIN}' and context_id = 1`);
        sql(app, `insert into plugin_settings (plugin_name, context_id, setting_name, setting_value, setting_type) values ('${PLUGIN}', 1, 'enabled', '1', 'bool')`);
        const authors = sql(app, `select a.author_id, a.user_group_id, s.setting_value from authors a join author_settings s using (author_id)
            where a.publication_id = ${publicationId} and s.setting_name = 'familyName' order by a.seq`).split('\n');
        const state = {submissionId, publicationId, custom, planted, authors, response: sub};
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        record('seed', state);
        return;
    }
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (PHASE === 'forget') {
        sql(app, `delete from plugin_settings where plugin_name = '${PLUGIN}' and context_id = 1 and setting_name in (${GROUP_SETTINGS.map((s) => `'${s}'`).join(',')})`);
        record(`forget-${LABEL}`, {stored: stored(app)});
        return;
    }
    const {page} = await launch(app);
    await signIn(page, 'manager.maya');
    await page.goto(app.url(`/index.php/${app.contextPath}/submissions`));
    await idle(page);
    const out = {};
    if (PHASE === 'save') {
        out.save = await saveForm(page, app, JSON.parse(process.env.SEL || '{}'));
    }
    out.stored = stored(app);
    out.form = await readForm(page, app);
    out.ticked = Object.fromEntries(Object.entries(out.form.boxes).map(([k, v]) => [k, v.filter((b) => b.checked).map((b) => b.label)]));
    out.citation = await citation(page, app, state);
    record(`${PHASE}-${LABEL}`, out);
    console.log(`[csl168] ${app.name} ${PHASE}-${LABEL}: ticked ${JSON.stringify(out.ticked)} | citation ${out.citation.status}: ${out.citation.text.slice(0, 260)}`);
});
