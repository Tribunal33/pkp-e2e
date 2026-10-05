# Brief templates

One file per role of the RUNBOOK loop, one for the maintenance loop's
regression reader (`regression-read.md`, MAINTENANCE step 5), one for
the issue reporter (`issue-report.md`, MAINTENANCE "Issue reports") and its two role
reads of a written report (`issue-read.md`, developer and triage), one for a
flake class's diagnostician (`flake-diagnosis.md`, MAINTENANCE "Standing
duties"), plus two
shared blocks the templates point at or take as a slot (`frame.md`,
`digest-block.md`). The orchestrator
renders a brief by copying the role's template and filling its slots. It
never writes a brief from scratch, and it never writes rules into one.

## How to render a brief

1. Copy the template for the role. The HTML comment at its top lists every
   `{{slot}}` the file uses and what goes there. Fill every one; a brief
   with an unfilled slot is not sent. Delete the comment from the rendered
   brief.
2. Add only the feature-specific facts the RUNBOOK step names for that
   role: which chunk, which lines, which blocks, which other agent runs on
   the fleets at the same time. A fact about a screen (a locator, a dialog
   on the way out, a wait that hangs) belongs in
   `.reports/<feature>/screen-notes.md`, never in a brief; the template
   already points the agent there.
3. The orchestrator adds no rule when rendering. The templates themselves
   carry each role's operating rules, under maintainer review; a missing
   rule is fixed in the template, never patched into a brief.
4. Keep the verbatim blocks as they are: the Frame (`frame.md`, filled into
   the frame slot of claim-check, harness, test-author, security-verify
   and issue-report),
   the PROGRESS and app-changes sentence, "Commit nothing.", the friction
   sentence (`docs/tracking/friction.md`; only the templates for agents
   that drive screens carry it), the `checkouts/` sentence, and "Preserve
   the verified meaning" in the rewrite and fold templates.
5. The "Return (short)" block is what the agent sends back: pointers and
   counts, never findings. Do not widen it.
