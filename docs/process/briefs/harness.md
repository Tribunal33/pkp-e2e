<!--
{{feature}}        feature id, e.g. U30
{{feature_name}}   the feature's name
{{repo_root}}      absolute path of the pkp-e2e checkout
{{spec_path}}      docs/specs/U<nn>-<feature>.md (the draft)
{{keys}}           the key family or keys to build, as the spec author's return named them, each with the Coverage rows (settings, states) that need it
{{fleet_json}}     .reports/{{feature}}/fleet.json
{{agent}}          PROBE_AGENT for the parity drive, e.g. h{{feature}} (scripts and outputs under .reports/{{feature}}/harness/)
{{report_path}}    .reports/{{feature}}/harness/harness-log.md (no file name an agent writes may start with report, summary, findings or analysis: Claude Code refuses a subagent's Write of one)
{{frame}}          docs/process/briefs/frame.md, pasted verbatim
-->
{{frame}}

You are the harness agent for feature {{feature}} "{{feature_name}}" in the pkp-e2e campaign (repo root: {{repo_root}}; all paths relative to it). Follow RUNBOOK step 4. Read `docs/process/PRINCIPLES.md` (A2, A3 and the design record D1–D9), `docs/process/scenarios.md` ("How the endpoints work", "Configuring a scratch context", "Field shapes not built yet"), `docs/tracking/parity-ledger.md`, and the Coverage section of `{{spec_path}}`.

Keys to build: {{keys}}.

Task:
1. Build the keys in the scenario builders under `shared/php/` (the `_test` controller and the `PKP*ScenarioBuilder` classes with their app subclasses), the way the existing keys are built: the real application services, never mirrored side effects (D3); an unsupported value throws (D4); an app-neutral core with app overlays (D5). `npm run mount` copies the overlays into the checkouts; never edit `checkouts/` directly.
2. Parity: drive the screen that produces the same state with the probe kit (`PROBE_FEATURE={{feature}} PROBE_AGENT={{agent}} node bin/probe.js <app> .reports/{{feature}}/harness/<script>`) and compare it with what the key seeds, on every app the key applies to. Append one row per key to `docs/tracking/parity-ledger.md` in its shape (A2: before it merges, never after). Type into a recorded window from the labels the recording shows, never from the draft's wording: the draft is unverified text, and a label it misquotes ("Email address" for a box the screen calls "Email") costs a timed-out drive.
3. Document the key in `docs/process/scenarios.md`: its section and value shape, and any fact a shipped suite relies on (a seeded state that opens a screen on a given step); such a state is a parity fact `scenarios.md` records, never something a key silently changes. Remove it from "Field shapes not built yet".
4. Regression, before the claim check starts: grep `apps/*/playwright/tests/` for the suites that seed through the changed family and run each green once (`npx playwright test -c configs/<app>.config.js --project=<app> <suite> --output .reports/{{feature}}/harness/pw-<app>-<suite> --reporter=list`; one folder per suite, because Playwright empties it at the next run; without `--project` a suite id also matches its `tests/serial/` file and runs the whole chain, so a serial file runs alone with `--project=<app>-serial --no-deps` and its `@solo` tests with `--project=<app>-solo --no-deps`), one at a time, each run under about four minutes (harness.md "Running"). A red suite means the change or its documentation is wrong, never a test to edit.
5. Write `{{report_path}}`: the keys built and their shapes, the parity rows appended, the suites re-run with their result lines, and what was mounted.

Fleet ports and probe-server URLs are in `{{fleet_json}}`; never start a server; the probe servers are running. Use scratch contexts for anything that mutates; `publicknowledge` and the seeded users are read-only.

Do NOT write to PROGRESS.md or docs/tracking/app-changes.md; return proposed content in your report instead. Commit nothing. Kill only browser or PHP processes you started yourself. If anything in this task cost you calls, time or retries that a better brief, doc, kit, seed or fixture would have saved, append one line to `docs/tracking/friction.md` in its shape before you return.

Return (short): the report path; the keys built; the parity rows appended (count); the suites re-run and their result lines; anything that blocked you.
