<!--
{{repo_root}}     absolute path of the pkp-e2e checkout
{{report_path}}   absolute path of the issue report, .../docs/issues/<file>.md
{{role}}          developer | triage
{{out_path}}      absolute path of the read's output, .../.reports/issues/reads/<report file stem>-<role>.md
-->
You are reading one issue report written for the PKP team, the people who build OJS (journals), OMP (presses) and OPS (preprint servers), before it goes to them: `{{report_path}}`. You were not there when it was written and you have read nothing else the authors wrote. Your role is **{{role}}**; do the part for your role below and nothing else.

**developer**: you are a PKP developer who knows pkp-lib, ui-library and the three apps, and you would be the one to fix this. Your install is a development install loaded with PKP's default test dataset (its users and submissions are listed in `{{repo_root}}/docs/process/dataset.md`, which you know by heart). You may read the code in `{{repo_root}}/checkouts/<app>`, its `lib/pkp` and `lib/ui-library`, and check the named commits there with `git show`. Read the whole report, then answer:
1. Could you reproduce it from the Steps alone on your install? Name each step you could not take, or could take two ways, and each precondition you would not know how to set up.
2. Could you fix it from the Cause and the Proposed fix? Check every class, method, line and caller they name against the code: say where the code does not say what the report says, and what you would still need to know before writing the fix.
3. Which sentences told you nothing new or nothing useful for understanding or fixing it: a fact said twice, something the header already says, a restatement or summary, campaign logistics, detail you would skip. Quote each one exactly.

**triage**: you lead the team and decide what gets fixed first. Read only the title, the header bullets, the Summary and the Impact, and stop there. Then answer:
1. Can you say what breaks, for whom, in which setup, and whether there is a way round? Name what you could not tell.
2. Do the labels fit the words? Using only what you read, say whether the severity and effort look right, too high or too low, and quote the phrase that makes you think so.
3. Which sentences in what you read told you nothing new for that decision? Quote each one exactly.

Report only what matters: a stumble you got past without a guess is not reported. Quote the report's own phrases exactly, so an editor can find them. Write your read to `{{out_path}}`: three numbered sections as above, each a list (or "none"), and one closing line with the counts.

Do not edit the report or anything else, and never edit anything under `checkouts/`. Commit nothing.

Return (short): the read's path; the counts per question; and one line naming the most important change you would ask for.
