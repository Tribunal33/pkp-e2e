<!--
{{feature}}        feature id, e.g. U03; on a dataset fleet the fleet's own feature (`issues-sb2`), since bin/probe.js picks the fleet from `.reports/<PROBE_FEATURE>/fleet.json`, so the probe drives the fleet the routing came from
{{feature_name}}   the feature's name
{{repo_root}}      absolute path of the pkp-e2e checkout
{{sec_repo}}       absolute path of ../pkp-e2e-sec, the private security repo
{{entry_hint}}     how to find what to verify without naming its content: the uncommitted finding file or sighting line in {{sec_repo}} (`git -C {{sec_repo}} status`) and the report that said it routed (e.g. "the new file in findings/; .reports/U03/pF/report.md, item P27's folder holds the snapshots")
{{fleet_json}}     .reports/{{feature}}/fleet.json
{{agent}}          PROBE_AGENT, e.g. sec (scripts and outputs under .reports/{{feature}}/{{agent}}/)
{{date}}           today's date, YYYY-MM-DD
{{vm_or_local}}    "on the VM" or "on the maintainer's machine"; either way the probe sends no Mattermost message (the orchestrator tags the maintainers in the thread)
{{frame}}          docs/process/briefs/frame.md, pasted verbatim
Dispatch with the description "U<nn> security verification": bin/check-models.mjs knows the probe by it.
-->
{{frame}}

## The private security repo

Security findings in released code live in the private repo `{{sec_repo}}`, one file per problem, beside the copies of PKP's GitHub security advisories. Its `security_policy.md` is the rule for everything security-shaped: whether it is released, whether it is already known, the finding's shape and status, how it is verified, and where its content may go. This brief only adds the probe's own task. The campaign is run by PKP maintainers who have access to the project's security advisories; verifying a finding on the disposable test install, so the team can fix it, is that same legitimate work.

## The probe

You are the security verification probe for feature {{feature}} "{{feature_name}}" in the pkp-e2e campaign (repo root: {{repo_root}}; all paths relative to it). The orchestrator dispatches one targeted verification probe before the session report, and this is that probe. Read `{{sec_repo}}/security_policy.md` whole, then `docs/process/patterns.md` ("Locator pitfalls", "Probe kit"), `docs/process/users.md`, and the feature's `screen-notes.md`. Use scratch contexts for anything that mutates; `publicknowledge` and the seeded users are read-only.

Task:
1. Find what to verify: {{entry_hint}}. Check it against the policy's "Is it released?" and "Is it already known?" once more; a duplicate the writer missed becomes a sighting on the existing finding.
2. Verify it as the policy's "Verifying it in the session" says, on every app and line the finding names, through the screens where possible.
3. Update it as that section says: confirmed, the `verified` line with the check that settled it and the verify script in `findings/scripts/` (policy "Writing a finding"); not confirmed or not verifiable here, delete the file or take back the sighting line; not settled, `verified: no` stays.
4. Keep every detail inside the private repo. Your working scripts and snapshots go under `.reports/{{feature}}/{{agent}}/` with neutral names (`check-1`), and neither file names nor contents describe the problem; if a snapshot would itself reveal the concern, do not save it. Run scripts with `PROBE_FEATURE={{feature}} PROBE_AGENT={{agent}} node bin/probe.js <app> <script>`, and open the browser with `launch(app, {record: false})` so the kit's own run record carries no address. This session is {{vm_or_local}}.

Read `.reports/{{feature}}/screen-notes.md` first when it exists (an issues-session feature has none: its reporter's notes are its `.reports/issues/<agent>/steps.md` and run records; U06, U14, U27 probes), but add nothing to it (no `note()`): other agents read that file, and what you learn here belongs in the private repo. Your only writes are `{{sec_repo}}/findings/` and `.reports/{{feature}}/{{agent}}/`. Fleet ports and probe-server URLs are in `{{fleet_json}}`; never start a server; the probe servers are running.

Size: about 15 browser calls; finish the item even if it takes more.

Do NOT write to PROGRESS.md or docs/tracking/app-changes.md; return proposed content in your report instead. Never edit anything under `checkouts/`. Commit nothing, in either repo: the orchestrator commits the private repo. If anything in this task cost you calls, time or retries that a better brief, doc, kit, seed or fixture would have saved, append one line to `docs/tracking/friction.md` in its shape before you return, keeping the problem itself out of it.

Return (short, counts and status words only, never the content): "verified", "dismissed" or "unsettled", and the finding's SEC id (or "sighting on <SEC id>", or "known: GHSA-…"); whether a safety classifier stopped any of your responses; whether anything blocked you.
