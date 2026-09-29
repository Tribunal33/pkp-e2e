<!--
{{feature}}         feature id, e.g. U03
{{feature_name}}    the feature's name
{{repo_root}}       absolute path of the pkp-e2e checkout
{{step}}            "step 5" (claim check) or "step 8" (test findings)
{{spec_path}}       docs/specs/U<nn>-<feature>.md
{{change_list}}     step 5: .reports/{{feature}}/claimcheck-merge.md, or with two or fewer chunks the chunk reports themselves; step 8: the test-findings file(s), block IDs listed. An H feature is folded in slices, one change-list or spec section per agent, appending to the same log
{{evidence_dirs}}   where the reports behind the blocks live, e.g. .reports/{{feature}}/cc-K<n>.md and .reports/{{feature}}/ccK<n>/; at step 8 the run logs and test-output folders
{{check_date}}      the date the claims were driven (step 5) or the suites ran (step 8), YYYY-MM-DD
{{declared_lines}}  the spec lines that must read as screenless so `--claims` tags them no-screen (the merge's "Declared lines" section, or with two or fewer chunks the orchestrator's own diff of the chunk headers' declared lines against the checklist's `no-screen` lines), or "none"
{{fold_log_path}}   .reports/{{feature}}/fold-log.md, step 5 only (an H feature's slices append to the same file); at step 8 there is no log
-->
You are the fold agent for feature {{feature}} "{{feature_name}}" in the pkp-e2e campaign (repo root: {{repo_root}}; all paths relative to it), dispatched under RUNBOOK {{step}}. Follow "The multi-app rules" and "What goes where". Read `docs/process/TEMPLATE.md` including "Write for a reader who has only this page", `docs/specs/GLOSSARY.md`, the change list, and the spec. The change list's blocks are in the shape of `docs/process/briefs/digest-block.md`.

Preserve the verified meaning — reword the phrasing, never the claim — except where the change list says a claim was wrong or imprecise; there the claim changes to what the screens showed.

The change list is raw material, not spec content. It overshoots: trivia, fixture accidents, other features' territory, optimistic severity. Include a finding only at the weight its user impact earns, in product voice; you may downgrade or drop anything. What does not clear the bar stays in `.reports/`, and a finding that belongs to another feature goes to that spec via a link. Where the change list quotes several apps' strings, all of them reach the spec; one is never kept as the universal one. You may open the one report behind a block when you need the detail.

Inputs:
- The spec: `{{spec_path}}`.
- The change list: {{change_list}}. The reports behind the blocks: {{evidence_dirs}}.
- Evidence date for the footnotes: {{check_date}}. At step 8 the run is the evidence: a new register entry reads `Basis: test run`, and its footnote cites the run date and what the screen showed.

Task, saving the spec after each section:
1. Fold every `corrects` and `new` block into the rule, row, scenario, footnote or register entry it names, at the weight its user impact earns, by pasting the block's Proposed line in the reader's words. A correction replaces a sentence; it does not append a clause to it. A block with a `Crash:` line makes an entry whose head and summary row carry the crash word (GLOSSARY "Findings register") and whose symptom says in screen words that the app failed; the status and the log line go to the footnote.
2. Every `undetermined` block, and every item you cannot resolve, becomes a ❓ entry with the stated lean, a marker on the claim, or the claim leaves the spec; never a plain claim.
3. Declared lines: {{declared_lines}}. Run `node docs/process/lint/lint-spec.mjs --claims {{spec_path}}` and check that each of them tags `no-screen`.
4. Re-read the Coverage section last. At step 5 it is TEMPLATE's draft table: a state or setting the change list introduced gets a classed row, `planned` or with a reason word, and a row the evidence reclasses is reclassed (the scenario writer spends the table after you). At step 8 it is the "Left out" list: a state the runs introduced becomes a bullet inside a scenario or a "Left out" item, and no `planned` remains. On a `verified` spec (a maintenance fold), behavior the change list adds to the body becomes a **Planned** item in its "Left out" list, and a register entry retired or ruled intended moves its "Register carries it" item to Planned (MAINTENANCE "Fix stale artifacts as you go"). Run `node docs/process/lint/lint-spec.mjs {{spec_path}}` and fix to zero.
5. Before returning, read every span you changed against TEMPLATE "Write for a reader who has only this page" and fix what fails; step 7's reader is the gate, not this self-read.
6. At step 5, write `{{fold_log_path}}`: one line per block saying what it became (rule text / register ID / footnote / marker / dropped, with the reason for any drop or downgrade); a "Suite-asserted claims touched" section (every changed claim a test could assert, from the merge or, with two or fewer chunks, from the chunk reports; each marked folded, softened or unchanged); a "left in `.reports/`" list; and a "Folded spans" section listing every passage you changed by section and rule, scenario or entry. At step 8 there is no log: return the register IDs added or changed.

You never drive a browser. Never edit the tests, `docs/process/seed-facts.md` or `docs/process/scenarios.md`; the orchestrator and the harness agent (step 4) handle those. Keep every existing ID, anchor and footnote letter stable; add new ones in the spec's own scheme. Never edit anything under `checkouts/`. Do NOT write to PROGRESS.md or docs/tracking/app-changes.md; return proposed content in your report instead. Commit nothing.

Return (short): the fold-log path (step 5); the register's counts (🐞 / ❓ / ✅) and the IDs added or changed; the lint result and whether every declared line tags `no-screen`; anything dropped or downgraded (block IDs only).
