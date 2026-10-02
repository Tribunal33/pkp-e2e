# On one-step pages such as "Review & create account", Tab stops on two invisible buttons that do nothing

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; one-step decision pages only, as 3.4 has no role invitations)
  - 3.3: none (code; no step-by-step pages)
- **Introduced** `pkp/ui-library#176` for `pkp/pkp-lib#7265` · [d02248dd](https://github.com/pkp/ui-library/commit/d02248ddb40c4fb815c24b820a331d6f056f5284) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Some pages walk the user through a form step by step, and some of them
end up with a single step. On those pages, a keyboard user pressing Tab
stops twice on buttons nobody can see: the step's own button, clipped
to nothing, and a "show all steps" button, also clipped and hidden from
screen readers. No focus outline shows, and Enter changes nothing.

Two kinds of page show it. An invited person with an account opens the
email's "Accept Invitation" link and lands on "Review & create
account". An editor opens a one-step editorial decision page: "Decline
Submission" in the submission stage, any recommendation (accept,
decline, revisions, resubmit), reverting a decline, or sending a
submission back from copyediting or production.

Nothing is lost: two more Tabs reach the page's own buttons. The fix is
a few lines in one shared ui-library component.

## Impact

- **Lost.** Nothing: two invisible stops in the Tab order.
- **Who.** Keyboard and screen-reader users: invited people with an
  account, and editors on the one-step decision pages above. The focus
  lands where nothing is visible (WCAG 2.4.7, Focus Visible), and the
  second button sits inside an `aria-hidden` block, so it has no
  accessible name (WCAG 4.1.2, Name, Role, Value).
- **Way round.** Press Tab twice more.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`, with ORCID off, as it is in the dataset (with
  ORCID on, the acceptance page has two steps).
- Outgoing mail caught where it can be read (a mail catcher such as
  Mailpit, or the log mailer), for step 4: the dataset's users all have
  `@mailinator.com` addresses.

The invitation acceptance page:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`), press
   "Invite to a role", type `dbuskins@mailinator.com` and press "Search
   User".
3. In the empty role row choose "Author", today as "Start Date" and
   "Does not appear on the masthead"; press "Save And Continue", then
   "Invite user to the role", then "View All Users".
4. Signed out (another browser, 1280 pixels wide), open the "Accept
   Invitation" link of the email "You are invited to new roles" sent to
   dbuskins@mailinator.com. The page "STEP 1 - Review & create account"
   opens.
5. Click an empty spot at the top left of the page, then press Tab
   repeatedly, noting each stop.
6. On the fifth stop press Enter.

A one-step decision page:

7. Sign in as `dbarnes`. Open submission 4 "Computer Skill Requirements
   for New and Existing Teachers" on OJS, submission 3 "The Political
   Economy of Workplace Injury in Canada" on OMP, or submission 1 "The
   influence of lactation on the quantity and quality of cashmere
   production" on OPS.
8. Press "Decline Submission". The decision page has one step, "Notify
   Authors".
9. Click an empty spot at the top left of the page, then press Tab past
   the header's links and buttons until the focus reaches the step,
   noting each stop.

**Expected.** Every stop is a visible control. On the acceptance page,
after the journal's, press's or server's name, Tab goes to "Cancel" and
then "Accept And Continue to OJS" ("… to OMP", "… to OPS"). On the
decision page, after the header, Tab goes into the "Notify Authors"
email form.

**Observed.** The same on all three applications (OJS's names shown):

```
Acceptance page, step 5:
  Skip to main content · Skip to main navigation menu · Journal of Public Knowledge ·
  "1 Review & create account"  (a button clipped to nothing) ·
  a button clipped to nothing, inside an aria-hidden block, text "{$current}/{$total} steps" ·
  Cancel · Accept And Continue to OJS
Step 6: nothing changes on the page
Decision page, step 9 (the stops reaching the step):
  "1 Notify Authors"  (a button clipped to nothing) ·
  a button clipped to nothing, inside an aria-hidden block, text "Show all steps"
```

## Cause

ui-library's `<Steps>` component
([`Steps.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/components/Steps/Steps.vue))
hides its row of step buttons from sight when there is only one step,
by giving the row the class `-screenReader` (`steps.length === 1`),
which clips it to nothing. Two things then go wrong inside that row.

First, the one step is drawn as a `<button>`, as a started step always
is. It takes keyboard focus, shows nothing, and Enter only reopens the
step already open.

Second, the component still measures the clipped row to decide whether
the steps fit:

```js
maybeToggleCollapsedView() {
	const totalWidth = this.$refs.buttons.offsetWidth;   // the clipped row: 1 px
	...
	this.collapsed = allStepsWidth > totalWidth;          // so true once the step is drawn
}
```

The first check, when the component mounts, runs before the step is
drawn and does not collapse. Drawing the step then changes the
component's size, its resize listener (`element-resize-event`) checks
again, and a 1-pixel row never fits. The component switches to its
collapsed view, which adds, inside the same clipped row, a block marked
`aria-hidden="true"` with the progress ("1/1 steps") and a button that
shows or hides the other steps. That button takes focus too, cannot be
seen or heard, and has no other steps to show. The collapsed view was
made for a row of several steps on a narrow screen.

Reach: every `<Steps>` that ends up with one step at run time.

- The invitation acceptance page for an existing account, with ORCID
  off or the account's ORCID already verified
  (`AcceptInvitationStep::getSteps()`).
- Decision pages that always have one step when the submission has an
  author account: `InitialDecline` ("Decline Submission" in the
  submission stage), `RevertDecline` and `RevertInitialDecline` (OMP's
  internal-review revert too), `BackFromCopyediting` and
  `BackFromProduction`.
- Every recommendation page, whose only step is "Notify Editors"
  (`IsRecommendation::getSteps()`): recommending accept, decline,
  resubmit or revisions, OMP's internal-review recommendations and its
  recommendation to send for external review.
- Decisions whose email steps drop out when the submission has no
  author account or no reviewers, leaving one step: for example a
  decline in review with no reviewers, or sending for review or to
  production with no author account (read in the code).
- The invitation pages' button text "{$current}/{$total} steps" is a
  separate fault: those pages pass the wrong text
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A7-invitation-steps-raw-labels.md)).
- Left out: on a narrow screen with several steps the collapsed view is
  right, but its button is also inside the `aria-hidden` block, so a
  screen reader reaches it with Tab and hears nothing. How that toggle
  should be announced is a decision of its own.

## Proposed fix

Treat a one-step list as what it is, a label for screen readers: draw
its step as the plain label the component already uses for steps not
yet started, and never collapse it. The diff is against the
application's root
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accept-page-hidden-steps-button/fix.diff)):

```diff
-					<template v-if="startedSteps.includes(step.id)">
+					<template v-if="steps.length > 1 && startedSteps.includes(step.id)">
 ...
 		maybeToggleCollapsedView() {
+			if (this.steps.length < 2) {
+				this.collapsed = false;
+				return;
+			}
 			const totalWidth = this.$refs.buttons.offsetWidth;
```

The rule lives in the component, so it covers every page above. A
screen reader still finds the list and its one step's name ("1 Review &
create account"); only the two stops that lead nowhere go.

Tried on `main`, on all three applications, with the JavaScript
rebuilt: on "Review & create account" Tab now goes from the context's
name straight to "Cancel" and "Accept And Continue to …", the list
still holds "1 Review & create account", and the one-step "Decline
Submission" page has no hidden stop either. A decision of two steps
("Send for Review" on OJS, "Send to Internal Review" on OMP) loaded at
1440 pixels and narrowed to 375 still collapses to "1/2 steps" with its
"Show all steps" button, as without the fix; OPS has no decision of two
steps.

**Alternatives**

- `v-if="collapsed && steps.length > 1"` on the controls block alone:
  removes the second stop but keeps the first, the clipped step button.
- `tabindex="-1"` on both buttons: hides the stops but keeps markup
  that does nothing.

**What goes with it**

- It does not conflict with the fix that moves the component's first
  width check
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A10-phone-wizard-step-rail-not-collapsed.md));
  either can land first.
- Backport: the diff applies on `stable-3_5_0`, its second part at an
  offset. 3.4's Vue 2 `Steps.vue` has the same template condition and
  method, and the same change applies there by hand.
- Guard: an e2e check, on the acceptance page and on a one-step
  decision page, that no focusable element sits inside the clipped row
  or an `aria-hidden` block. A ui-library component test would need a
  real browser: ui-library has no component-mounting setup, and jsdom
  reports every width as 0, so the collapse never happens there.

Small: one condition in the template and four lines in one method of
one component.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/accept-page-hidden-steps-button/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accept-page-hidden-steps-button/walk.js)
  takes steps 1 to 6, and with the argument `neighbour` steps 7 to 9
  and the two-step check above:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/accept-page-hidden-steps-button/walk.js [neighbour]`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 3788b55 (2026-10-02). Each stop's text, clipping and
  `aria-hidden` ancestor were read in the browser; no screen reader was
  used.
- Tips: `lib/ui-library` 64d67363 (OJS `main`), 280f98c5 (OMP and OPS
  `main`), d4e01883 (`stable-3_5_0`), ee684b34 (`stable-3_4_0`),
  96959f9e (`stable-3_3_0`).
- Code reads: `Steps.vue` and `Step.vue` on `main`, `stable-3_5_0` and
  `stable-3_4_0`; the decision types' `getSteps()` in pkp-lib, OJS, OMP
  and OPS; `AcceptInvitationStep::getSteps()`; 3.4's
  `templates/decision/record.tpl`. `stable-3_3_0` has no `Steps`
  component.
- Introduced: the `-screenReader` row, the step button and the
  aria-hidden controls are all in d02248dd, the component's first
  version; dba48255 (`pkp/pkp-lib#7760`, 2022-03-16) reworked the width
  check without changing this.
- Unverified: 3.4 on screen; what a screen reader says on either stop.
