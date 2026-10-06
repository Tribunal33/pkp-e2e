# Screen readers announce the role invitation pages' list of steps as "##invitation.wizard.completeSteps##"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no role invitation pages)
  - 3.3: none (code; no role invitation pages)
- **Introduced** `pkp/ui-library#362` for `pkp/pkp-lib#9658` · [88070798](https://github.com/pkp/ui-library/commit/88070798fdf145ca1313acc1d5b4354e385a8942) · 2024-06-13 · Ipula Indeewara (ipula); the acceptance page copied it in `pkp/ui-library#358` · [6940ab2b](https://github.com/pkp/ui-library/commit/6940ab2b96774c406178b25c94961091d86d506d) · 2024-06-27
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the page where a manager invites someone to a role, and on the page
where the invited person accepts, a screen reader names the list of
steps "##invitation.wizard.completeSteps##", an untranslated code. The
editorial decision pages name the same kind of list "Complete the
following steps to take this decision". The small button beside the
list, which opens a collapsed list of steps, has the hidden text
"{$current}/{$total} steps" instead of "Show all steps".

The steps themselves are read normally and every button works, so
nothing is lost. The code is the same in every language, English
included, because no language defines the key.

The fix is one line in each of the two pages and two new English
texts, but in two repositories, pkp-lib and ui-library, so each
application also needs its submodules updated and its JavaScript
rebuilt.

## Impact

- **Lost.** Nothing: the list's accessible name is a code.
- **Who.** Managers and invited people who use a screen reader, each
  time they open either page. The button's text is never shown on
  screen: sighted users see only "1/3 steps" and a chevron when a list
  collapses. A screen reader may read it when the button takes keyboard
  focus, which on the one-step acceptance page it always can.
- **Way round.** None needed; the steps inside the list are named.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.
- Outgoing mail caught where it can be read (a mail catcher such as
  Mailpit, or the log mailer), for step 5: the dataset's users all have
  `@mailinator.com` addresses.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and
   press "Invite to a role".
3. Listen to the list of steps ("1 Search User", "2 Enter details", "3
   Review & invite for roles") with a screen reader, or inspect the
   list's accessible name in the browser's accessibility tree.
4. Type `dbuskins@mailinator.com`, press "Search User", and in the empty
   role row choose "Author", today as "Start Date" and "Does not appear
   on the masthead". Press "Save And Continue", "Invite user to the
   role" and "View All Users".
5. Signed out (another browser), open the "Accept Invitation" link of
   the email "You are invited to new roles" sent to
   dbuskins@mailinator.com. The page shows one step, "Review & create
   account".
6. Inspect the list's accessible name. Then, in the page's HTML (the
   browser's inspector), read the hidden text of the button beside the
   list, next to "1/1 steps".

**Expected.** A list name in words, and "Show all steps" as the
button's text, as on a decision page: sign in as `dbarnes`, open
submission 4 on OJS, 3 on OMP or 1 on OPS, and press "Decline
Submission"; its list is named "Complete the following steps to take
this decision".

**Observed.** The same on all three applications:

```
Step 3: list "##invitation.wizard.completeSteps##"
Step 6: list "##invitation.wizard.completeSteps##"
        button's hidden text: "{$current}/{$total} steps"   (beside "1/1 steps")
```

## Cause

ui-library's two invitation pages give the `<Steps>` component the same
block of texts
([`UserInvitationPage.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/pages/userInvitation/UserInvitationPage.vue#L12-L14),
[`AcceptInvitationPage.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/pages/acceptInvitation/AcceptInvitationPage.vue#L7-L9)),
and two of the three are wrong:

```vue
:label="t('invitation.wizard.completeSteps')"
:progress-label="t('common.showingSteps')"
:show-steps-label="t('common.showingSteps')"
```

- `label` becomes the list's `aria-label`. No locale file of pkp-lib or
  the applications, in any language, has ever defined
  `invitation.wizard.completeSteps`. The key is in the list of texts
  each application's build collects from ui-library
  (`registry/uiLocaleKeysBackend.json`), so the server fills it for the
  browser with `Locale::get()`. For a missing key
  `Locale::translate()` returns the key wrapped in `##`, in every
  language and with no fallback to English.
- `show-steps-label` is the hidden text of the button that opens a
  collapsed list. It is given `common.showingSteps` ("{$current}/{$total}
  steps"), the progress text. `Steps.vue` fills in the two placeholders
  only for the visible progress ("1/3 steps"), so the button gets them
  as they are. The two other users of `<Steps>`, the submission wizard
  (`templates/submission/wizard.tpl`) and the decision pages
  (`templates/decision/record.tpl`), pass `common.showAllSteps` ("Show
  all steps") there, and their own `*.completeSteps` texts as the
  label.

The button is drawn only when the list collapses. On the multi-step
manager's page that is when a width check finds the steps do not fit a
narrow window. On the one-step acceptance page it always happens, which
is a separate fault
([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A7-accept-page-hidden-steps-button.md)).
Its text sits in a screen-reader-only span inside a block marked
`aria-hidden`, so it is not in the accessibility tree; whether a screen
reader reads it when the button takes focus was not checked with a
reader.

Reach:

- The same two pages show `t('invitation.wizard.errors')` as a warning
  on a review step with errors, another key no locale defines (read in
  the code; a review step with errors was not reached on screen).
- Not this fault: `##userAccess.management.options##` on the Users &
  Roles rows
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A5-users-list-row-button-raw-key.md)).

## Proposed fix

Give the two keys the pages already use an English text in pkp-lib, and
pass the existing "Show all steps" text to the button. The diff is
against the application's root
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-steps-raw-labels/fix.diff)):

```diff
 # lib/pkp/locale/en/invitation.po
+msgid "invitation.wizard.completeSteps"
+msgstr "Complete the following steps for this role invitation"
+
+msgid "invitation.wizard.errors"
+msgstr "There are one or more problems that need to be fixed before you can continue. Please review the information below and make the requested changes."
 # lib/ui-library/src/pages/userInvitation/UserInvitationPage.vue
 # lib/ui-library/src/pages/acceptInvitation/AcceptInvitationPage.vue
-			:show-steps-label="t('common.showingSteps')"
+			:show-steps-label="t('common.showAllSteps')"
```

That is one line in each of the two pages and two new English texts.
One label serves both pages, which share the key: "for this role
invitation" fits the manager setting the invitation up and the person
accepting it. The errors text follows `submission.wizard.errors`.

`common.showAllSteps` reaches the browser only once the application's
build has added it to `registry/uiLocaleKeysBackend.json`; ui-library's
`t()` returns an empty text for a key the page was not given. The
normal build after the ui-library update does this.

Tried on `main`, on all three applications, with the JavaScript
rebuilt: both pages' lists are named "Complete the following steps for
this role invitation", no `##` code is left on either page, and the
acceptance page's button reads "Show all steps".

**Alternatives**

- A key per page ("… to invite a user to a role", "… to accept this
  invitation"): a little more precise, at the cost of changing the two
  `label` lines too.
- Reuse `editor.decision.completeSteps`: wrong words ("take this
  decision").

**What goes with it**

- Other languages keep showing the code until their translators add the
  two texts on Weblate.
- Backport: the two pages and pkp-lib's `invitation.po` are the same on
  `stable-3_5_0`; the diff applies there as written.
- Guard: an e2e check that no list or button on the two pages carries
  `##` in its name.

Medium: one repository each for the texts and the pages, then a
`lib/pkp` and `lib/ui-library` update and a JavaScript build in each of
the three applications.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/invitation-steps-raw-labels/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-steps-raw-labels/walk.js)
  takes steps 1 to 6:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/invitation-steps-raw-labels/walk.js`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 3788b55 (2026-10-02). Names were read from the
  browser's accessibility tree; no screen reader was used.
- Tips: `lib/ui-library` 64d67363 (OJS `main`), 280f98c5 (OMP and OPS
  `main`), d4e01883 (`stable-3_5_0`); `lib/pkp` ddd8ab243a, 3dc90c81a6,
  cf3f984335.
- Code reads: the two pages and `Steps.vue` on `main` and
  `stable-3_5_0`; `wizard.tpl` and `record.tpl`; ui-library's
  `src/utils/i18n.js` (`t()`), pkp-lib's `UITranslator` and
  `Locale::translate()`; every locale file of pkp-lib and the
  applications, and `git log -S` in pkp-lib, for the two keys (never
  defined).
- Unverified: the errors warning on screen; what a screen reader says
  when the button takes focus.
