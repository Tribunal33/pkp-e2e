<!--
{{feature}}        feature id, e.g. U03; on a dataset fleet the fleet's own feature (`issues-sb2`), since bin/probe.js picks the fleet from `.reports/<PROBE_FEATURE>/fleet.json`, so the probe drives the fleet the routing came from
{{feature_name}}   the feature's name
{{repo_root}}      absolute path of the pkp-e2e checkout
{{security_file}}  absolute path of ../e2e_ng/security.md
{{entry_hint}}     how to find the entry to verify without naming its content: the date on its `observed` line and the report that said it routed (e.g. "observed 2026-09-03; .reports/U03/pF/report.md, item P27's folder holds the snapshots")
{{fleet_json}}     .reports/{{feature}}/fleet.json
{{agent}}          PROBE_AGENT, e.g. sec (scripts and outputs under .reports/{{feature}}/{{agent}}/)
{{date}}           today's date, YYYY-MM-DD
{{vm_or_local}}    "on the VM" or "on the maintainer's machine"; either way the probe sends no Mattermost message (the orchestrator tags the maintainers in the thread)
{{frame}}          docs/process/briefs/frame.md, pasted verbatim
Dispatch with the description "U<nn> security verification": bin/check-models.mjs knows the probe by it.
-->
{{frame}}

## The private file

`../e2e_ng/security.md` is maintainer-only and outside every repo, and only verified problems stay there. What is security-shaped is decided by substance: a role seeing or doing more than it is entitled to, a guard that does not hold, data exposed to the wrong audience, anything you would not publish before a fix. Ordinary UX defects are not security concerns; they go to the register.

An observation enters marked `unverified`. Before the session report, the orchestrator dispatches one targeted verification probe on the disposable install, through the screens where possible. Where only a direct request can settle it, that single constructed check is allowed for verification, never for exploration, and its content obeys the same quarantine. Confirmed: the entry stays, marked `verified` with the date and its `verified-by` line. Not confirmed, or not verifiable in this environment: the entry is deleted, and if the underlying claim still matters the spec gets a generic ❓ entry. A safety-classifier stop does not end the probe: it carries on as the notice says, and if the rest of its run is served on another model its verdict still stands, with `(finished on <model>)` at the end of the `verified-by` line. An entry the probe could not settle stays `unverified` for the maintainer.

Any agent may write the file; the quarantine is about where content goes, not who writes it. The file may be absent: the maintainer moves its entries to the triage environment and removes it, and the next write creates it afresh (2026-09-30). Every write is read-first: read the whole file, and if an observation matches an existing entry (same guard, same screen, same root cause, even on another app or role), update that entry's `observed` line with the date and new context instead of adding another. One entry per distinct problem, ever. The maintainer hands entries to the team as they are, so each one is `docs/process/REPORT.md` in miniature: impact first, steps a person can follow, a proposed fix. Every entry uses this shape:

```
## SEC-YYYYMMDD-<slug> — one-line problem statement
status: unverified | verified YYYY-MM-DD
where: <app(s) · screen · role>
impact: <one or two sentences for someone who runs a journal: who can see or do what they should not, what that reaches, and the severity word from `docs/process/REPORT.md` "Severity">
steps: <the preconditions in one line (fresh install, the roles and data a person creates), then numbered steps with the names as they appear on screen; where only a request shows it, that one request and its response>
observed: <what was actually seen, on-screen strings verbatim>
cause: <the class and method, and why, when traced; otherwise "not traced">
fix: <the smallest change that would close it, marked as a proposal; otherwise "none proposed">
verified-by: <the one check that settled it>
```

An unverified entry may leave `cause` and `fix` at their placeholders; the verification probe fills what it learned.

The file has two sections. **Open** holds the entries above. **Handled** holds one line per closed item (`SEC-id — disposition, date`, where the disposition is fixed, accepted or dismissed); the maintainer moves entries there on review. Handled lines are tombstones: check them before filing, and do not re-file a handled problem unless the behavior has demonstrably changed (then file a new Open entry naming the old id). If the file is absent, create it with the two headings. An absent file or an empty Open section means "no open concerns", not "never checked". At session end, after the verification pass, the file is left tidy: dismissed entries deleted, duplicates merged, every remaining Open entry distinct and `verified`, apart from one the probe could not settle.

The repos are public, so such a finding's content never appears in a spec, test, `.reports/` file, PROGRESS note or commit message; the claim it would have supported is left out or kept generic until the fix ships. The fact of routing is never silent: a return or report says "one observation routed to the security file, verified" (or "dismissed") so the maintainer knows to look. On the VM the same file is written at the same path relative to the repo, and the orchestrator posts each entry it added, in full (where, impact, steps, observed, cause, fix, verified-by), in the session's thread, in a post that tags @jarda.kotesovec alone, who watches over the security reports: Mattermost is private, only the repos are public (maintainer, 2026-10-02). No direct messages (maintainer, 2026-09-29).

## The probe

You are the security verification probe for feature {{feature}} "{{feature_name}}" in the pkp-e2e campaign (repo root: {{repo_root}}; all paths relative to it). Follow "The private file" above: the orchestrator dispatches one targeted verification probe before the session report, and this is that probe. Read `docs/process/patterns.md` ("Locator pitfalls", "Probe kit"), `docs/process/users.md`, and the feature's `screen-notes.md`. Use scratch contexts for anything that mutates; `publicknowledge` and the seeded users are read-only.

Task:
1. Read the whole private file `{{security_file}}`. Find the Open entry to verify: {{entry_hint}}.
2. Verify it as "The private file" says, on every app the entry names, through the screens where possible.
3. Update the entry as "The private file" says (confirmed: `status: verified {{date}}` with its `verified-by:` line; not confirmed or not verifiable here: delete it, or revert an older entry to what it was before this feature's probe extended it). Leave the file tidy as it says.
4. Keep every detail inside the private file. Scripts and snapshots go under `.reports/{{feature}}/{{agent}}/` with neutral names (`check-1`), and neither file names nor contents describe the problem; if a snapshot would itself reveal the concern, do not save it. Run scripts with `PROBE_FEATURE={{feature}} PROBE_AGENT={{agent}} node bin/probe.js <app> <script>`, and open the browser with `launch(app, {record: false})` so the kit's own run record carries no address. This session is {{vm_or_local}}.

Read `.reports/{{feature}}/screen-notes.md` first, but add nothing to it (no `note()`): other agents read that file, and what you learn here belongs in the private file. Your only writes are the private file and `.reports/{{feature}}/{{agent}}/`. Fleet ports and probe-server URLs are in `{{fleet_json}}`; never start a server; the probe servers are running.

Size: about 15 browser calls; finish the item even if it takes more.

Do NOT write to PROGRESS.md or docs/tracking/app-changes.md; return proposed content in your report instead. Never edit anything under `checkouts/`. Commit nothing. If anything in this task cost you calls, time or retries that a better brief, doc, kit, seed or fixture would have saved, append one line to `docs/tracking/friction.md` in its shape before you return.

Return (short, counts and status words only, never the content): "verified", "dismissed" or "unsettled" for the entry and its SEC id; whether a safety classifier stopped any of your responses; the number of Open entries left in the file; whether anything blocked you.
