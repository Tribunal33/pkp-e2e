<!--
{{feature}}            feature id, e.g. U03
{{feature_name}}       the feature's name
{{repo_root}}          absolute path of the pkp-e2e checkout
{{app}}                ojs, omp or ops
{{APP}}                the same in capitals, for the heading
{{spec_path}}          docs/specs/U<nn>-<feature>.md (claim-checked)
{{scenarios}}          the canonical scenario numbers this app runs, common plus app-specific
{{suite_path}}         apps/{{app}}/playwright/tests/U<nn>-<feature>.spec.js
{{page_objects}}       page object(s) to create or extend, with the path, and who else will reuse them; when two authors of one session extend the same shared page object, name one of them its owner here and tell the other to return its locator needs as proposed method names (parallel edits of one page object have overridden each other); when the owner's page object is not on disk yet, say whether the other author waits for its first version or builds on local helpers and switches (one landing mid-task cost a second debug pass, U10, U13, U16)
{{example_suites}}     one or two shipped suites in apps/{{app}}/playwright/tests/ to copy the shape from
{{feature_facts}}      feature-specific facts step 8 needs that are not screen facts (a scenario that ends the session, a browser dialog a step raises), or "none"
{{situation}}          fresh: a new suite (RUNBOOK step 8); or revision: the suite exists (RUNBOOK "Revising a shipped feature"), naming the scenario numbers added and the scenarios whose bullets grew
{{fleet_json}}         .reports/{{feature}}/fleet.json
{{agent}}              PROBE_AGENT for any throwaway check, e.g. t{{app}}
{{output_dir}}         .reports/{{feature}}/test-{{app}}-output
{{green_log}}          .reports/{{feature}}/test-{{app}}-green.log
{{findings_path}}      .reports/{{feature}}/test-{{app}}-findings.md
{{frame}}              docs/process/briefs/frame.md, pasted verbatim
-->
{{frame}}

You are the test author for the **{{APP}}** suite of feature {{feature}} "{{feature_name}}" in the pkp-e2e campaign (repo root: {{repo_root}}; all paths relative to it). Follow RUNBOOK step 8 and "The multi-app rules". Read `docs/process/PRINCIPLES.md`, `docs/process/harness.md`, `docs/process/patterns.md`, `docs/process/scenarios.md`, `docs/process/seed-facts.md`, `docs/process/users.md`, the spec, and the feature's `screen-notes.md`.

The spec is `{{spec_path}}`; read its body and only the footnotes your scenarios cite, not the whole file. Scenarios this app runs: {{scenarios}}. Feature facts for step 8: {{feature_facts}}.

Situation: {{situation}}

Deliverables:
1. `{{suite_path}}`, in the shape of {{example_suites}}, following PRINCIPLES: one test per scenario, its title opening with the scenario number (`S3: …`). Every absence a scenario states ("nothing else", "no list", "stays") is asserted with a settled, auto-waited read and a positive control, never left unasserted (PRINCIPLES M6); a contradiction is a finding under deliverable 4, not a dropped assertion. In a revision, extend the existing suite: a test per scenario added, an assertion per bullet added to a scenario already tested, every title opening `S<n>` (the legacy `scenario <n>` titles renamed, existing numbers kept), the header's "not covered" block cut to the register IDs (the spec's Coverage section is the record of the rest); `node docs/process/lint/lint-spec.mjs --tests {{spec_path}}` reports zero for this app before you return.
2. Page objects: {{page_objects}}.
3. Run the suite green once against the live fleet: `npx playwright test -c configs/{{app}}.config.js {{suite_path}} --output {{output_dir}} --reporter=list` (harness.md says how the config starts its worker servers). A serial spec runs alone with `--project={{app}}-serial --no-deps` on a warm install, and its `@solo` tests only in a second command with `--project={{app}}-solo --no-deps` (the config refuses the two projects in one `--no-deps` command); never run a whole project, and keep every run under about four minutes (harness.md "Running"). Save the green run's log as `{{green_log}}`.
4. A test that contradicts the spec is returned as step 8 says: a digest block in the shape of `docs/process/briefs/digest-block.md` (ID `T-{{app}}-<n>`; Evidence: the run-log pointer and the screen record, which is the run's `error-context.md` aria snapshot because the config takes no screenshot on failure; it is the fixture `page`'s, so a failure on a page the test opened itself (`asUser`, `browser.newContext`) is read from the assertion's received value in the log; and Playwright empties `{{output_dir}}` at the next run, so write the block before rerunning) in `{{findings_path}}`. The run is the evidence the fold uses; nothing is re-driven, so the block quotes what the screen showed. Never edit a test to pass a claim the app disproves. An app defect that blocks green is worked around and returned as a proposed `app-changes.md` row.
5. A scenario whose setting or state has no scenario key is returned as a harness need (RUNBOOK step 4), never driven through a settings screen in the test.

Read `.reports/{{feature}}/screen-notes.md` first and append what you learn by hand, in the kit's one-line shape prefixed with your agent id (a test never imports the kit); grep the sibling `screen-locators.md` for a locator another agent found, and the kept check scripts under `shared/playwright/checks/{{feature}}/` for the screen you are on (grep them, never read one whole). Both exist only for features driven with the kit (2026-08-25 on); when neither is there, `screen-notes.md` is the record and nothing else is searched. Fleet ports and probe-server URLs are in `{{fleet_json}}`; never start a server; the probe servers are running.

Any throwaway check you drive by hand uses the probe kit with `PROBE_FEATURE={{feature}} PROBE_AGENT={{agent}}`; tests never import the kit.

Do NOT write to PROGRESS.md or docs/tracking/app-changes.md; return proposed content in your report instead. Never edit the spec, PRINCIPLES or the harness docs. Never edit anything under `checkouts/`. Commit nothing. Kill only browser or PHP processes you started yourself. If anything in this task cost you calls, time or retries that a better brief, doc, kit, seed or fixture would have saved, append one line to `docs/tracking/friction.md` in its shape before you return.

Return (short): the suite path and test count; the page-object path(s) and public method names; the green-run log path and its summary line; the findings file (block count, or none); harness needs (missing passthrough key families, or none); anything that blocked you; the security routing count.
