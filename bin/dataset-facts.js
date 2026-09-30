#!/usr/bin/env node
/**
 * @file bin/dataset-facts.js
 *
 * The generated part of docs/process/dataset.md: what PKP's default test
 * dataset holds per app (the context, every user with their roles, every
 * submission with its stage, status and people), read from the dumps
 * `npm run fetch-datasets` fetched, never from memory. Each dump is loaded
 * into a scratch database (`<campaign db>_dsfacts`, dropped afterwards), so
 * a walked-on dataset fleet never colours the reference.
 *
 *   npm run dataset-facts                 print the block
 *   npm run dataset-facts -- --write      replace the block in dataset.md
 *
 * The full tables are `main`'s; `stable-3_5_0` is compared with it and
 * only the differences are listed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {APPS, REPO_ROOT} = require('./apps.js');
const {DATASETS_DIR, datasetFleet, loadDump, dropDatabase, campaignCredentials, contextTables, query} = require('../shared/playwright/dataset.js');

const DOC = path.join(REPO_ROOT, 'docs', 'process', 'dataset.md');
const START = '<!-- dataset-facts:start -->';
const END = '<!-- dataset-facts:end -->';
const MAIN = 'main';
const OTHER = 'stable-3_5_0';

const CONTEXT = {
    ojs: {table: 'journals', id: 'journal_id', settings: 'journal_settings', label: 'OJS'},
    omp: {table: 'presses', id: 'press_id', settings: 'press_settings', label: 'OMP'},
    ops: {table: 'servers', id: 'server_id', settings: 'server_settings', label: 'OPS'},
};
const STAGES = {1: 'Submission', 2: 'Internal review', 3: 'Review', 4: 'Copyediting', 5: 'Production', 6: 'Done'};
const STATUS = {1: '', 3: 'published', 4: 'declined', 5: 'scheduled'};
const ROUND_STATUS = {
    1: 'revisions requested',
    2: 'resubmit for review',
    3: 'sent to review',
    4: 'accepted',
    5: 'declined',
    6: 'no reviewers yet',
    7: 'waiting for reviews',
    8: 'reviews ready',
    9: 'reviews completed',
    10: 'reviews overdue',
    11: 'revisions submitted',
    12: 'waiting for recommendations',
    13: 'recommendations ready',
    14: 'recommendations completed',
    15: 'resubmitted for review',
    16: 'returned to review',
};

const cell = (text) => String(text ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

/** The name setting a user or context has, English first. */
const preferEn = "ORDER BY (locale IN ('en', 'en_US')) DESC, locale LIMIT 1";

function readFacts(name, line) {
    process.env.PKP_E2E_LINE = line;
    const fleet = datasetFleet(name, 1);
    const scratch = {...fleet, db: `${fleet.campaignDb}_dsfacts`};
    loadDump(scratch, campaignCredentials(fleet));
    const q = (sql) => query(scratch, sql);
    try {
        const c = contextTables(scratch);
        const hasColumn = (table, column) =>
            q(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`).length > 0;
        const [contextId, contextPath] = q(`SELECT ${c.id}, path FROM ${c.table} ORDER BY ${c.id} LIMIT 1`)[0];
        const setting = (key) => (q(`SELECT setting_value FROM ${c.settings} WHERE ${c.id} = ${contextId} AND setting_name = '${key}' ${preferEn}`)[0] || [''])[0];
        const context = {
            path: contextPath,
            name: setting('name'),
            acronym: setting('acronym'),
            locales: (() => {
                const raw = setting('supportedLocales');
                try {
                    return JSON.parse(raw);
                } catch {
                    return raw ? [raw] : [];
                }
            })(),
            primaryLocale: (q(`SELECT primary_locale FROM ${c.table} WHERE ${c.id} = ${contextId}`)[0] || [''])[0],
        };
        const groupTable = name === 'omp' ? 'series' : 'sections';
        const groupSettings = name === 'omp' ? 'series_settings' : 'section_settings';
        const groupId = name === 'omp' ? 'series_id' : 'section_id';
        context.groups = q(`SELECT (SELECT setting_value FROM ${groupSettings} t WHERE t.${groupId} = g.${groupId} AND t.setting_name = 'title' ${preferEn}),
                (SELECT setting_value FROM ${groupSettings} t WHERE t.${groupId} = g.${groupId} AND t.setting_name = 'abbrev' ${preferEn})
            FROM ${groupTable} g WHERE g.${c.id} = ${contextId} ORDER BY g.seq, g.${groupId}`)
            .map(([title, abbrev]) => (abbrev ? `${cell(title)} (${cell(abbrev)})` : cell(title)));
        context.groupLabel = name === 'omp' ? 'series' : 'sections';
        context.issues = name !== 'ojs' ? [] : q(`SELECT i.issue_id, coalesce(i.volume::text, ''), coalesce(i.number, ''), coalesce(i.year::text, ''), i.published,
                (i.issue_id = (SELECT current_issue_id FROM journals WHERE journal_id = ${contextId}))::int
            FROM issues i WHERE i.journal_id = ${contextId} ORDER BY i.issue_id`)
            .map(([id, volume, number, year, published, current]) =>
                `${id}: Vol. ${volume} No. ${number} (${year}), ${published === '1' ? 'published' : 'unpublished'}${current === '1' ? ', current' : ''}`);
        const active = hasColumn('user_user_groups', 'date_end') ? 'AND (uug.date_end IS NULL OR uug.date_end > now())' : '';
        const userName = (alias, key) => `(SELECT setting_value FROM user_settings WHERE user_id = ${alias}.user_id AND setting_name = '${key}' AND setting_value <> '' ${preferEn})`;
        const users = q(`
            SELECT u.username, coalesce(${userName('u', 'givenName')}, ''), coalesce(${userName('u', 'familyName')}, ''), u.disabled::int,
                coalesce((SELECT string_agg(coalesce(
                        (SELECT setting_value FROM user_group_settings s WHERE s.user_group_id = ug.user_group_id AND s.setting_name = 'name' ${preferEn}),
                        CASE ug.role_id WHEN 1 THEN 'Site administrator' ELSE 'role ' || ug.role_id END), ', ' ORDER BY ug.role_id, ug.user_group_id)
                    FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
                    WHERE uug.user_id = u.user_id ${active}), '')
            FROM users u ORDER BY u.user_id`).map(([username, given, family, disabled, roles]) => ({
            username,
            name: `${given} ${family}`.trim(),
            disabled: disabled === '1',
            roles,
        }));
        const reviewState = `CASE WHEN ra.cancelled = 1 THEN 'cancelled' WHEN ra.declined = 1 THEN 'declined'
            WHEN ra.date_completed IS NOT NULL THEN 'completed' WHEN ra.date_confirmed IS NOT NULL THEN 'accepted' ELSE 'not responded' END`;
        const people = (roles) => `(SELECT string_agg(DISTINCT u.username, ', ') FROM stage_assignments sa
            JOIN users u ON u.user_id = sa.user_id JOIN user_groups ug ON ug.user_group_id = sa.user_group_id
            WHERE sa.submission_id = s.submission_id AND ug.role_id IN (${roles}))`;
        const submissions = q(`
            SELECT s.submission_id, s.stage_id, s.status, s.submission_progress,
                (SELECT setting_value FROM publication_settings ps WHERE ps.publication_id = s.current_publication_id
                    AND ps.setting_name = 'title' AND ps.setting_value <> '' ORDER BY (ps.locale = s.locale) DESC, ps.locale LIMIT 1),
                (SELECT count(*) FROM publications p WHERE p.submission_id = s.submission_id),
                coalesce(${people('16, 17')}, ''), coalesce(${people('65536')}, ''), coalesce(${people('4097')}, ''),
                coalesce((SELECT string_agg(u.username || ' r' || ra.round || ' ' || ${reviewState}, ', ' ORDER BY ra.round, ra.review_id)
                    FROM review_assignments ra JOIN users u ON u.user_id = ra.reviewer_id WHERE ra.submission_id = s.submission_id), ''),
                coalesce((SELECT rr.round || ' ' || rr.status FROM review_rounds rr WHERE rr.submission_id = s.submission_id
                    ORDER BY rr.stage_id DESC, rr.round DESC LIMIT 1), '')
            FROM submissions s ORDER BY s.submission_id`).map(([id, stage, status, progress, title, versions, editors, authors, assistants, reviewers, round]) => {
            const draft = !['', '0'].includes(progress);
            let state = draft ? 'incomplete (not submitted)' : STAGES[stage] || `stage ${stage}`;
            if (!draft && round && Number(stage) <= 3 && Number(status) === 1) {
                const [n, roundStatus] = round.split(' ');
                state += `, round ${n}: ${ROUND_STATUS[roundStatus] || `status ${roundStatus}`}`;
            }
            if (STATUS[status]) state += `, ${STATUS[status]}`;
            if (Number(versions) > 1) state += ` (${versions} versions)`;
            return {id: Number(id), title: cell(title), state, editors, authors, assistants, reviewers};
        });
        return {context, users, submissions};
    } finally {
        dropDatabase(scratch.db, campaignCredentials(fleet));
    }
}

function renderApp(name, facts) {
    const {context, users, submissions} = facts;
    const out = [];
    out.push(`### ${CONTEXT[name].label}: \`${context.path}\`, "${cell(context.name)}"`);
    out.push('');
    out.push(`Acronym ${cell(context.acronym)}; languages ${context.locales.join(', ')} (primary ${context.primaryLocale}); ` +
        `${context.groupLabel} ${context.groups.join(', ')}${context.issues.length ? `; issues ${context.issues.join('; ')}` : ''}. ` +
        `${users.length} users, ${submissions.length} submissions.`);
    out.push('');
    out.push('| Username | Name | Roles |');
    out.push('|---|---|---|');
    for (const u of users) {
        out.push(`| \`${u.username}\` | ${cell(u.name)}${u.disabled ? ' (disabled)' : ''} | ${cell(u.roles) || '(none)'} |`);
    }
    out.push('');
    out.push('| ID | Title | Stage, status | Editors | Author accounts | Other participants | Reviewers (round, state) |');
    out.push('|---|---|---|---|---|---|---|');
    for (const s of submissions) {
        out.push(`| ${s.id} | ${s.title} | ${s.state} | ${s.editors} | ${s.authors} | ${s.assistants} | ${s.reviewers} |`);
    }
    out.push('');
    return out.join('\n');
}

function renderDiff(name, base, other) {
    const lines = [];
    const c1 = base.context;
    const c2 = other.context;
    if (c1.path !== c2.path || c1.name !== c2.name || c1.locales.join() !== c2.locales.join()) {
        lines.push(`context: \`${c2.path}\` "${cell(c2.name)}" (${c2.locales.join(', ')})`);
    }
    const u1 = new Map(base.users.map((u) => [u.username, u]));
    const u2 = new Map(other.users.map((u) => [u.username, u]));
    const onlyMain = [...u1.keys()].filter((k) => !u2.has(k));
    const only35 = [...u2.keys()].filter((k) => !u1.has(k));
    if (onlyMain.length) lines.push(`users only on main: ${onlyMain.map((k) => `\`${k}\``).join(', ')}`);
    if (only35.length) lines.push(`users only on 3.5: ${only35.map((k) => `\`${k}\``).join(', ')}`);
    for (const [k, u] of u2) {
        if (u1.has(k) && u1.get(k).roles !== u.roles) {
            lines.push(`\`${k}\` roles on 3.5: ${cell(u.roles) || '(none)'} (main: ${cell(u1.get(k).roles)})`);
        }
    }
    const s1 = new Map(base.submissions.map((s) => [s.id, s]));
    const changes = new Map(); // one change text → the submissions it applies to
    for (const s of other.submissions) {
        const m = s1.get(s.id);
        if (!m) {
            lines.push(`submission ${s.id} only on 3.5: "${s.title}", ${s.state}`);
            continue;
        }
        const changed = ['title', 'state', 'editors', 'authors', 'assistants', 'reviewers'].filter((key) => m[key] !== s[key]);
        if (changed.length) {
            const text = changed.map((key) => `${key} on 3.5 "${s[key] || '(none)'}", on main "${m[key] || '(none)'}"`).join('; ');
            changes.set(text, [...(changes.get(text) || []), s.id]);
        }
    }
    for (const [text, ids] of changes) {
        lines.push(`submission${ids.length > 1 ? 's' : ''} ${ids.join(', ')}: ${text}`);
    }
    for (const s of base.submissions) {
        if (!other.submissions.some((o) => o.id === s.id)) {
            lines.push(`submission ${s.id} only on main: "${s.title}"`);
        }
    }
    return lines.length ? lines.map((l) => `- ${CONTEXT[name].label} ${l}`) : [`- ${CONTEXT[name].label}: the same context, users, roles and submissions as main.`];
}

function render() {
    const head = execFileSync('git', ['log', '-1', '--format=%h (%cs)'], {cwd: DATASETS_DIR, encoding: 'utf8'}).trim();
    const out = [
        `Generated by \`npm run dataset-facts -- --write\` from pkp/datasets ${head}, the \`pgsql\` dumps.`,
        '',
        `## The \`${MAIN}\` dataset`,
        '',
    ];
    const diffs = [];
    for (const name of Object.keys(APPS)) {
        const base = readFacts(name, MAIN);
        out.push(renderApp(name, base));
        let other = null;
        try {
            other = readFacts(name, OTHER);
        } catch (error) {
            diffs.push(`- ${CONTEXT[name].label}: not compared (${error.message.split('\n')[0]})`);
        }
        if (other) diffs.push(...renderDiff(name, base, other));
    }
    out.push(`## What differs in the \`${OTHER}\` dataset`, '');
    out.push(...diffs, '');
    return out.join('\n');
}

const block = render();
if (process.argv.includes('--write')) {
    const doc = fs.readFileSync(DOC, 'utf8');
    const start = doc.indexOf(START);
    const end = doc.indexOf(END);
    if (start === -1 || end === -1) {
        console.error(`dataset-facts: ${path.relative(REPO_ROOT, DOC)} lacks the ${START} … ${END} markers`);
        process.exit(1);
    }
    fs.writeFileSync(DOC, `${doc.slice(0, start + START.length)}\n${block}\n${doc.slice(end)}`);
    console.log(`dataset-facts: wrote ${path.relative(REPO_ROOT, DOC)}`);
} else {
    process.stdout.write(`${block}\n`);
}
