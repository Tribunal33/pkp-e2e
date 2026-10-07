#!/usr/bin/env node
// report-models.mjs — which models wrote each report (REPORT.md "Model"): the
// reports under docs/issues/ and docs/reports/ are written by AI agents, and the
// team weighs a report by the model that wrote it (one partly served by a
// fallback model gets more checking). Read from the Claude Code transcripts on
// this machine, never by hand: an agent that created a report (Write, or a shell
// `cat >`/`tee` onto it) counts with every model that served it, since its walk
// and trace are the report; an agent that only edited it (a revision, a join, a
// filing link) counts with the models of those edits alone. The models found are
// merged into the report's `- **Model**` bullet, never dropping one it names,
// since transcripts expire (cleanupPeriodDays) and another machine's are not here.
// One exception: a report re-verified end to end (its dated update paragraph
// opens "Update <date>: re-verified end to end", REPORT.md "Model") counts only
// the work from that date, and the bullet is replaced, not merged (maintainer,
// 2026-10-07): the walk, trace and text are all from then on.
// run: npm run report-models [-- --write] [--projects <dir>]… [<report file>…]
//   no --write: prints each report's models and what --write would change
//   --projects: transcript folders to read (default: every ~/.claude/projects
//   folder whose name holds "pkp-e2e", all slots and the workstation's clones)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const projects = args.flatMap((a, i) => args[i - 1] === '--projects' ? [a] : []);
const only = args.filter((a, i) => a.endsWith('.md') && args[i - 1] !== '--projects').map((a) => path.basename(a));

const dirs = ['docs/issues', 'docs/reports'];
const reports = new Map(); // basename -> repo path
const since = new Map(); // basename -> date of the latest end-to-end re-verification
const REVERIFIED = /^Update (\d{4}-\d{2}-\d{2}):\s+re-verified\s+end\s+to\s+end/gm;
for (const d of dirs) for (const f of fs.readdirSync(path.join(root, d)))
    if (f.endsWith('.md') && (!only.length || only.includes(f))) {
        reports.set(f, `${d}/${f}`);
        const dates = [...fs.readFileSync(path.join(root, d, f), 'utf8').matchAll(REVERIFIED)].map((x) => x[1]).sort();
        if (dates.length) since.set(f, dates.at(-1));
    }

const base = path.join(os.homedir(), '.claude', 'projects');
const folders = projects.length ? projects
    : fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.includes('pkp-e2e')).map((d) => path.join(base, d)) : [];
const jsonls = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? jsonls(path.join(dir, e.name)) : e.name.endsWith('.jsonl') ? [path.join(dir, e.name)] : []);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// turns are [model, day] pairs, so a re-verified report can drop the ones before its date
const add = (into, from, name) => { for (const [m, day] of from) if (!since.has(name) || day >= since.get(name)) into.set(m, (into.get(m) || 0) + 1); };
const found = new Map(); // basename -> Map(model -> turns)

for (const file of folders.flatMap(jsonls)) {
    const models = []; const created = new Set(); const edits = new Map();
    const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
        if (!line.includes('"type":"assistant"')) continue;
        let row; try { row = JSON.parse(line); } catch { continue; }
        const m = row.message?.model;
        if (row.type !== 'assistant' || !m || m === '<synthetic>') continue;
        const day = (row.timestamp || '').slice(0, 10);
        models.push([m, day]);
        for (const c of Array.isArray(row.message.content) ? row.message.content : []) {
            if (c?.type !== 'tool_use') continue;
            const touch = (name, whole) => {
                if (whole) created.add(name);
                else { const e = edits.get(name) || []; e.push([m, day]); edits.set(name, e); }
            };
            if (['Write', 'Edit', 'MultiEdit'].includes(c.name)) {
                const name = path.basename(c.input?.file_path || '');
                if (reports.has(name)) touch(name, c.name === 'Write');
            } else if (c.name === 'Bash') {
                const cmd = c.input?.command || '';
                for (const name of reports.keys()) {
                    if (!cmd.includes(name)) continue;
                    const n = esc(name);
                    if (new RegExp(`(^|[^>2])>\\s*["']?\\S*${n}|\\btee\\s+["']?\\S*${n}`).test(cmd)) touch(name, true);
                    else if (new RegExp(`(>>\\s*\\S*${n}|\\b(cp|mv)\\b[^\\n;|&]*${n}|\\b(sed|perl)\\s+-p?i[^\\n;|&]*${n})`).test(cmd)) touch(name, false);
                }
            }
        }
    }
    for (const name of created) { const f = found.get(name) || new Map(); add(f, models, name); found.set(name, f); }
    for (const [name, e] of edits) if (!created.has(name)) { const f = found.get(name) || new Map(); add(f, e, name); found.set(name, f); }
}

// `- **Model** claude-opus-5-5[, parts on claude-opus-4-8[, …]]`: the model that
// served most of the work first. A report outside REPORT.md's bullet header (an
// older regression report, a research write-up) carries it as a `Model:` line
// under its title.
const BULLET = /^- \*\*Model\*\* (.*)$/m;
const LINE = /^Model: (.*?)\.?$/m;
const parse = (v) => v === 'not recorded' ? [] : v.split(/, parts on |, /).map((s) => s.trim()).filter(Boolean);
const render = (ms) => ms.length ? ms[0] + (ms.length > 1 ? `, parts on ${ms.slice(1).join(', ')}` : '') : 'not recorded';

let changed = 0, unknown = 0;
for (const [name, rel] of [...reports].sort()) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const bulletHeader = /^- \*\*Checked\*\*/m.test(text);
    const had = text.match(BULLET)?.[1] ?? text.match(LINE)?.[1];
    const old = had ? parse(had) : [];
    const turns = [...(found.get(name) || new Map())].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    // A re-verified report found here takes the counted models alone; otherwise keep the bullet's
    // models, in order, and append the new ones.
    const ms = since.has(name) && turns.length ? turns : old.length ? [...old, ...turns.filter((m) => !old.includes(m))] : turns;
    const value = render(ms);
    if (!ms.length) unknown++;
    const shown = found.has(name) ? [...found.get(name)].map(([m, n]) => `${m} ×${n}`).join(', ') : 'no transcript here';
    if (had !== undefined && had === value) { if (!write) console.log(`same     ${rel}: ${value} (${shown})`); continue; }
    if (!ms.length && had === undefined && !write) { console.log(`unknown  ${rel}: no transcript on this machine wrote it`); continue; }
    if (!ms.length) continue; // nothing to add; "not recorded" is written by hand, once nobody's transcripts remain
    changed++;
    console.log(`${write ? 'wrote' : 'would'}    ${rel}: ${had === undefined ? '' : `${had} → `}${value} (${shown})`);
    if (!write) continue;
    let next;
    if (had !== undefined) next = text.replace(BULLET.test(text) ? BULLET : LINE, (l) => l.startsWith('- ') ? `- **Model** ${value}` : `Model: ${value}.`);
    else if (bulletHeader) next = text.replace(/^(- \*\*Checked\*\*.*(?:\n  .*)*)$/m, `$1\n- **Model** ${value}`);
    else next = text.replace(/^(# .*\n)/, `$1\nModel: ${value}.\n`);
    fs.writeFileSync(path.join(root, rel), next);
}
console.log(`${reports.size} reports, ${folders.length} transcript folders: ${changed} ${write ? 'updated' : 'to update'}, ${unknown} with no model found here`);
