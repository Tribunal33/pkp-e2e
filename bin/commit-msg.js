#!/usr/bin/env node
/**
 * @file bin/commit-msg.js
 *
 * The clone's git commit-msg hook (bin/slot.js puts it in place at session
 * start; harness.md "Slots"). It writes a pkp issue or pull request in a
 * commit message without the owner: `pkp-lib#13447` for
 * `pkp/pkp-lib#13447` or for its github.com address. GitHub links only those
 * two forms, and every link from a pkp-e2e commit adds a "referenced" line
 * to pkp's issue, again from each fork that syncs the commit. Commit links
 * and other owners are left as they are.
 *
 *   node bin/commit-msg.js <message file>
 */
const fs = require('fs');

const file = process.argv[2];
const message = fs.readFileSync(file, 'utf8');
let count = 0;
const ownerless = (_, repo, number) => {
    count++;
    return `${repo}#${number}`;
};
const out = message
    .replace(/https?:\/\/github\.com\/pkp\/([\w.-]+)\/(?:issues|pull)\/(\d+)(?:[/#][\w/#.-]*[\w/]|\/)?/gi, ownerless)
    .replace(/(?<![\w./-])pkp\/([\w.-]+)#(\d+)/gi, ownerless);
if (count) {
    fs.writeFileSync(file, out);
    console.error(`commit-msg: ${count} pkp issue or PR mention(s) written without the owner, so pkp's issues get no "referenced" line (harness.md "Slots").`);
}
