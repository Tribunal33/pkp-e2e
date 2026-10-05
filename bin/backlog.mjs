#!/usr/bin/env node
// backlog.mjs — the housekeeping session's queue: everything waiting to be
// worked on, read from where each kind of work lives, in the order the session
// works it (MAINTENANCE "The housekeeping session"). Nothing here is kept by
// hand, so the queue cannot drift from the specs and tracking files.
// run: npm run backlog [-- --all]   (--all lists every item, not the first few)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = process.argv.includes('--all');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const specFiles = fs.readdirSync(path.join(root, 'docs/specs'))
    .filter((f) => /^U\d{2}-.*\.md$/.test(f)).sort();

// The entries a report covers, from its "Tracked in" bullet's links: an issue
// report under docs/issues/, or an open report under docs/reports/ (the entry
// waits for it).
function trackedIn(dir) {
    const map = new Map();
    for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => x.endsWith('.md'))) {
        const m = read(`${dir}/${f}`).match(/^- \*\*Tracked in\*\*[\s\S]*?(?=\n- \*\*|\n\n)/m);
        for (const [, spec, anchor] of (m ? m[0] : '').matchAll(/specs\/(U\d{2})-[\w-]+\.md#([a-z0-9-]+)/g)) {
            map.set(`${spec}#${anchor}`, `${dir}/${f}`);
        }
    }
    return map;
}
const reported = trackedIn('docs/issues');
const openReports = trackedIn('docs/reports');

// An entry's body: from its anchor to the next anchor or heading.
function bodies(text) {
    const out = {};
    let id = null;
    for (const line of text.split('\n')) {
        const m = line.match(/^<a id="([a-z0-9-]+)"><\/a>/);
        if (m) { id = m[1]; out[id] = ''; continue; }
        if (/^#/.test(line)) id = null;
        if (id) out[id] += line + '\n';
    }
    return out;
}

function table(p) {
    if (!exists(p)) return [];
    return read(p).split('\n').filter((l) => /^\| /.test(l) && !/^\|[- |]+\|$/.test(l)).slice(1)
        .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
}
const incidentals = table('docs/tracking/incidentals.md');
const friction = read('docs/tracking/friction.md').split('\n').filter((l) => /^\d{4}-\d{2}-\d{2} · /.test(l));
const progress = table('docs/tracking/PROGRESS.md').filter((r) => /^U\d{2}$/.test(r[0]));
const builds = progress.filter((r) => r.some((c) => /^(pending|in_progress)$/.test(c)));

const refreshes = []; const owed = []; const held = []; const planned = [];
for (const f of specFiles) {
    const text = read(`docs/specs/${f}`);
    const spec = f.slice(0, 3);
    const body = bodies(text);
    const seen = new Set();
    for (const line of text.split('\n')) {
        const m = line.match(/^\| \[([A-Z]{1,4}\d+)\]\(#([a-z0-9-]+)\) \| (.*) \| (🐞|❓|✅) \| ([^|]*)\|/);
        if (!m || m[4] !== '🐞' || seen.has(m[1])) continue;
        seen.add(m[1]);
        const [, id, anchor, finding, , impact] = m;
        const b = body[anchor] || '';
        const item = { spec, file: f, id, finding, impact: impact.trim() };
        // The entry's "Report:" line (MAINTENANCE "Keeping a report in step").
        const refresh = b.match(/^Report: refresh owed — (.*)$/m);
        const paused = b.match(/^Report: paused — (.*)$/m);
        if (refresh) { refreshes.push({ ...item, why: refresh[1] }); continue; }
        if (reported.has(`${spec}#${anchor}`)) continue;
        // No report by a ruling: the line, or a Reviewed "risk accepted".
        if (/^Report: none — /m.test(b) || /^> \*\*Reviewed[^\n]*risk accepted/m.test(b)) continue;
        // A finding another spec holds in full is reported there.
        if (/holds the full entry/.test(b)) continue;
        // Older reports name no entries: their pointer sits in the entry's footnotes.
        const fn = [...b.matchAll(/<sup>\[?([\w-]+)\]?/g)]
            .map(([, k]) => (text.match(new RegExp(`^\\*\\*${k}\\*\\*.*(?:\\n(?!<a id=|\\*\\*|#).*)*`, 'm')) || [''])[0])
            .join('\n');
        // A footnote naming a filed report whose "Tracked in" lacks the entry:
        // the three places disagree, a header-only fix.
        const filed = [...(b + fn).matchAll(/^Issue report: .*?(docs\/issues\/[\w.-]+\.md)/gm)]
            .map((x) => x[1]).find(exists);
        if (filed) { refreshes.push({ ...item, why: `${filed}: its "Tracked in" lacks the entry` }); continue; }
        const report = openReports.get(`${spec}#${anchor}`)
            || ((b + fn).match(/docs\/reports\/[\w.-]+\.md/g) || []).find(exists);
        const incidental = incidentals.find((r) => r[0].startsWith(spec)
            && new RegExp(`\\b${id}\\b`).test(r[2]) && /no longer shows|not reproduced|fixed/i.test(r[2]));
        if (paused) held.push({ ...item, why: `paused: ${paused[1]}` });
        else if (report) held.push({ ...item, why: `open report ${report}` });
        else if (incidental) held.push({ ...item, why: 'an incidentals row to retire it' });
        else owed.push(item);
    }
    const left = text.match(/^- \*\*Planned\*\*:\n((?: {2,}.*\n?)*)/m);
    if (left) {
        // A guard an issue report proposes asserts the fixed behavior, so it
        // waits while an entry it cites is still an open 🐞; the rest is
        // coverage a test can assert today.
        const open = new Set([...text.matchAll(/^\| \[([A-Z]{1,4}\d+)\]\(#[a-z0-9-]+\) \| .* \| 🐞 \|/gm)].map((x) => x[1]));
        const items = left[1].split(/^ {2}- /m).slice(1);
        const waits = (i) => /guard|issue report|docs\/issues\/|once fixed/i.test(i)
            && [...i.matchAll(/\b((?:A|OJS|OMP|OPS)\d+)\b/g)].some(([, id]) => open.has(id));
        const ready = items.filter((i) => !waits(i)).length;
        if (items.length) planned.push({ spec, file: f, n: ready, waiting: items.length - ready });
    }
}

// Reports owed: one spec at a time, the spec with the most severe entries first.
const rank = (i) => (/crash/.test(i.impact) ? 0 : 1) * 10
    + ['critical', 'high', 'user-visible', 'medium', 'minor', 'low', 'latent'].indexOf(i.impact.split(' ')[0]) + 1;
const bySpec = new Map();
for (const i of owed) bySpec.set(i.spec, [...(bySpec.get(i.spec) || []), i]);
const owedSpecs = [...bySpec.entries()]
    .map(([spec, items]) => ({ spec, items, key: Math.min(...items.map(rank)) * 100 - items.length }))
    .sort((a, b) => a.key - b.key);


const cap = (list) => (all ? list : list.slice(0, 5));
const more = (list) => (!all && list.length > 5 ? `  … ${list.length - 5} more (--all)\n` : '');
const day = new Date().getDate();
let out = `Today (day ${day}, ${day % 2 ? 'odd' : 'even'}): refreshes, then `
    + `${day % 2 ? 'incidentals and reports owed (2, 3)' : 'builds and Planned coverage (4, 5)'}, then friction.\n`;
const section = (title, count, body) => { out += `\n${title} (${count})\n${body}`; };

// A header fix needs no walk: a join, or a "Tracked in" that lacks the entry.
const header = (i) => /^joins |"Tracked in" lacks/.test(i.why);
refreshes.sort((a, b) => header(b) - header(a));
section('1. Report refreshes, every one', `${refreshes.filter(header).length} header fixes, `
    + `${refreshes.filter((i) => !header(i)).length} needing a walk`,
    cap(refreshes).map((i) => `  ${i.spec} ${i.id}${header(i) ? ' [header]' : ''}: ${i.why}\n`).join('') + more(refreshes));
section('2. Incidentals, oldest first', incidentals.length,
    cap(incidentals).map((r) => `  ${r[0]}: ${r[1].slice(0, 90)}\n`).join('') + more(incidentals));
section('3. Reports owed, one spec at a time', `${owed.length} entries in ${owedSpecs.length} specs`,
    cap(owedSpecs).map((s) => `  ${s.spec}: ${s.items.map((i) => `${i.id} [${i.impact}]`).join(', ')}\n`).join('')
    + more(owedSpecs)
    + (!held.length ? '' : all
        ? held.map((i) => `  held: ${i.spec} ${i.id}, ${i.why}\n`).join('')
        : `  held, skipped: ${held.length} (--all)\n`));
section('4. Builds and revisions', builds.length,
    builds.map((r) => `  ${r[0]} ${r[1]}\n`).join(''));
const ready = planned.filter((s) => s.n);
section('5. Planned coverage, one spec a revision',
    `${ready.reduce((n, s) => n + s.n, 0)} items ready in ${ready.length} specs; `
    + `${planned.reduce((n, s) => n + s.waiting, 0)} guards wait for their bug's fix`,
    cap(ready).map((s) => `  ${s.spec}: ${s.n}${s.waiting ? ` (+${s.waiting} waiting)` : ''}\n`).join('') + more(ready));
section('6. Friction rows to fold', friction.length, '');
process.stdout.write(out);
