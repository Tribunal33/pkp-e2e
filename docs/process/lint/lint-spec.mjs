#!/usr/bin/env node
// lint-spec.mjs — the campaign's mechanical spec gate (TEMPLATE "The lint gate").
// run:      node lint/lint-spec.mjs [specs/foo.md ...]     default: every specs/*.md
// self-test: node lint/lint-spec.mjs --self-test           embedded good/bad fixtures, no deps
// claims:   node lint/lint-spec.mjs --claims specs/foo.md [--date YYYY-MM-DD]
//           a report for the claim check (every claim line, risky kinds marked), never a gate
// tests:    node lint/lint-spec.mjs --tests [specs/foo.md ...]   default: every spec
//           every canonical scenario against the three suites' S<n> test titles (RUNBOOK rule 3)
// REFERENCE INTEGRITY ONLY (maintainer, 2026-07-31 — wording, vocabulary and the leak rule
// are the writer's judgment, never linted): campaign identifiers a reader cannot resolve
// (TEMPLATE rule 5) · register anatomy · link/anchor/footnote resolution.
// Checks: campaign · shape · coverage · register · links; --tests: scenarios vs suites. Findings print "file:line — check — excerpt"; exit 1.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = path.resolve(SCRIPT_DIR, '../../specs');
const BADGES = ['🐞', '❓', '✅'];
const BADGE_ORDER = { '🐞': 0, '❓': 1, '✅': 2 };
// The app failing behind a finding: "· crash: server" after the impact word (GLOSSARY "Findings register").
const CRASH_WORDS = ['server', 'script', 'both'];
const crashWord = (line) => { const m = line.match(/crash:\s*([a-z]+)/i); return m ? m[1].toLowerCase() : null; };

// ---------------------------------------------------------------- document model

// A spec is: frontmatter · BODY (product language) · "## Footnotes" tail + Reference sections.
// Fenced blocks and HTML comments are template guidance / raw skeleton: skipped by prose checks.
function parseDoc(file) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const skip = new Array(lines.length).fill(false);
    const h2 = new Array(lines.length).fill('');
    const h3 = new Array(lines.length).fill('');
    let inFront = lines[0]?.trim() === '---', inFence = false, inComment = false;
    let curH2 = '', curH3 = '';
    const front = {};
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (inFront) {
            skip[i] = true;
            if (i > 0 && l.trim() === '---') inFront = false;
            else { const m = l.match(/^([a-z-]+):\s*(.*)$/); if (m) front[m[1]] = m[2].trim(); }
        } else if (inFence) { skip[i] = true; if (/^\s*```/.test(l)) inFence = false; }
        else if (/^\s*```/.test(l)) { skip[i] = true; inFence = true; }
        else if (inComment) { skip[i] = true; if (l.includes('-->')) inComment = false; }
        else if (l.includes('<!--')) { skip[i] = true; if (!l.includes('-->')) inComment = true; }
        else if (/^##\s+/.test(l)) { curH2 = l.replace(/^##\s+/, '').trim(); curH3 = ''; }
        else if (/^###\s+/.test(l)) { curH3 = l.replace(/^###\s+/, '').trim(); }
        h2[i] = curH2; h3[i] = curH3;
    }
    const findIdx = (re) => lines.findIndex((l, i) => !skip[i] && re.test(l));
    const tailStart = (() => { const i = findIdx(/^##\s+Footnotes/); return i === -1 ? lines.length : i; })();
    const registerStart = (() => { const i = findIdx(/^##\s+Findings register/); return i === -1 ? tailStart : i; })();
    return { file, lines, skip, h2, h3, front, tailStart, registerStart, title: lines[findIdx(/^#\s+/)] || '' };
}

const excerpt = (s, n = 110) => { const t = String(s).trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n) + '…' : t; };

// <sup> marks: linked form <sup>[a](#fn-a)</sup> or bare <sup>a</sup> → block #fn-a
const supMarks = (line) => [...line.matchAll(/<sup>(.*?)<\/sup>/g)].map((m) => {
    const link = m[1].match(/\]\(#([\w-]+)\)/);
    return { raw: m[1], id: link ? link[1] : 'fn-' + m[1].trim() };
});

// (The leak rule and the glossary/vocabulary checks were removed 2026-07-31 — TEMPLATE rule 1
// and rule 7 bind by the writer's judgment; the gate keeps only reference integrity.)

// ------------------------------------------------- 1. campaign identifiers (TEMPLATE rule 5)
// FEATURE-MAP row codes (U26) and atlas atom IDs (AFFW-323) are the campaign's own bookkeeping.
// A PO or QA reader cannot resolve them, so they never appear in the readable body: a
// cross-feature pointer NAMES the feature ("see *Stage participants*") and links once that
// spec exists. Atom IDs stay legal in the Reference tables and the footnote tail, which this
// check skips along with the leak rule.
const CAMPAIGN_PATTERNS = [
    { re: /(?<![\w-])U\d{1,2}(?![\w-])/g, what: 'FEATURE-MAP row code' },
    { re: /\b(?:AFF[A-Z]{1,2}|GRID|VUE|API|ROUTE|MAIL|NOTIF|JOB|SET|CLI|PLUG)-\d+\b/g, what: 'atlas atom ID' },
];

function checkCampaign(doc, out) {
    for (let i = 0; i < doc.tailStart; i++) {
        if (doc.skip[i] || /^(Reference|Footnotes)/.test(doc.h2[i])) continue;
        const seen = new Set();
        for (const p of CAMPAIGN_PATTERNS) {
            p.re.lastIndex = 0;
            let m;
            while ((m = p.re.exec(doc.lines[i]))) {
                if (seen.has(m[0])) continue;
                seen.add(m[0]);
                out.push({ line: i + 1, check: 'campaign', msg: `${p.what} in body: ${m[0]} — name the feature instead` });
            }
        }
    }
}

// ------------------------------------------------- 1b. shape: the Conventions line is a pointer
// The reader has read GLOSSARY.md ("Reading a spec"), so the title block's Conventions line is the
// one-line pointer there, never a legend of its own (TEMPLATE title block).
const CONVENTIONS_LINE = '> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).';

function checkShape(doc, out) {
    for (let i = 0; i < doc.tailStart; i++) {
        const line = doc.lines[i];
        if (/^>\s*Conventions/.test(line) && line.trim() !== CONVENTIONS_LINE) {
            out.push({ line: i + 1, check: 'shape', msg: 'the Conventions line is the one-line GLOSSARY pointer, verbatim (TEMPLATE title block)' });
        }
    }
}

// ---------------------------------------------------------------- 1b. coverage (TEMPLATE "Coverage")
// Only specs that carry the section are checked (shipped specs before 2026-09-06 have the settings
// table alone under "Settings that modify behavior"). Two shapes, told apart by the table header.
// DRAFT table (| Who, state or setting | Class | Runs in | Why not |): every row carries a class and a
// "Runs in" or a "Why not". FINAL shape (the "Left out" bullets alone; the scenarios carry what is
// checked): every bullet opens with a reason word and ends at the colon, the items indented under it
// one per line, the Budget bullet cuts states or variants only. A
// verified spec carries the final shape and no `planned`; no date sits in the section; no scenario
// leaves a typed value to the tester.
const PLACEHOLDER_RE = /\btype (?:a|an|some|any) (?:sentence|title|line|word|text|name|description|number|value)\b/i;
const CLASSES = ['main', 'guard', 'state', 'variant'];
const REASONS = ['Planned', 'Budget', 'Nothing new to test', 'Register carries it', 'No seed', 'Owned by another feature'];

function checkCoverage(doc, out) {
    const covLine = doc.lines.findIndex((l, i) => !doc.skip[i] && /^##\s+Coverage\s*$/.test(l));
    if (covLine === -1) return;
    const cov = (line, msg) => out.push({ line, check: 'coverage', msg });
    let shape = null;
    for (let i = 0; i < doc.tailStart; i++) {
        if (doc.skip[i]) continue;
        const line = doc.lines[i];
        if (/^Coverage$/.test(doc.h2[i])) {
            if (/^\|/.test(line)) {
                const cells = line.split('|').slice(1, -1).map((c) => c.trim());
                if (cells.every((c) => /^-*$/.test(c))) continue;
                if (/^(Who, state or setting|Who|State|Setting)$/.test(cells[0])) {
                    shape = 'draft';
                    if (cells[1] !== 'Class') cov(i + 1, 'the draft table is "| Who, state or setting | Class | Runs in | Why not |" (TEMPLATE "Coverage")');
                    continue;
                }
                if (shape !== 'draft') { cov(i + 1, 'the final Coverage section holds the "Left out" bullets only; the scenarios carry what is checked (TEMPLATE "Coverage")'); continue; }
                const [what, cls, runs, why] = cells;
                if (cells.length < 4) { cov(i + 1, `row "${excerpt(what, 50)}" has no Class column`); continue; }
                if (!CLASSES.includes(cls)) cov(i + 1, `row "${excerpt(what, 50)}" has no class (${CLASSES.join(' / ')})`);
                if (!runs && !why) cov(i + 1, `row "${excerpt(what, 50)}" has neither a "Runs in" nor a "Why not"`);
                if (doc.front.status === 'verified' && /^planned$/i.test(runs)) cov(i + 1, `row "${excerpt(what, 50)}" still reads planned in a verified spec`);
            } else if (/^-\s+\*\*/.test(line)) {
                shape = shape || 'final';
                const word = ((line.match(/^-\s+\*\*([^*]+)\*\*/) || [])[1] || '').trim();
                if (!REASONS.includes(word)) cov(i + 1, `a "Left out" bullet opens with "${excerpt(word, 30)}"; the reason words are ${REASONS.join(' · ')}`);
                else {
                    if (word === 'Budget') {
                        if (!/^-\s+\*\*Budget\*\*\s+—\s+(states|variants):/i.test(line)) cov(i + 1, 'the Budget bullet opens "**Budget** — states:" or "**Budget** — variants:"');
                        if (/\b(main|guards?)\s*:/i.test(line)) cov(i + 1, 'a main or guard row is never cut for budget (TEMPLATE "Coverage")');
                    }
                    if (/:\s*\S/.test(line.replace(/^-\s+\*\*[^*]+\*\*(\s+—\s+\w+)?/, ''))) cov(i + 1, 'a "Left out" bullet ends at the colon; its items are indented bullets under it, one per line (TEMPLATE "Coverage")');
                }
            } else if (shape === 'final' && doc.front.status === 'verified' && /\bplanned\b/.test(line)) cov(i + 1, 'still reads planned in a verified spec');
            if (/\b20\d\d-\d\d-\d\d\b/.test(line)) cov(i + 1, 'a date in the Coverage section is evidence; it belongs in a footnote');
            if (/\bout of tier\b/i.test(line)) cov(i + 1, '"out of tier" is campaign vocabulary; the reason word is Budget');
        }
        if (/^Canonical scenarios/.test(doc.h2[i]) && PLACEHOLDER_RE.test(line)) {
            cov(i + 1, `the tester is left to choose a value: ${excerpt(line.match(PLACEHOLDER_RE)[0], 40)} — name it`);
        }
    }
    if (shape === 'draft' && doc.front.status === 'verified') cov(covLine + 1, 'a verified spec carries the draft Coverage table; the scenario writer turns it into the "Left out" list (TEMPLATE "Coverage")');
}

// ---------------------------------------------------------------- 2. findings-register integrity

const MARKER_RE = /(⚠\s*)?\[([A-Z]{1,3}\d+)\]\(#([a-z]{1,3}\d+)\)/g;

function checkRegister(doc, out) {
    if (doc.registerStart >= doc.tailStart) { out.push({ line: 1, check: 'register', msg: 'no "## Findings register" section' }); return; }
    const entries = [], summary = [];
    for (let i = doc.registerStart; i < doc.tailStart; i++) {
        if (doc.skip[i]) continue;
        const line = doc.lines[i];
        const anchor = line.match(/^<a id="([a-z]{1,3}\d+)"><\/a>\s*$/);
        if (anchor) {
            const head = doc.lines[i + 1] || '';
            const hm = head.match(/^\*\*([A-Z]{1,3}\d+)\s*[—-]/);
            const badge = BADGES.find((b) => head.includes(b)) || null;
            if (!hm) { out.push({ line: i + 2, check: 'register', msg: `entry #${anchor[1]} has no "**ID — title**" opening line` }); continue; }
            if (!badge) out.push({ line: i + 2, check: 'register', msg: `entry ${hm[1]} has no badge (🐞/❓/✅)` });
            if (hm[1].toLowerCase() !== anchor[1]) out.push({ line: i + 2, check: 'register', msg: `entry ${hm[1]} does not match its anchor #${anchor[1]}` });
            const crash = crashWord(head);
            if (crash && !CRASH_WORDS.includes(crash))
                out.push({ line: i + 2, check: 'register', msg: `entry ${hm[1]} crash word "${crash}" is not one of ${CRASH_WORDS.join(' / ')}` });
            entries.push({ id: hm[1], anchor: anchor[1], badge, crash, line: i + 2, group: doc.h3[i] || '' });
            continue;
        }
        const row = line.match(/^\|\s*\[([A-Z]{1,3}\d+)\]\(#([a-z]{1,3}\d+)\)\s*\|/);
        if (row) summary.push({ id: row[1], badge: BADGES.find((b) => line.includes(b)) || null, crash: crashWord(line), line: i + 1 });
    }
    // summary table ↔ entries, 1:1 on ID and badge, sorted 🐞 → ❓ → ✅
    for (const s of summary) {
        const e = entries.find((x) => x.id === s.id);
        if (!e) out.push({ line: s.line, check: 'register', msg: `summary row ${s.id} has no entry` });
        else if (e.badge && s.badge !== e.badge) out.push({ line: s.line, check: 'register', msg: `summary row ${s.id} badge ${s.badge || '(none)'} ≠ entry badge ${e.badge}` });
        else if ((e.crash || s.crash) && e.crash !== s.crash) out.push({ line: s.line, check: 'register', msg: `summary row ${s.id} crash word ${s.crash || '(none)'} ≠ entry crash word ${e.crash || '(none)'}` });
    }
    for (const e of entries) if (!summary.some((s) => s.id === e.id))
        out.push({ line: e.line, check: 'register', msg: `entry ${e.id} is missing from the summary table` });
    for (let i = 1; i < summary.length; i++) {
        const [a, b] = [summary[i - 1], summary[i]];
        if (a.badge && b.badge && BADGE_ORDER[b.badge] < BADGE_ORDER[a.badge])
            out.push({ line: b.line, check: 'register', msg: `summary out of order: ${b.badge} ${b.id} after ${a.badge} ${a.id} (sort 🐞 → ❓ → ✅)` });
    }
    // IDs dense per section: A1..An / OMP1.. / OPS1.., no gaps. A "### Retired" entry keeps its
    // number but sits at the end of the register (TEMPLATE), so density is checked on the sorted
    // numbers and document order only among the live entries.
    const groups = {};
    for (const e of entries) (groups[e.id.replace(/\d+$/, '')] ||= []).push(e);
    const num = (e, prefix) => Number(e.id.slice(prefix.length));
    for (const [prefix, list] of Object.entries(groups)) {
        [...list].sort((a, b) => num(a, prefix) - num(b, prefix)).forEach((e, n) => {
            if (num(e, prefix) !== n + 1)
                out.push({ line: e.line, check: 'register', msg: `${prefix} IDs must be dense — expected ${prefix}${n + 1}, found ${e.id}` });
        });
        const live = list.filter((e) => !/^retired/i.test(e.group));
        for (let i = 1; i < live.length; i++)
            if (num(live[i], prefix) < num(live[i - 1], prefix))
                out.push({ line: live[i].line, check: 'register', msg: `${prefix} IDs must be in order — ${live[i].id} after ${live[i - 1].id}` });
    }
    // markers ↔ entries, both ways. A 🐞/❓ entry is ⚠-marked at its home; repeat mentions are bare
    // markers (TEMPLATE "Rules & state"), so ⚠ is required once per entry, not on every occurrence.
    const marked = new Set(), warned = new Set();
    for (let i = 0; i < doc.registerStart; i++) {
        if (doc.skip[i]) continue;
        for (const m of doc.lines[i].matchAll(MARKER_RE)) {
            const [, adjacent, id, target] = m;
            if (id.toLowerCase() !== target) { out.push({ line: i + 1, check: 'register', msg: `marker [${id}] points at #${target}` }); continue; }
            const e = entries.find((x) => x.anchor === target);
            if (!e) { out.push({ line: i + 1, check: 'register', msg: `marker [${id}] has no register entry` }); continue; }
            marked.add(e.id);
            // the ⚠ may sit anywhere earlier in the sentence, including the wrapped previous line
            const before = doc.lines[i].slice(0, m.index);
            if (adjacent || before.includes('⚠') || /⚠\s*$/.test(doc.lines[i - 1] || '')) warned.add(e.id);
            if (e.badge === '✅' && adjacent) out.push({ line: i + 1, check: 'register', msg: `marker [${id}] is ⚠ but the entry is an intended divergence (✅ takes a plain link)` });
        }
    }
    for (const e of entries) {
        if (/^retired/i.test(e.group)) continue; // TEMPLATE: a retired entry is one line, no body marker needed
        if (!marked.has(e.id)) out.push({ line: e.line, check: 'register', msg: `entry ${e.id} is never marked in the body` });
        else if (e.badge && e.badge !== '✅' && !warned.has(e.id))
            out.push({ line: e.line, check: 'register', msg: `entry ${e.id} (${e.badge}) has no ⚠ marker in the body — the home mention carries ⚠` });
    }
}

// ---------------------------------------------------------------- 3. link & footnote resolution

const anchorCache = new Map();
function anchorsOf(file) {
    if (anchorCache.has(file)) return anchorCache.get(file);
    let set = new Set();
    if (fs.existsSync(file)) {
        const txt = fs.readFileSync(file, 'utf8');
        for (const m of txt.matchAll(/<a id="([^"]+)"><\/a>/g)) set.add(m[1]);
        for (const m of txt.matchAll(/^#{1,6}\s+(.+)$/gm)) set.add(slug(m[1]));
    }
    anchorCache.set(file, set);
    return set;
}
const slug = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

function checkLinks(doc, out) {
    const usedFootnotes = new Set();
    const own = new Set(), dupes = new Set();
    for (let i = 0; i < doc.lines.length; i++) {
        if (doc.skip[i]) continue;
        for (const m of doc.lines[i].matchAll(/<a id="([^"]+)"><\/a>/g)) {
            if (own.has(m[1]) && !dupes.has(m[1])) { dupes.add(m[1]); out.push({ line: i + 1, check: 'links', msg: `duplicate anchor id "${m[1]}"` }); }
            own.add(m[1]);
        }
    }
    const localAnchors = anchorsOf(doc.file);
    for (let i = 0; i < doc.lines.length; i++) {
        if (doc.skip[i]) continue;
        for (const m of doc.lines[i].matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
            const target = m[1];
            if (/^(https?:|mailto:|#!)/.test(target)) continue;
            const [filePart, anchorPart] = target.split('#');
            let resolved = doc.file, exists = true;
            if (filePart) {
                resolved = path.resolve(path.dirname(doc.file), filePart);
                exists = fs.existsSync(resolved);
                if (!exists) out.push({ line: i + 1, check: 'links', msg: `link target missing: ${target}` });
            }
            if (exists && anchorPart && !anchorsOf(resolved).has(anchorPart))
                out.push({ line: i + 1, check: 'links', msg: `anchor does not resolve: ${target}` });
        }
        for (const { raw, id } of supMarks(doc.lines[i])) {
            if (!localAnchors.has(id)) out.push({ line: i + 1, check: 'links', msg: `footnote mark <sup>${excerpt(raw, 20)}</sup> has no block #${id}` });
            else usedFootnotes.add(id);
        }
    }
    // every footnote block in the tail is reached by at least one mark
    for (let i = doc.tailStart; i < doc.lines.length; i++) {
        if (doc.skip[i]) continue;
        for (const m of doc.lines[i].matchAll(/<a id="(fn-[^"]+)"><\/a>/g))
            if (!usedFootnotes.has(m[1])) out.push({ line: i + 1, check: 'links', msg: `footnote block #${m[1]} has no mark in the body` });
    }
}

// ---------------------------------------------------------------- 4. claims report (--claims)
// A report for the claim check (RUNBOOK step 5), never a gate: every claim-bearing line of the
// body is listed, the risky kinds first (to-drive · no-mark · undated · no-screen · role-gated ·
// exclusive · string), then the rest with their footnote's probe date, so the checklist is the
// whole spec. A to-drive line is one whose footnote opens "to drive:" — the author's open question
// (RUNBOOK step 3); the Purpose section is listed because its absence paragraph states screen facts.

const CLAIM_SECTIONS = /^(Purpose|Actors & permissions|Fields & validation|Rules & state|Side effects|Settings|Cross-feature interactions|Canonical scenarios|Findings register)/;
const ROLE_NAMES = ['Site Administrator', 'Journal Manager', 'Press Manager', 'Server Manager', 'Journal Editor', 'Press Editor',
    'Editor', 'Section Editor', 'Series Editor', 'Moderator', 'Guest Editor', 'Reviewer', 'Internal Reviewer', 'Author', 'Reader',
    'Copyeditor', 'Layout Editor', 'Proofreader', 'Funding [Cc]oordinator', 'Assistant', 'Editorial Board Member', 'Subscription Manager'];
const ROLE_RE = new RegExp(`\\b(?:${ROLE_NAMES.join('|')})\\b|\\bpermission level\\b`); // role names as capitalised on screen
const EXCLUSIVE_RE = /\b(?:only|never|no one|nothing else|not offered|absent|whoever|whatever|alike|cannot|no screen|all|every|each|any|always)\b/i;
const NO_SCREEN_RE = /no screen|read from the code|not observable|code reading|cannot be seen/i;
const PROBE_DATE_RE = /live-probed\s+(\d{4}-\d{2}-\d{2})/gi;
const TO_DRIVE_RE = /\bto drive:\s*(.*)/i;
const KIND_ORDER = ['to-drive', 'no-mark', 'undated', 'no-screen', 'role-gated', 'exclusive', 'string'];
const kindLabel = (x) => `${x.kind}${x.detail ? ' ' + x.detail : ''}`;
const normWs = (s) => s.replace(/\s+/g, ' ').trim();

// footnote blocks of the tail: #fn-x → its joined text and newest "live-probed YYYY-MM-DD" date
function footnoteBlocks(doc) {
    const blocks = new Map();
    let cur = null;
    for (let i = doc.tailStart; i < doc.lines.length; i++) {
        const l = doc.lines[i];
        const a = l.match(/<a id="(fn-[^"]+)"><\/a>/);
        if (a) { cur = { id: a[1], line: i + 1, lines: [] }; blocks.set(a[1], cur); continue; }
        if (/^##\s+/.test(l)) { cur = null; continue; }
        if (cur) cur.lines.push(l);
    }
    for (const b of blocks.values()) {
        b.text = normWs(b.lines.join(' '));
        b.date = [...b.text.matchAll(PROBE_DATE_RE)].map((m) => m[1]).sort().pop() || null;
    }
    return blocks;
}

// Claim-bearing lines, grouped into items (a bullet, a numbered rule, a table row, a paragraph or
// a register entry) so a wrapped item's closing mark covers its earlier lines and a sub-bullet
// inherits its parent's. Skipped: headings, blank lines, anchors, table header/separator rows, the
// register's preamble and summary table, and lines that carry marks only.
function claimItems(doc) {
    const items = [];
    let cur = null, inEntry = false, sectionItems = [];
    const isSep = (l) => /^\|[\s:|-]+\|?\s*$/.test(l);
    for (let i = 0; i < doc.tailStart; i++) {
        const l = doc.lines[i];
        if (doc.skip[i] || !CLAIM_SECTIONS.test(doc.h2[i])) { cur = null; continue; }
        if (/^#{1,6}\s/.test(l)) { cur = null; inEntry = false; sectionItems = []; continue; }
        if (!l.trim() || /^---\s*$/.test(l) || /^\*[^*]+:\*\s*$/.test(l)) { cur = null; inEntry = false; continue; } // blank, rule, *"Profile" section:*
        if (/^<a id="[^"]+"><\/a>\s*$/.test(l)) { cur = null; inEntry = true; continue; }
        if (/^Findings register/.test(doc.h2[i]) && !inEntry) continue;
        if (/^\|/.test(l)) {
            if (isSep(l) || isSep(doc.lines[i + 1] || '')) { cur = null; continue; }
            cur = { indent: 0, parent: null, lines: [] }; items.push(cur); sectionItems.push(cur);
        } else {
            const b = l.match(/^(\s*)(?:[-*•]|\d+\.)\s+/);
            if (b || !cur) {
                const indent = b ? b[1].length : 0;
                const parent = b ? [...sectionItems].reverse().find((it) => it.indent < indent) || null : null;
                cur = { indent, parent, lines: [] }; items.push(cur); sectionItems.push(cur);
            }
        }
        cur.lines.push(i);
    }
    for (const it of items) {
        it.own = new Set(it.lines.flatMap((i) => supMarks(doc.lines[i]).map((m) => m.id)));
        it.text = normWs(it.lines.map((i) => doc.lines[i]).join(' '));
    }
    return items;
}

const marksOf = (line, item) => {
    const own = supMarks(line).map((m) => m.id);
    if (own.length) return own;
    for (let it = item; it; it = it.parent) if (it.own.size) return [...it.own];
    return [];
};

// → { date, lines: [{ line, text, kinds: [{kind, detail}], marks, dates }] }, date = --date or the newest probe date
function claimsOf(file, dateArg = null) {
    const doc = parseDoc(file);
    const blocks = footnoteBlocks(doc);
    const date = dateArg || [...blocks.values()].map((b) => b.date).filter(Boolean).sort().pop() || null;
    const tail = normWs(doc.lines.slice(doc.tailStart).join(' '));
    const result = [];
    for (const item of claimItems(doc)) {
        // quoted runs of ≥3 words, taken from the whole item so a string wrapped over two lines still counts
        const strings = [];
        const joined = item.lines.map((i) => doc.lines[i]).join('\n');
        for (const m of joined.matchAll(/"([^"]+)"/g)) {
            const s = normWs(m[1]);
            if (s.split(' ').length >= 3 && !tail.includes(s)) strings.push({ s, line: item.lines[joined.slice(0, m.index).split('\n').length - 1] });
        }
        for (const i of item.lines) {
            const line = doc.lines[i];
            const prose = line.replace(/<sup>.*?<\/sup>/g, '').replace(MARKER_RE, '').replace(/[\s⚠.,;:()—-]+/g, '');
            if (!prose) continue;
            const marks = marksOf(line, item);
            const kinds = [];
            for (const id of marks) { const q = (blocks.get(id)?.text || '').match(TO_DRIVE_RE); if (q) { kinds.push({ kind: 'to-drive', detail: `"${excerpt(q[1], 60)}"` }); break; } }
            if (!marks.length) kinds.push({ kind: 'no-mark', detail: '' });
            const undated = marks.filter((id) => { const b = blocks.get(id); return !b || !b.date || (date && b.date < date); });
            if (undated.length) kinds.push({ kind: 'undated', detail: undated.join(' ') });
            if (NO_SCREEN_RE.test(line)) kinds.push({ kind: 'no-screen', detail: '' });
            else { const via = marks.find((id) => NO_SCREEN_RE.test(blocks.get(id)?.text || '')); if (via) kinds.push({ kind: 'no-screen', detail: `(${via})` }); }
            if (ROLE_RE.test(line)) kinds.push({ kind: 'role-gated', detail: '' });
            if (EXCLUSIVE_RE.test(line)) kinds.push({ kind: 'exclusive', detail: '' });
            for (const st of strings) if (st.line === i) kinds.push({ kind: 'string', detail: `"${excerpt(st.s, 40)}"` });
            result.push({ line: i + 1, text: line, kinds, marks, dates: marks.map((id) => `${id.replace(/^fn-/, '')} ${blocks.get(id)?.date || '—'}`) });
        }
    }
    return { date, lines: result };
}

function printClaims(file, dateArg) {
    const { date, lines } = claimsOf(file, dateArg);
    const r = path.relative(process.cwd(), file);
    const rel = !r || r.startsWith('..') ? file : r;
    console.log(`claims — ${rel} — reference date ${date || 'none'}${dateArg ? ' (--date)' : ' (newest live-probed date in the footnotes)'}`);
    const counts = Object.fromEntries(KIND_ORDER.map((k) => [k, 0]));
    let viaFootnote = 0;
    const marked = lines.filter((l) => l.kinds.length);
    for (const l of marked) {
        const kinds = KIND_ORDER.flatMap((k) => l.kinds.filter((x) => x.kind === k));
        for (const x of kinds) if (x.kind === 'no-screen' && x.detail) viaFootnote++; else counts[x.kind]++;
        console.log(`${rel}:${l.line} — ${kinds.map(kindLabel).join(', ')} — ${excerpt(l.text, 80)}`);
    }
    console.log(`\ndated — the remaining ${lines.length - marked.length} claim line(s), with their footnote's probe date`);
    for (const l of lines) if (!l.kinds.length) console.log(`${rel}:${l.line} — dated ${l.dates.join(', ')} — ${excerpt(l.text, 80)}`);
    const tally = KIND_ORDER.map((k) => `${k} ${counts[k]}${k === 'no-screen' && viaFootnote ? ` (+${viaFootnote} via a footnote that says so)` : ''}`);
    console.log(`\n${lines.length} claim line(s): ${tally.join(' · ')} · dated ${lines.length - marked.length} (a line counts once per kind; not a gate)`);
}

// ---------------------------------------------------------------- driver

function lintFile(file) {
    const out = [];
    const doc = parseDoc(file);
    checkCampaign(doc, out);
    checkShape(doc, out);
    checkCoverage(doc, out);
    checkRegister(doc, out);
    checkLinks(doc, out);
    return out.sort((a, b) => a.line - b.line);
}

function run(files) {
    let total = 0;
    for (const file of files) {
        const findings = lintFile(file);
        total += findings.length;
        const r = path.relative(process.cwd(), file);
        const rel = !r || r.startsWith('..') ? file : r;
        for (const f of findings) console.log(`${rel}:${f.line} — ${f.check} — ${excerpt(f.msg)}`);
    }
    if (total === 0) console.log(`OK — ${files.length} spec(s) clean (campaign · shape · coverage · register · links)`);
    else console.log(`\n${total} finding(s) in ${files.length} spec(s)`);
    return total === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- 5. scenarios vs suites (--tests)

// Every canonical scenario has one test per app its badge names, titled `S<n>: …` (RUNBOOK rule 3,
// MAINTENANCE "Coverage requests"); an unbadged scenario runs where the spec's title badge says.
// An absence test may carry a number its badge excludes when its title says "absence".
const APPS = ['ojs', 'omp', 'ops'];
const APPS_ROOT = path.resolve(SCRIPT_DIR, '../../../apps');
const APP_BADGE_RE = /\{((?:OJS|OMP|OPS)(?:\s+(?:OJS|OMP|OPS))*)\}/;
const TITLE_RE = /^S(\d+)((?:\+S\d+)*)([a-z]?)\b/; // S3 · S13+S14 (one absence test for two) · S3b (a split, reported)
const LEGACY_RE = /^scenario\s+(\d+)\b/i;
const badgeApps = (s) => { const m = s.match(APP_BADGE_RE); return m ? m[1].split(/\s+/).map((a) => a.toLowerCase()) : null; };
const APP = (a) => a.toUpperCase();

function scenariosOf(doc) {
    const specApps = badgeApps(doc.title) || APPS;
    const out = [];
    for (let i = 0; i < doc.tailStart; i++) {
        if (doc.skip[i] || !/^Canonical scenarios/.test(doc.h2[i])) continue;
        const m = doc.lines[i].match(/^(\d+)\.\s+\*\*(.*)$/);
        if (!m) continue;
        // the badge sits inside the bold title or right after it, before the first sentence; a title may wrap
        const close = m[2].indexOf('**');
        const title = close === -1 ? m[2] : m[2].slice(0, close), rest = close === -1 ? '' : m[2].slice(close + 2);
        const head = title + ' ' + (rest.split(/[.:—]/)[0] || '');
        out.push({ n: Number(m[1]), line: i + 1, title: title.replace(APP_BADGE_RE, '').trim(), apps: badgeApps(head) || specApps });
    }
    return out;
}

function suiteTests(feature, app, root) {
    const tests = [];
    for (const dir of [path.join(root, app, 'playwright', 'tests'), path.join(root, app, 'playwright', 'tests', 'serial')]) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(feature + '-') && x.endsWith('.spec.js')).sort()) {
            const file = path.join(dir, f);
            fs.readFileSync(file, 'utf8').split('\n').forEach((l, i) => {
                const m = l.match(/^\s*test\(\s*(['"`])((?:\\.|(?!\1).)*)\1/);
                if (m) tests.push({ file, line: i + 1, title: m[2] });
            });
        }
    }
    return tests;
}

function checkTests(file, root = APPS_ROOT) {
    const out = [];
    const feature = (path.basename(file).match(/^(U\d{2})-/) || [])[1];
    if (!feature) { out.push({ file, line: 1, msg: 'the spec file name does not open U<nn>-, so no suite can be matched' }); return out; }
    const doc = parseDoc(file);
    const scenarios = scenariosOf(doc);
    const byN = new Map(scenarios.map((s) => [s.n, s]));
    for (const app of APPS) {
        const expected = scenarios.filter((s) => s.apps.includes(app));
        const tests = suiteTests(feature, app, root);
        if (!tests.length) {
            if (expected.length) out.push({ file, line: expected[0].line, msg: `no ${app} suite, and scenario${expected.length > 1 ? 's' : ''} ${expected.map((s) => s.n).join(', ')} name${expected.length > 1 ? '' : 's'} ${APP(app)}` });
            continue;
        }
        const covered = new Set(), count = new Map();
        for (const t of tests) {
            const m = t.title.match(TITLE_RE), lg = m ? null : t.title.match(LEGACY_RE);
            const at = { file: t.file, line: t.line };
            if (!m && !lg) { out.push({ ...at, msg: `"${excerpt(t.title, 50)}" names no scenario; a test title opens S<n>` }); continue; }
            if (lg) out.push({ ...at, msg: `"${excerpt(t.title, 40)}": the title opens S${lg[1]}, not "scenario ${lg[1]}"` });
            const split = !!(m && m[3]);
            if (split) out.push({ ...at, msg: `"${excerpt(t.title, 40)}": S${m[1]}${m[3]} splits scenario ${m[1]}; one test per scenario` });
            const nums = m ? [Number(m[1]), ...m[2].split('+').filter(Boolean).map((x) => Number(x.slice(1)))] : [Number(lg[1])];
            const absence = /absen/i.test(t.title);
            for (const n of nums) {
                const sc = byN.get(n);
                if (!sc) { out.push({ ...at, msg: `S${n}: the spec has no scenario ${n}` }); continue; }
                if (!sc.apps.includes(app) && !absence) out.push({ ...at, msg: `S${n}: scenario ${n} is badged {${sc.apps.map(APP).join(' ')}}, not ${APP(app)}; an absence test says "absence" in its title` });
                covered.add(n);
                if (!split) { count.set(n, (count.get(n) || 0) + 1); if (count.get(n) > 1) out.push({ ...at, msg: `two tests on S${n} in ${app}; one test per scenario` }); }
            }
        }
        for (const s of expected) if (!covered.has(s.n)) out.push({ file, line: s.line, msg: `scenario ${s.n} "${excerpt(s.title, 40)}" has no S${s.n} test in ${app}` });
    }
    return out.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file === file ? -1 : b.file === file ? 1 : a.file.localeCompare(b.file)));
}

function runTests(files, root = APPS_ROOT) {
    let total = 0;
    const rel = (f) => { const r = path.relative(process.cwd(), f); return !r || r.startsWith('..') ? f : r; };
    for (const file of files) {
        const findings = checkTests(file, root);
        total += findings.length;
        for (const f of findings) console.log(`${rel(f.file)}:${f.line} — tests — ${excerpt(f.msg, 160)}`);
    }
    if (total === 0) console.log(`OK — ${files.length} spec(s): every scenario has its S<n> test in every app its badge names`);
    else console.log(`\n${total} finding(s) in ${files.length} spec(s)`);
    return total === 0 ? 0 : 1;
}

// self-test fixture for --tests: a two-app spec with one press-only and one preprint-absence scenario
const TESTS_SPEC = `---
name: sample
status: verified
---

# Sample feature {OJS OMP}

## Canonical scenarios

1. **Do the thing**

   Given: Editor.

   - **Control**: nothing else changes.

2. **Only on a press** {OMP}

   - **Control**: nothing on a journal.

3. **Nothing on a preprint server** {OPS}

   - **Control**: the address is refused.

## Footnotes — mechanism & evidence
`;
const suite = (...titles) => `const { test } = require('@playwright/test');\ntest.describe('sample', () => {\n${titles.map((t) => `    test('${t}', async () => {});\n`).join('')}});\n`;
const TESTS_SUITES = { ojs: suite('S1: do the thing'), omp: suite('S1: do the thing', 'S2: only on a press'), ops: suite('S3: nothing on a preprint server') };

function selfTestTests(dir) {
    let fails = 0;
    const specsDir = path.join(dir, 'tspecs'), apps = path.join(dir, 'apps');
    fs.mkdirSync(specsDir, { recursive: true });
    const spec = path.join(specsDir, 'U99-sample.md');
    fs.writeFileSync(spec, TESTS_SPEC);
    const write = (suites) => {
        fs.rmSync(apps, { recursive: true, force: true });
        for (const [app, text] of Object.entries(suites)) {
            if (text === null) continue;
            const d = path.join(apps, app, 'playwright', 'tests');
            fs.mkdirSync(d, { recursive: true });
            fs.writeFileSync(path.join(d, 'U99-sample.spec.js'), text);
        }
        return checkTests(spec, apps);
    };
    const cases = [
        ['every scenario has its test per app', TESTS_SUITES, 0],
        ['a scenario with no test in an app its badge names', { ...TESTS_SUITES, ojs: suite() }, 1],
        ['a test with no scenario behind it', { ...TESTS_SUITES, omp: suite('S1: do the thing', 'S2: only on a press', 'S4: extra') }, 1],
        ['a test on a scenario the badge excludes', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'S2: only on a press') }, 1],
        ['an absence test on a scenario the badge excludes', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'S2 (absence): no press step on a journal') }, 0],
        ['two tests on one scenario', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'S1: do it again') }, 1],
        ['a split test (S1b)', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'S1b: the second half') }, 1],
        ['the legacy "scenario 1:" title', { ...TESTS_SUITES, ojs: suite('scenario 1: do the thing') }, 1],
        ['a title with no number', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'OJS1: something else') }, 1],
        ['no suite for an app a scenario names', { ...TESTS_SUITES, ops: null }, 1],
        ['one absence test for two scenarios (S2+S3)', { ...TESTS_SUITES, ojs: suite('S1: do the thing', 'S2+S3 (absence): neither on a journal') }, 0],
    ];
    for (const [name, suites, want] of cases) {
        const findings = write(suites);
        const ok = findings.length === want;
        console.log(`${ok ? 'pass ' : 'FAIL'} tests — ${name}`);
        if (!ok) { fails++; findings.forEach((f) => console.log(`      (got ${path.basename(f.file)}:${f.line} ${f.msg})`)); }
    }
    return fails;
}

// ---------------------------------------------------------------- self-test

const GOOD = `---
name: sample-feature
status: draft
---

# Sample feature {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

The sample surface lets an editor record a decision on the review round and lets
the author see the outcome on the same screen. <sup>[a](#fn-a)</sup>

## Rules & state

1. The editor sees "Record decision" while the round is open ⚠ [A1](#a1).
2. On a press the same button opens the catalog step instead [OMP1](#omp1).

## Findings register

Verdicts are the author's judgment (claude, 2026-07-27), unreviewed unless an
entry notes otherwise. Sorted 🐞 → ❓ → ✅ in the summary; entries are the source.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The button disappears after the first upload | 🐞 | user-visible | — |
| [OMP1](#omp1) | The press flow lands on the catalog step | ✅ | minor | — |

### All apps

<a id="a1"></a>
**A1 — Button disappears** · 🐞 · user-visible.
The author uploads one file and the button vanishes. Expected: it stays.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Catalog step instead** · ✅ · minor.
On a press the decision opens the catalog step. Intended divergence.
Basis: judgment. <sup>[f-omp1](#fn-omp1)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Stage access: \`WorkflowStageAccessPolicy::authorize()\`, live-probed 302.

<a id="fn-a1"></a>
**f-a1** — The show-list omits the resubmitted status.

<a id="fn-omp1"></a>
**f-omp1** — The catalog entry replaces the issue step.
`;

// each case: [expected check, substring of the clean fixture, the bad replacement]
const CASES = [
    ['shape', '> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).', '> Conventions: ⚠ marks questioned behaviour; the rest is in [Reading a spec](GLOSSARY.md#reading-a-spec).'],
    ['campaign', 'the author see the outcome', 'the author see the outcome (participants: U35)'],
    ['campaign', 'the author see the outcome', 'the author see the outcome, per atom AFFW-042'],
    ['register', '| [OMP1](#omp1) | The press flow lands on the catalog step | ✅ | minor | — |', '| [OMP1](#omp1) | The press flow lands on the catalog step | 🐞 | minor | — |'],
    ['register', '**A1 — Button disappears** · 🐞 · user-visible.', '**A1 — Button disappears** · user-visible.'],
    ['register', 'the round is open ⚠ [A1](#a1)', 'the round is open ⚠ [A2](#a2)'],
    ['register', 'the round is open ⚠ [A1](#a1)', 'the round is open [A1](#a1)'],
    ['register', '<a id="omp1"></a>\n**OMP1', '<a id="omp2"></a>\n**OMP2'],
    ['links', 'the same screen. <sup>[a](#fn-a)</sup>', 'the same screen. <sup>[z](#fn-z)</sup>'],
    ['links', '[Reading a spec](GLOSSARY.md#reading-a-spec)', '[Reading a spec](../NOPE.md#reading-a-spec)'],
    ['links', '<a id="fn-omp1"></a>', '<a id="fn-a1"></a>'],
];

// claims fixture: GOOD with claim sections and footnotes that exercise every kind of the report
const CLAIMS = GOOD.replace(/## Rules & state[\s\S]*?(?=## Findings register)/, `## Actors & permissions

| Action | Who may, and when |
|--------|--------------------|
| **Record a decision** | • Journal Manager, on an open round <sup>a</sup> |

## Rules & state

1. The editor sees only the "Record decision" button while the round is
   open ⚠ [A1](#a1). <sup>a</sup>
2. The round closes when the last review comes in.
3. A closed round keeps its files. <sup>b</sup>
4. The author sees the outcome on the same screen. <sup>c</sup>
5. The decision date is read from the code; no screen shows it. <sup>a</sup>
6. The reminder runs nightly. <sup>d</sup>
7. The page reads "Thanks for recording your decision" at the top. <sup>a</sup>
8. The page reads "Thanks for coming
   back today" below. <sup>a</sup>
9. The page lists the files in upload order. <sup>a</sup>
10. On a press the same button opens the catalog step instead [OMP1](#omp1). <sup>a</sup>
11. A second upload replaces the first. <sup>e</sup>

## Side effects

- **On decision**: the decision is stored and the author is told. <sup>a</sup>
  - the notice names the round.

`).replace(/<a id="fn-a"><\/a>[\s\S]*?(?=<a id="fn-a1">)/, `<a id="fn-a"></a>
**a** — Stage access: \`WorkflowStageAccessPolicy::authorize()\`. Live-probed
2026-08-01 (Rules 1, 7–10): the page reads "Thanks for coming back today"
below the form.

<a id="fn-b"></a>
**b** — File retention: \`SubmissionFileDAO::retain()\`.

<a id="fn-c"></a>
**c** — Live-probed 2026-07-01: the outcome row is present.

<a id="fn-d"></a>
**d** — \`ReminderTask\`; live-probed 2026-08-01: no screen runs it.

<a id="fn-e"></a>
**e** — To drive: as Author, upload twice on the same round; does the list
show one file or two? \`SubmissionFileDAO::insert()\` reads either way.

`);

// [substring of the claim line, expected kind labels in report order]; a line absent from the report fails
const CLAIM_EXPECT = [
    ['lets an editor record a decision', []],
    ['• Journal Manager, on an open round', ['role-gated']],
    ['A second upload replaces the first', ['to-drive "as Author, upload twice on the same round; does the list sho…"', 'undated fn-e']],
    ['The editor sees only', ['exclusive']],
    ['open ⚠ [A1](#a1). <sup>a</sup>', []],
    ['The round closes when the last review', ['no-mark']],
    ['A closed round keeps its files', ['undated fn-b']],
    ['The author sees the outcome on the same screen', ['undated fn-c']],
    ['The decision date is read from the code', ['no-screen', 'exclusive']],
    ['The reminder runs nightly', ['no-screen (fn-d)']],
    ['Thanks for recording your decision', ['string "Thanks for recording your decision"']],
    ['The page reads "Thanks for coming', []],
    ['The page lists the files in upload order', []],
    ['the notice names the round', []],
];

function selfTestClaims(write) {
    let fails = 0;
    const file = write(CLAIMS);
    const gate = lintFile(file);
    if (gate.length) { fails++; console.log('FAIL claims fixture is not gate-clean:'); gate.forEach((f) => console.log(`  line ${f.line} — ${f.check} — ${f.msg}`)); }
    const { date, lines } = claimsOf(file);
    if (date !== '2026-08-01') { fails++; console.log(`FAIL claims default date: expected the newest probe date 2026-08-01, got ${date}`); }
    else console.log('pass  claims — default date is the newest live-probed date, read across a wrapped line');
    for (const [needle, want] of CLAIM_EXPECT) {
        const l = lines.find((x) => x.text.includes(needle));
        const got = l ? KIND_ORDER.flatMap((k) => l.kinds.filter((x) => x.kind === k)).map(kindLabel) : null;
        const ok = got && got.join(', ') === want.join(', ');
        console.log(`${ok ? 'pass ' : 'FAIL'} claims — ${want.length ? want.join(', ') : 'dated'} — ${excerpt(needle, 50)}`);
        if (!ok) { fails++; console.log(`      (got ${got ? got.join(', ') || 'dated' : 'line not in the report'})`); }
    }
    const skipped = ['| Action | Who may, and when |', '|--------|', 'Verdicts are the', '| [A1](#a1) |'];
    for (const s of skipped) if (lines.some((l) => l.text.includes(s))) { fails++; console.log(`FAIL claims — listed a non-claim line: ${excerpt(s, 40)}`); }
    if (!fails) console.log('pass  claims — table header rows, the register preamble and summary table are not listed');
    const later = claimsOf(file, '2026-08-02').lines.find((x) => x.text.includes('The page lists the files in upload order'));
    const ok = later && later.kinds.map(kindLabel).join(', ') === 'undated fn-a';
    console.log(`${ok ? 'pass ' : 'FAIL'} claims — --date 2026-08-02 makes a 2026-08-01 footnote undated`);
    if (!ok) fails++;
    return fails;
}

function selfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-spec-'));
    fs.mkdirSync(path.join(dir, 'specs'));
    // the shared legend the fixture's conventions line points at (specs/GLOSSARY.md § Reading a spec)
    fs.writeFileSync(path.join(dir, 'specs', 'GLOSSARY.md'), '# Glossary\n\n## Reading a spec\n\nThe one legend for every spec file.\n');
    const write = (text) => { const f = path.join(dir, 'specs', 'sample.md'); fs.writeFileSync(f, text); anchorCache.clear(); return f; };
    let fails = 0;
    const good = lintFile(write(GOOD));
    if (good.length) { fails++; console.log('FAIL clean fixture produced findings:'); good.forEach((f) => console.log(`  line ${f.line} — ${f.check} — ${f.msg}`)); }
    else console.log('pass  clean fixture — 0 findings');
    for (const [check, from, to] of CASES) {
        if (!GOOD.includes(from)) { fails++; console.log(`FAIL fixture mutation not applicable: ${excerpt(from, 40)}`); continue; }
        const findings = lintFile(write(GOOD.replace(from, to)));
        const hit = findings.some((f) => f.check === check);
        console.log(`${hit ? 'pass ' : 'FAIL'} ${check} — ${excerpt(to, 60)}`);
        if (!hit) { fails++; findings.forEach((f) => console.log(`      (got ${f.check}: ${f.msg})`)); }
    }
    // a one-line entry under "### Retired" needs no body marker (TEMPLATE "Findings register")
    const retired = GOOD.replace('---\n\n<a id="footnotes"></a>', '### Retired\n\n<a id="a2"></a>\n**A2 — Old finding** · ✅ · retired. Fixed upstream. <sup>[f-a1](#fn-a1)</sup>\n\n---\n\n<a id="footnotes"></a>')
        .replace('| [OMP1](#omp1) | The press flow lands on the catalog step | ✅ | minor | — |', '| [OMP1](#omp1) | The press flow lands on the catalog step | ✅ | minor | — |\n| [A2](#a2) | Retired: old finding | ✅ | retired | — |');
    const rf = lintFile(write(retired));
    if (rf.length) { fails++; console.log('FAIL retired-block fixture produced findings:'); rf.forEach((f) => console.log(`  line ${f.line} — ${f.check} — ${f.msg}`)); }
    else console.log('pass  retired-block entry without a body marker — 0 findings');
    // Coverage (TEMPLATE "Coverage"): the draft table passes as draft and fails as verified; the final
    // shape is the "Left out" bullets alone, with reason words, no guard cut, no date, no table
    const draftCov = GOOD.replace('## Findings register', '## Coverage\n\n| Who, state or setting | Class | Runs in | Why not |\n|---|---|---|---|\n| Editor (Actors row 1) | main | planned | |\n\n## Findings register');
    const finalCov = GOOD.replace('## Findings register', '## Canonical scenarios\n\n1. **Record a decision**\n\n   Given: Editor, on an open round.\n\n   - **Control**: press "Record decision"; the decision is recorded.\n\n## Coverage\n\nLeft out of the scenarios above, by reason:\n\n- **Budget** — states:\n  - the closed round (Rule 2)\n- **Owned by another feature**:\n  - the catalog step (*Catalog management*)\n\n## Findings register');
    const covCases = [
        ['the draft table passes as draft', draftCov, false],
        ['the draft table fails as verified', draftCov.replace('status: draft', 'status: verified'), true],
        ['a draft row without a class', draftCov.replace('| main |', '| |'), true],
        ['the final shape passes as verified', finalCov.replace('status: draft', 'status: verified'), false],
        ['a table in the final shape', finalCov.replace('Left out of the scenarios above, by reason:', '| # | Scenario | Apps |\n|---|---|---|\n| 1 | Record a decision | OJS |'), true],
        ['a Planned bullet passes as verified', finalCov.replace('status: draft', 'status: verified').replace('- **Budget** — states:', '- **Planned**:\n  - the reopened round (Rule 4)\n- **Budget** — states:'), false],
        ['a bullet without a reason word', finalCov.replace('**Owned by another feature**', '**Skipped**'), true],
        ['the Budget bullet cutting a guard', finalCov.replace('— states:', '— guards:'), true],
        ['a date in the section', finalCov.replace('(Rule 2)', '(Rule 2), read once 2026-09-06'), true],
        ['items joined on the reason line', finalCov.replace('— states:\n  - the closed round (Rule 2)', '— states: the closed round (Rule 2); the open round (Rule 3).'), true],
        ['an item after the colon of a plain reason', finalCov.replace('feature**:\n  - the catalog', 'feature**: the catalog'), true],
    ];
    for (const [name, text, wantHit] of covCases) {
        const findings = lintFile(write(text));
        const ok = wantHit ? findings.some((f) => f.check === 'coverage') : findings.length === 0;
        console.log(`${ok ? 'pass ' : 'FAIL'} coverage — ${name}`);
        if (!ok) { fails++; findings.forEach((f) => console.log(`      (got ${f.check}: ${f.msg})`)); }
    }
    fails += selfTestClaims(write);
    fails += selfTestTests(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(fails ? `\n${fails} self-test failure(s)` : '\nself-test OK');
    return fails ? 1 : 0;
}

// ---------------------------------------------------------------- entry point

const args = process.argv.slice(2);
if (args.includes('--self-test')) process.exit(selfTest());
const resolveTarget = (t) => (fs.existsSync(path.resolve(t)) ? path.resolve(t) : path.join(SPECS_DIR, t));
const ci = args.indexOf('--claims');
if (ci !== -1) { // the report, not the gate: always exit 0 once the spec is found
    const spec = args[ci + 1], di = args.indexOf('--date'), date = di === -1 ? null : args[di + 1];
    if (!spec || spec.startsWith('-') || (di !== -1 && !/^\d{4}-\d{2}-\d{2}$/.test(date || ''))) { console.error('usage: lint-spec.mjs --claims <spec> [--date YYYY-MM-DD]'); process.exit(2); }
    const file = resolveTarget(spec);
    if (!fs.existsSync(file)) { console.error(`lint-spec: no such file: ${file}`); process.exit(2); }
    printClaims(file, date);
    process.exit(0);
}
const testsMode = args.includes('--tests');
const unknown = args.filter((a) => a.startsWith('-') && a !== '--tests');
if (unknown.length) { console.error(`lint-spec: unknown option ${unknown[0]}; usage: lint-spec.mjs [spec ...] | --tests [spec ...] | --claims <spec> [--date YYYY-MM-DD] | --self-test`); process.exit(2); }
const targets = args.filter((a) => !a.startsWith('-'));
const files = targets.length
    ? targets.map(resolveTarget)
    : fs.readdirSync(SPECS_DIR).filter((f) => /^U\d{2}-.*\.md$/.test(f)).sort().map((f) => path.join(SPECS_DIR, f));
for (const f of files) if (!fs.existsSync(f)) { console.error(`lint-spec: no such file: ${f}`); process.exit(2); }
process.exit(testsMode ? runTests(files) : run(files));
