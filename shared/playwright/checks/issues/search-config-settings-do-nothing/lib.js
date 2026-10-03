// Helpers of walk.js (U15 A9: two [search] settings in config.inc.php that
// main no longer reads). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../../../..');

/**
 * What an administrator does in config.inc.php: set `key = value` in
 * `[section]` of the install's configuration file (the fleet's, which is the
 * dataset's own config.inc.php). Returns {before, restore}: `restore()` writes
 * the file back exactly as it was.
 */
function setConfigValue(app, section, key, value) {
    const file = path.resolve(REPO, app.configFile);
    const original = fs.readFileSync(file, 'utf8');
    const sec = new RegExp(`^\\[${section}\\]\\s*$`, 'm').exec(original);
    if (!sec) throw new Error(`no [${section}] section in ${app.configFile}`);
    const start = sec.index + sec[0].length;
    const next = original.slice(start).search(/^\[/m);
    const end = next < 0 ? original.length : start + next;
    const body = original.slice(start, end);
    const line = new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm');
    const m = line.exec(body);
    const newBody = m ? body.replace(line, `${key} = ${value}`) : `\n${key} = ${value}${body}`;
    fs.writeFileSync(file, original.slice(0, start) + newBody + original.slice(end));
    return {before: m ? m[1].trim() : null, restore: () => fs.writeFileSync(file, original)};
}

module.exports = {setConfigValue};
