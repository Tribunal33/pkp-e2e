# On a press site's site-wide Register page, each press's privacy consent box shows before any role is ticked

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#3964` and `pkp/ojs#2086` for `pkp/pkp-lib#3836` · [15c1290474](https://github.com/pkp/pkp-lib/commit/15c1290474b5597a0cb0e005d2ee313eaf139181), [e3c0072064](https://github.com/pkp/ojs/commit/e3c0072064d6fbcb68a618d633b17951d91a712f) · committed 2018-08-02, merged 2018-08-28 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U02 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#omp2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the site-wide Register page of a press installation, the line "Yes, I
agree to have my data collected and stored according to this press's
privacy statement." is on screen under every press from the moment the
page opens, before the visitor has ticked any role. Ticking and
unticking a role under the press changes nothing. On a journal or
preprint server site the line under each journal or server stays hidden
until one of its roles is ticked, and goes again when the role is
unticked.

The visitor is asked to consent for presses they never chose, though
the consent is only required for a press whose role is ticked.

Every press shows the line unless its privacy statement has been
emptied, since a new press gets a default one.

## Impact

- **Lost**: nothing. A box ticked for a press without a role has no
  effect, and the account is created as usual.
- **Who**: a visitor on the site-wide Register page. On a site with
  several presses that is the page the site's own "Register" opens, with
  one consent box per press. On a site with one press the header's
  "Register" opens the press's own page, so the site-wide page is
  reached only by typing its address.
- **Way round**: none needed; a visitor can leave the boxes of presses
  they do not join unticked.

Low: the page asks for more than it needs and the registration goes
through. It would be medium if a box shown early could block or change a
registration, which it cannot.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP. Its press, "Public
  Knowledge Press", has the default privacy statement.
- `sitewide_privacy_statement = Off` in the `[general]` section of
  `config.inc.php` (the default).

Steps:

1. Signed out, type the site-wide Register page's address,
   `/index.php/index/en/user/register`. (On a site with one press the
   header's "Register" opens the press's own Register page, so the
   address is typed.)
2. Under "Which presses on this site would you like to register with?",
   look at the block for "Public Knowledge Press", ticking nothing.
3. Tick "Reader" under "Public Knowledge Press".
4. Untick "Reader".

**Expected**: at step 2 the block shows the press's name and the
"Reader" and "External Reviewer" boxes only. The line "Yes, I
agree to have my data collected and stored according to this press's
privacy statement." appears at step 3 and goes again at step 4.

**Observed**: the line and its box are on screen below "Reader" and
"External Reviewer" at step 2, before anything is ticked, and stay there
through steps 3 and 4.

Control: the same steps on OJS and OPS show the Expected. The line,
naming a journal or a server, appears when "Reader" is ticked and goes
when it is unticked.

## Cause

The per-press line is rendered by the shared template
`lib/pkp/templates/frontend/components/registrationFormContexts.tpl`
(line 70) under every context that has a privacy statement, as
`<div class="context_privacy">`, in the page from the start. The
template gives it the class `context_privacy_visible` only when the page
is reloaded with one of the context's roles already ticked (after a
refused submission). Hiding the line and toggling it as roles are ticked
is left to the theme.

OJS's and OPS's default theme do both. `plugins/themes/default/styles/pages/register.less`
parks `.context_privacy` off-screen (`position: absolute; left: -9999px`)
and puts `.context_privacy_visible` back in the flow. `plugins/themes/default/js/main.js`
adds or removes `context_privacy_visible` when a box in that context's
`.roles` fieldset changes ("Toggle display of consent checkboxes in
site-wide registration"). OMP's default theme has neither, so the line
keeps its normal place in the page whatever is ticked.

The template and OJS's theme pieces came together for `pkp/pkp-lib#3836`,
in pkp-lib 15c1290474 and OJS e3c0072064. OPS was later forked from
OJS and has the same code. No OMP change followed; `git log -S
context_privacy` finds nothing in OMP's history. The design asked for in
`pkp/pkp-lib#3870`, which led to `#3836`, is a per-context statement
"only being displayed (and requiring agreement when) … the user checks
off a role in that context" (asmecher, 2018-07-27). The server check,
`RegistrationForm::validate()`, follows that design on every app: it
requires the consent only for contexts of the ticked roles.

Reach:

- The site-wide Register page of OMP, every press with a privacy
  statement (walked). The press's own Register page is untouched: its
  single consent box is meant to show from the start (walked).
- A press that has closed registration is still listed on the page,
  with no role to tick
  ([U03-A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U03-A4-closed-journal-listed-on-roles-tab.md),
  a separate fault). On OMP that press's block shows the consent box
  with no role above it. With the fix the box stays hidden in that
  block, since no role there can be ticked, as on OJS and OPS (code).
- Nothing else in pkp-lib, OJS, OPS or OMP reads `context_privacy` or
  `contextOptinGroup` (code). OMP's default theme has no template
  overrides, so the shared template is the only one rendering the line.

## Proposed fix

Give OMP's default theme the same two pieces as OJS's and OPS's: the
`.context_privacy` and `.context_privacy_visible` rules in
`plugins/themes/default/styles/pages/register.less` and the toggle in
`plugins/themes/default/js/main.js`, copied from OJS. OJS's
`margin-bottom: 0` on `.roles` is left out: it only sets the spacing
above the line once shown, and is not part of the fault
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-shown-early/fix.diff)):

```diff
--- a/plugins/themes/default/js/main.js
+++ b/plugins/themes/default/js/main.js
@@ -63,6 +63,20 @@
 		e.chartOptions.elements.bar.backgroundColor = 'rgba(0, 122, 178, 0.6)';
 	});
 
+	// Toggle display of consent checkboxes in site-wide registration
+	var $contextOptinGroup = $('#contextOptinGroup');
+	if ($contextOptinGroup.length) {
+		var $roles = $contextOptinGroup.find('.roles :checkbox');
+		$roles.change(function() {
+			var $thisRoles = $(this).closest('.roles');
+			if ($thisRoles.find(':checked').length) {
+				$thisRoles.siblings('.context_privacy').addClass('context_privacy_visible');
+			} else {
+				$thisRoles.siblings('.context_privacy').removeClass('context_privacy_visible');
+			}
+		});
+	}
+
 	// Show or hide the reviewer interests field on the registration form
 	// when a user has opted to register as a reviewer.
 	function reviewerInterestsToggle() {
--- a/plugins/themes/default/styles/pages/register.less
+++ b/plugins/themes/default/styles/pages/register.less
@@ -64,6 +64,19 @@
 				line-height: @line-sml;
 			}
 		}
+
+		.context_privacy {
+			position: absolute;
+			left: -9999px;
+			padding: @half 0;
+			font-size: @font-sml;
+			line-height: @line-sml;
+		}
+
+		.context_privacy_visible {
+			position: relative;
+			left: auto;
+		}
 	}
 
 	// Styles for form error list, which is still tied to a template shared by
```

Tried on `main`, OMP: the line is then off-screen at step 2, in view at
step 3 and off-screen again at step 4. With and without the fix, the
press's own Register page shows its consent box from the start, and a
site-wide registration refused with "Reader" ticked and the press's box
unticked comes back with "Reader" ticked and the line in view.

This is a proposal; the team decides.

**Alternatives**:

- Hide the line in the shared template (a `hidden` attribute and a
  script in pkp-lib), so every theme gets it. That is a new pattern for
  one element, and it would duplicate what OJS's and OPS's themes
  already do.
- Hide it with `display: none` rather than off-screen, which also keeps
  a hidden box out of the keyboard's tab order. That is a change to all
  three themes and a separate question (not walked).

**What goes with it**:

- No data repair, and nothing changes for an API client or a plugin.
- Backport: the diff applies as it stands to OMP's 3.5, 3.4 and 3.3
  branches.
- The press's refusal when that box is left unticked prints a raw code
  on OMP, a separate fix in OMP's locale file
  ([U02-OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U02-OMP1-press-site-register-consent-raw-codes.md)).
- Test: an e2e scenario that ticks and unticks a role on a press's
  site-wide Register page and reads where the consent line is.

Small: two blocks copied from OJS into one theme, with an e2e check.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-shown-early/walk.js)
  (helpers in its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-shown-early/lib.js)
  and in
  [press-site-register-consent-raw-codes/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-raw-codes/lib.js))
  takes steps 1–4 on OJS, OMP and OPS and reads, at each step, the
  line's classes, computed position and on-screen rectangle. Its
  `neighbour` mode reads the press's own Register page and a site-wide
  registration refused for a missing press consent. Each run starts from
  an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-site-register-consent-shown-early/walk.js [walk|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The walks ran in Chromium on PostgreSQL, on pkp/datasets 566bb1f
  (2026-10-03). On `main` and 3.5, OMP's line was in the page flow with
  no `context_privacy_visible` class at every step; OJS's and OPS's was at
  `left: -9999px` before the tick and after the untick, and in view
  with the class after the tick. No request failed and no page script
  failed. The fix and the neighbour were walked on `main`, OMP only (the
  fix touches no other app).
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib 771474347e (OJS)
  and cf3f984335 (OMP, OPS). 3.4: OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b; pkp-lib 767353f4fe. 3.3: OJS ac77c9fb35, OMP 8e72fc8836,
  OPS c5532e2161; pkp-lib ac3fa73402.
- Code reads for 3.5 (beside the walk), 3.4 and 3.3: pkp-lib's
  `registrationFormContexts.tpl` renders the line with the same
  `context_privacy` class on every branch. OJS's and OPS's
  `plugins/themes/default/js/main.js` and `styles/pages/register.less`
  hold the toggle and the rules on every branch; OMP's hold neither,
  nor does any other file in OMP's tree. The diff applies
  without offset to OMP's three stable branches (`patch --dry-run` on
  copies of the two files).
- Introduced: `git log -S context_privacy_visible` in OJS and OPS leads
  to e3c0072064, and in pkp-lib's templates to 15c1290474; GitHub
  names their PRs `pkp/ojs#2086` and `pkp/pkp-lib#3964`. No OMP pull
  request names `#3836`.
- Upstream search: pkp/pkp-lib, pkp/omp and pkp/ui-library, by the
  symptom's words and by `context_privacy` and
  `registrationFormContexts`. `pkp/pkp-lib#3870` and `#3856` discuss
  the per-context consent's design and validation, not where the line
  shows.
- Not walked: themes other than OMP's default, and a site with several
  presses (the same template loop renders one block per press).
