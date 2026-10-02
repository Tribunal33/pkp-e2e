# Friction — what made an agent's task harder than it needed to be

What cost a screen-driving agent calls, time or retries that a better
brief, doc, kit, seed or fixture would have saved; that agent appends a row
at the end of its task. The housekeeping session folds the rows and
deletes them under MAINTENANCE "The housekeeping session".

One line per entry, appended at the end, in this shape:

`YYYY-MM-DD · U<nn>, sync or issues · <role and agent id> · <what cost you calls, time or retries> · <what would have helped>`

Facts only, the same quarantine as everywhere else (nothing
security-shaped, no credentials).

## Entries
2026-10-02 · issues · security verification probe sec (issues-u37r4) · one response lost: step 1 says "read the whole private file", and printing it whole into the agent's output stopped that response, so the entry was found afterwards by heading and date with `grep -n` · the probe brief could say to find the entry with `grep -n` on its headings and the date, and edit it with a script, never printing the file whole
2026-10-02 · issues · issue reporter u37r9 (U37 A2, A21) · three OJS walk attempts lost to a 422 on saving the discussion the steps edit: the server refuses a discussion with fewer than two participants ("At least two participants are required for a discussion."), and neither the register nor the page object says so, so a walk that saves with the window's default participant (the writer alone) fails · TasksDiscussionsPages `ItemWindow` (or patterns.md "UI realities") could note that a discussion save needs a second participant ticked, naming one per dataset submission
2026-10-02 · issues · issue reporter u37r15 (U37 A31) · a lib.js helper written for an on-screen "Send To Production" because the OJS and OMP copyediting page objects export different shapes (OJS `WorkflowPage`/`DecisionPage`/`recordDecision`, OMP free functions), and the OMP "Edit" step lost to the auto-added discussion refusing one added participant on a submission that offers only one besides `dbarnes` · a shared decision-wizard helper (open the workflow, press the decision, Continue to "Record Decision", record) in `shared/playwright/pages/`, and dataset.md naming per app a Copyediting submission with two non-editor participants at Production
