#!/usr/bin/env node
// check-models.mjs — the RUNBOOK step 10 model gate: did every agent of this
// Claude Code session run on the session's own model, with no safety-classifier
// stop? The one allowed exception is the security verification probe
// (RUNBOOK "Model discipline"): it may be stopped, or finished on another model,
// without holding up the feature. Prints one line per agent that is off-model or
// was stopped, then a verdict; exit 1 means do not commit, pause for the maintainer.
// run: node bin/check-models.mjs [--session <id or session.jsonl>] [--stops-warn]
// --stops-warn (reports, MAINTENANCE "Issue reports"): nothing blocks. A
// classifier stop is reported; work served on another model is noted, since the
// report it wrote names that model in its Model bullet (npm run report-models).
// (default: $CLAUDE_CODE_SESSION_ID, the session running the command)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const stopsWarn = args.includes('--stops-warn');
const given = args.includes('--session') ? args[args.indexOf('--session') + 1] : process.env.CLAUDE_CODE_SESSION_ID;
const projectDir = path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^A-Za-z0-9]/g, '-'));
const file = given?.endsWith('.jsonl') ? given : given && path.join(projectDir, `${given}.jsonl`);
if (!file || !fs.existsSync(file)) {
    console.error(`check-models: no session transcript found (${file || 'no --session and no CLAUDE_CODE_SESSION_ID'}); the gate cannot pass unchecked`);
    process.exit(2);
}

// The harness's own notice after a stop is a meta user row; quotes of it elsewhere
// (tool output, a relayed report) are not stops.
const STOP = 'Your response above was stopped by a safety classifier';
// Known by its dispatch description alone: every brief pastes the Frame, which
// names security-verify.md, so the prompt cannot tell the probe apart.
const SECURITY = /security\b.*verif/i;

function scan(jsonl) {
    const models = new Map();
    let stops = 0;
    for (const line of fs.readFileSync(jsonl, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        let row; try { row = JSON.parse(line); } catch { continue; }
        const content = row.message?.content;
        const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
        if (row.type === 'user' && row.isMeta && text.replace(/^[\["{\s]*(type":"text","text":")?/, '').startsWith(STOP)) stops++;
        const m = row.message?.model;
        if (row.type === 'assistant' && m && m !== '<synthetic>') models.set(m, (models.get(m) || 0) + 1);
    }
    return { models, stops };
}

const main = scan(file);
const sessionModel = [...main.models].sort((a, b) => b[1] - a[1])[0]?.[0];
const agents = [{ name: 'orchestrator', security: false, ...main }];
const dir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')) : []) {
    const metaFile = path.join(dir, f.replace(/\.jsonl$/, '.meta.json'));
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const s = scan(path.join(dir, f));
    agents.push({ name: meta.description || f, security: SECURITY.test(meta.description || ''), ...s });
}

let blocked = 0;
for (const a of agents) {
    const other = [...a.models].filter(([m]) => m !== sessionModel);
    if (!other.length && !a.stops) continue;
    const what = [a.stops && `${a.stops} classifier stop(s)`, other.length && `served ${other.map(([m, n]) => `${m} ×${n}`).join(', ')}`].filter(Boolean).join('; ');
    if (a.security) console.log(`allowed  ${a.name}: ${what} (security probe: its verified-by line names the model that finished it, or the entry stays unverified)`);
    else if (stopsWarn && !other.length) console.log(`warning  ${a.name}: ${what}, stayed on ${sessionModel}`);
    else if (stopsWarn) console.log(`noted    ${a.name}: ${what} (its report's Model bullet names it: npm run report-models -- --write)`);
    else { blocked++; console.log(`BLOCKED  ${a.name}: ${what}`); }
}
console.log(`${agents.length} agents on ${sessionModel}: ${blocked ? `${blocked} blocked, do not commit; pause for the maintainer (RUNBOOK "Model discipline")` : 'gate passes'}`);
process.exit(blocked ? 1 : 0);
