#!/usr/bin/env node
/**
 * @file bin/gh-search.js
 *
 * Search pkp's GitHub trackers through the public API without a token
 * (briefs/issue-report.md step 3), in one queue for every agent on the
 * machine:
 *
 *   node bin/gh-search.js [--per-page n] [--json] 'repo:pkp/pkp-lib <words>' ['repo:pkp/ojs <words>' …]
 *
 * The unauthenticated search allows ten calls a minute per machine, and
 * every agent on it draws from that. Each query here holds a lock (a
 * directory under ~/.cache/pkp-e2e/) for its call, and a call the limit
 * refuses waits for the minute's reset and goes again, so several agents'
 * queries run one after another instead of losing calls mid-burst. The
 * wait can outlast the Bash tool's 600 s cap: start a long list in the
 * background. The answers carry GitHub's text-match fragments, which show
 * where a hit matched (the body, a comment) before an issue read is spent
 * on it. github.com's own issue search serves no results to a script, so
 * it is no fallback for a refused search.
 *
 * Output per query: `## <query> (<total> results)`, then per hit
 * `<repo>#<n> [<issue|pr> <state>] <title> <url>` and its fragments;
 * `--json` prints the raw items instead.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOCK = path.join(os.homedir(), '.cache', 'pkp-e2e', 'gh-search.lock');
const STALE_MS = 180_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

async function withLock(fn) {
    fs.mkdirSync(path.dirname(LOCK), {recursive: true});
    for (;;) {
        try {
            fs.mkdirSync(LOCK);
            fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid));
            break;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            // A holder that died, or one stuck past any reset wait, gives the lock up.
            try {
                const pid = Number(fs.readFileSync(path.join(LOCK, 'pid'), 'utf8'));
                const age = Date.now() - fs.statSync(LOCK).mtimeMs;
                if ((pid && !alive(pid)) || age > STALE_MS) {
                    fs.rmSync(LOCK, {recursive: true, force: true});
                    continue;
                }
            } catch {
                // the holder is between mkdir and its pid file, or just left
            }
            await sleep(500);
        }
    }
    try {
        return await fn();
    } finally {
        fs.rmSync(LOCK, {recursive: true, force: true});
    }
}

async function search(query, perPage) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=${perPage}`;
    for (let attempt = 1; ; attempt++) {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/vnd.github.text-match+json',
                'User-Agent': 'pkp-e2e-gh-search',
            },
        });
        if (response.ok) {
            return response.json();
        }
        const body = await response.text();
        const limited = [403, 429].includes(response.status) && /rate limit/i.test(body);
        if (!limited || attempt >= 6) {
            throw new Error(`${response.status} ${body.slice(0, 200)}`);
        }
        // Touch the lock so a long reset wait is not taken for a dead holder.
        fs.utimesSync(LOCK, new Date(), new Date());
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        const retryAfter = Number(response.headers.get('retry-after')) * 1000;
        const wait = Math.min(Math.max(retryAfter || (reset ? reset - Date.now() : 0), 0) + 1000, 65_000);
        console.error(`gh-search: rate limited, waiting ${Math.round(wait / 1000)} s for the reset`);
        await sleep(wait);
    }
}

const flat = (text, n) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function main() {
    const args = process.argv.slice(2);
    let perPage = 20;
    let json = false;
    const queries = [];
    const usage = "usage: node bin/gh-search.js [--per-page n] [--json] 'repo:pkp/pkp-lib <words>' […]";
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--per-page') perPage = Number(args[++i]) || perPage;
        else if (args[i] === '--json') json = true;
        else if (args[i] === '-h' || args[i].startsWith('--')) {
            // --help (or any other flag) prints the usage and spends no search
            // call: the allowance is the machine's (U17, U44, U08 issue walks).
            console.error(`${args[i] === '--help' || args[i] === '-h' ? '' : `gh-search: unknown option ${args[i]}\n`}${usage}`);
            process.exit(args[i] === '--help' || args[i] === '-h' ? 0 : 2);
        } else queries.push(args[i]);
    }
    if (!queries.length) {
        console.error(usage);
        process.exit(2);
    }
    let failed = 0;
    for (const query of queries) {
        try {
            const result = await withLock(() => search(query, perPage));
            if (json) {
                console.log(JSON.stringify({query, total: result.total_count, items: result.items}));
                continue;
            }
            console.log(`## ${query} (${result.total_count} results)`);
            for (const item of result.items) {
                const repo = item.repository_url.replace('https://api.github.com/repos/', '');
                const kind = item.pull_request ? 'pr' : 'issue';
                console.log(`${repo}#${item.number} [${kind} ${item.state}] ${flat(item.title, 160)} ${item.html_url}`);
                for (const match of (item.text_matches || []).slice(0, 2)) {
                    console.log(`    ${match.property}: …${flat(match.fragment, 200)}…`);
                }
            }
        } catch (error) {
            failed++;
            console.log(`## ${query}: FAILED ${error.message}`);
        }
    }
    process.exitCode = failed ? 1 : 0;
}

main();
