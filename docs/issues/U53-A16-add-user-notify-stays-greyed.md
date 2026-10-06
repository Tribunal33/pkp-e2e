# On "Add User", unticking "Generate Password" leaves "Notify User" greyed out, so no welcome email can be chosen

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#143` for PKP bug 8707 (the jQuery 1.11 upgrade) · [37fd452694](https://github.com/pkp/pkp-lib/commit/37fd452694293e32789d862e7075793fca4c40ea) and [ae3a41dc42](https://github.com/pkp/pkp-lib/commit/ae3a41dc42b7001920d23fa850ea4333255058a0) · 2014-08-14 · Bruno Beghelli (beghelli); commits by Michael Thessel
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a16)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On "Add User", ticking "Generate Password" fills and locks the password
boxes and ticks and locks "Notify User". Unticking it again empties and
opens the password boxes, but "Notify User" stays greyed out and
unticked. The welcome email with the username and password cannot be
chosen for a password typed by hand, and the account is created without
it.

It happens only to someone who ticks "Generate Password" and then
changes their mind. On `main` and 3.5 the window belongs to the Site
Administrator's Settings wizard. A manager's Settings › Users & Roles
adds people by "Invite to a role" and does not have this window.

## Impact

- **Lost**: the welcome email for the new account. The account and its
  roles are saved, and the greyed, unticked box shows that no email
  will go.
- **Who**: on `main` and 3.5, the Site Administrator adding a user on a
  journal's Settings wizard (Administration › "Hosted Journals", the
  journal's arrow, "Settings wizard", tab "Users";
  `/index.php/index/en/admin/wizard/{id}#users`). On 3.4 and 3.3 the
  same grid is each journal's, press's or server's Settings › Users &
  Roles page, so its managers meet it too (code).
- **Way round**: close the window and press "Add User" again, losing
  what was typed; or keep "Generate Password", which sends a random
  password. The row's "Email" sends only a message the administrator
  writes, so the username and password would have to be typed into it.

Low: nothing is stored wrong, the box shows that no email will go, and
starting the window again gives the email. A box that looked ticked
while no email went would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Nothing else is needed.

Steps:

1. Sign in as `admin` (password `admin`).
2. Open Administration › "Hosted Journals" ("Hosted Presses" on OMP,
   "Hosted Servers" on OPS), press the arrow at the start of the
   `publicknowledge` row, then "Settings wizard", and open the tab
   "Users".
3. Press "Add User". The window "Add User" opens on "Step #1: Fill in
   User Details", with "Notify User" ("Send user a welcome email.")
   unticked.
4. Tick "Generate Password" ("Generate random password for this
   user."). Both password boxes show "********" and lock, and "Notify
   User" is ticked and locked.
5. Untick "Generate Password".
6. Fill in "Given Name" `U53r7`, "Family Name" `Notify`, "Username"
   `u53r7notify`, "Email" `u53r7notify@mailinator.com`, and
   `u53r7notify` in both password boxes.
7. Click "Notify User".
8. Press "OK". On "Step #2: Add User Roles to U53r7 Notify", tick
   "Reader" and press "Save".

**Expected**: after step 5, "Notify User" can be ticked again, as it
could when the window opened. Step 7 ticks it, and after step 8 the
welcome email goes to `u53r7notify@mailinator.com`.

**Observed**: after step 5 the password boxes are empty and open, but
"Notify User" is unticked and greyed out:

```html
<input type="checkbox" name="sendNotify" id="sendNotify-…" disabled="disabled">
```

Step 7 changes nothing. After step 8 the grid lists U53r7 Notify with
"Reader", and no email reached the address within 15 seconds.

## Cause

`UserDetailsFormHandler.prototype.setGenerateRandom()` (lib/pkp
`js/controllers/grid/settings/user/form/UserDetailsFormHandler.js`)
runs on each click of "Generate Password". It sets a variable,
`activeAndCheck`, to `'disabled'` when "Generate Password" is ticked
and to `''` when it is unticked. It then sets the password boxes with
`.prop('disabled', activeAndCheck)` (line 91) and "Notify User" with
`.attr('disabled', activeAndCheck)` (line 92). jQuery's `.attr()`
removes a boolean attribute only for the value `false` and writes it
for any other value, so `''` leaves `disabled="disabled"` on "Notify
User". `.prop()` sets the property, which `''` turns off, so the
password boxes open again.

The line worked when it was written in 00930ccaf0 (2013). lib/pkp then
shipped jQuery 1.4.4, whose `attr()` set the element's property
(`elem[name] = value`), so `.attr('disabled', 0)` re-enabled the box.
The upgrade to jQuery 1.11 (37fd452694, the bundled copy, and
ae3a41dc42, the CDN version; both committed 2014-08-14) changed
`.attr()` to write the attribute, and the box stayed locked from then
on. Two months later d57b6a9419 moved the password boxes and "Notify
User"'s `checked` setter to `.prop()`, but left its `disabled` setter on
`.attr()`.

Reach:

- The server is right: `UserDetailsForm::execute()` sends the welcome
  email for a typed password when `sendNotify` is posted, and a
  disabled box is not posted.
- "Notify User" appears only on "Add User":
  `templates/controllers/grid/settings/user/form/userDetailsForm.tpl`
  sets `disableSendNotifySection` for an existing account, and
  `templates/common/userDetails.tpl` then leaves the box out.
- The other `.attr('disabled', …)` calls in lib/pkp's `js/` pass the
  literal `'disabled'` and undo it with `.removeAttr()`, so they are
  not this mistake.

## Proposed fix

Set "Notify User" with `.prop()`, as line 91 does for the password
boxes
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-user-notify-stays-greyed/fix.diff)):

```diff
 		$(':password', $form).
 				prop('disabled', activeAndCheck).val(passwordValue);
-		$('[id^="sendNotify"]', $form).attr('disabled', activeAndCheck).
+		$('[id^="sendNotify"]', $form).prop('disabled', activeAndCheck).
 				prop('checked', activeAndCheck);
```

Tried on OJS, OMP and OPS `main`. With the fix in, "Notify User" opened
again unticked after step 5, step 7 ticked it, and the welcome email
("Journal Registration", "Press Registration", "Server Registration")
reached the new address. With the fix in and out alike, ticking
"Generate Password" again after unticking it ticked and locked "Notify
User", and an account made with a generated password got its email.

**Alternatives**:

- `.removeAttr('disabled')` on the unticked branch. This works, but
  it splits one statement into two branches for no gain.

**What goes with it**:

- `js/pkp.min.js`, the minified copy of lib/pkp's scripts, is committed
  in each app repository. The fix therefore includes rebuilding it in
  OJS, OMP and OPS on each branch it lands on, or the change reaches
  only installs that run `enable_minified = Off`.
- `fix.diff` is written against an app checkout (`a/lib/pkp/js/…`).
  In pkp-lib itself, on `main` and on the stable branches, it applies
  with the `lib/pkp/` prefix stripped (`patch -p3`). `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0` carry the same line 92.

Medium: the change is one word in pkp-lib, but it also needs the
committed `pkp.min.js` rebuilt in three app repositories.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-user-notify-stays-greyed/walk.js)
  takes the Steps, records the password boxes' and "Notify User"'s
  state after each step, and reads the mailbox. Its `nb` mode ticks,
  unticks and ticks "Generate Password" again and creates an account
  with a generated password. On an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/add-user-notify-stays-greyed/walk.js [nb]`.
- Driven on screen on OJS, OMP and OPS on `main` and on
  `stable-3_5_0`, on PostgreSQL. Dataset: pkp/datasets c657990
  (2026-10-01).
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; `UserDetailsFormHandler.js` is
  the same in both); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c, OPS
  38b61882d3 (lib/pkp cf3f984335); pkp-lib `stable-3_4_0` 32b0f4b4af,
  `stable-3_3_0` f6ab331645.
- Code reads: `UserDetailsFormHandler.js`, `userDetailsForm.tpl`,
  `common/userDetails.tpl` and `UserDetailsForm::execute()` on `main`
  and `stable-3_5_0`. `UserDetailsFormHandler.js` (line 92 the same),
  `common/userDetails.tpl` and `management/accessUsers.tpl` (Users &
  Roles loads `UserGridHandler`) on `stable-3_4_0` and `stable-3_3_0`.
  The history: `js/lib/jquery/jquery.min.js` at 00930ccaf0 (jQuery
  1.4.4, its `attr()` setting `elem[ name ] = value`) and the
  `CDN_JQUERY_VERSION` change in ae3a41dc42 (1.4.4 to 1.11.1). The pull
  request comes from the API's `commits/<sha>/pulls` for 37fd452694.
- The row's "Email" window: "Subject", "To" and "Body" typed by the
  sender (spec U53, Rule 9).
