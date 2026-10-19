# The ORCID sign-in popup stays open on a blank page, saying nothing, when ORCID cannot be reached or fails

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** both
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** not traced; present since at least [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) (2023-10-06), `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771`, Erik Hanson (ewhanson), which moved the ORCID Profile plugin's code into pkp-lib
- **Upstream** none found (2026-10-19); `pkp/pkp-lib#13283` (closed) made the profile show ORCID's refusal of the journal's credentials, and covers no other failure
- **Tracked in** spec U04 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a18)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-19: revised after the developer and triage reads. The
Steps name `[general] sandbox = Off`, say how to make ORCID unreachable
and how to send the popup back without a registered client; the Cause
says why the fix encodes the messages, where the Deny return stands,
and where a 3.4 or 3.3 backport would go. Nothing was walked again.

## Summary

A user who signs in at ORCID from the profile's "Create or Connect
your ORCID iD" (or "Authorize and Connect your ORCID iD"), or from a
journal's registration page, is sent back to the journal in the popup.
If at that moment ORCID's service cannot be reached, or answers with a
failure of its own, the app fails on the server: the popup stays open
on a blank page, and the profile or the registration form under it
says nothing. Nothing is stored. When ORCID refuses the journal's
credentials instead, the popup closes and the profile shows "ORCID
authorization failed:"; the user expected the same kind of answer
here.

The registration page does not get that refusal notice either. When
ORCID refuses the journal's credentials there, the popup's own script
fails in the browser, and the popup stays blank just the same.

It happens only on a journal, press or server that has ORCID switched
on. On an install whose server cannot reach ORCID at all (a firewall
on outbound traffic, a wrong proxy), every attempt fails this way.

## Impact

- **Lost:** the iD connection the user came to make, until ORCID
  answers again. Nobody is told why, and a manager can find out only
  from the server log.
- **Who:** on a journal, press or server with ORCID switched on, users
  who connect or authorize an iD from the profile, and visitors who do
  it while registering. Most installs meet it only during an ORCID
  outage. An install whose server cannot reach ORCID (firewall, proxy)
  meets it for every user on every attempt. On the registration page,
  wrong ORCID credentials give the same blank popup.
- **Way round:** close the popup and try again once ORCID answers;
  registering does not need an iD.

Medium: connecting an iD fails with a blank window and no reason given,
but the user can try again later and register without one. It would be
high if many installs could not reach ORCID at all, since there no
connection ever succeeds and the screen never says why.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OMP and OPS the same).
- `config.inc.php`: `[general] sandbox = Off` (the default). With it
  On, `orcid/authorizeOrcid` answers an empty `200` on purpose, which
  also leaves the popup blank.
- `config.inc.php`, `[proxy]`: `http_proxy = "http://127.0.0.1:9"` and
  `https_proxy = "http://127.0.0.1:9"`, a local port nothing listens
  on. The server's own requests to ORCID then fail to connect, as they
  do behind a firewall or during an ORCID outage. (Blocking
  `pub.sandbox.orcid.org` for the server, through the firewall or
  `/etc/hosts`, works too.) The browser still reaches ORCID.
- ORCID on for the journal: sign in as `dbarnes`, Settings › Users &
  Roles › "ORCID", tick "Enable ORCID functionality", "ORCID API"
  "Public Sandbox", "Client ID" `APP-TEST`, "Client Secret"
  `test-secret`, "Save". The server never reaches ORCID, so any pair
  will do.

Steps 3 and 6 send the popup back the way ORCID does after a sign-in.
Doing that for real needs an ORCID sandbox client registered for the
install's address, and an ORCID sandbox user. With `APP-TEST`, ORCID
shows its own error page in the popup instead of a sign-in. The steps
therefore load the return address from the popup's own document. A new
tab, or an address typed into a fresh window, loses `window.opener`.
The `500` shows either way, but the notice on the page behind the popup
needs the opener.

Profile:

1. As `dbarnes`, open the profile
   (`/index.php/publicknowledge/user/profile`), "Identity" tab.
2. Press "Create or Connect your ORCID iD". A popup opens
   `https://sandbox.orcid.org/oauth/authorize?client_id=APP-TEST&…&redirect_uri=…/index.php/publicknowledge/orcid/authorizeOrcid?targetOp=profile`.
3. In the popup's developer console, send it to its `redirect_uri`
   with a code added, as ORCID does after a sign-in:
   `location.href = '<base>/index.php/publicknowledge/orcid/authorizeOrcid?targetOp=profile&code=abc123'`.

Registration:

4. Sign out. Open the journal's registration page
   (`/index.php/publicknowledge/user/register`), type "Hana" in "Given
   Name", "Novak" in "Family Name" and an email address.
5. Press "Create or Connect your ORCID iD" at the top of the form.
6. As step 3, with `targetOp=register`.

**Expected:** after steps 3 and 6 the popup closes and the page says
that ORCID could not be contacted, as it says "ORCID authorization
failed: …" when ORCID refuses the credentials. The profile still offers
"Create or Connect your ORCID iD"; the registration form keeps what was
typed.

**Observed:** the return answers `500 Internal Server Error` with an
empty body (after a `302` to the same address with `/en/`). The popup
stays open on a blank page; the profile and the registration form show
nothing; the account holds no ORCID setting. The server log:

```
PHP Fatal error:  Uncaught GuzzleHttp\Exception\ConnectException: cURL error 7: Failed to connect to pub.sandbox.orcid.org port 443 via 127.0.0.1 after 0 ms: Could not connect to server (see https://curl.se/libcurl/c/libcurl-errors.html) for https://pub.sandbox.orcid.org/oauth/token in …/lib/pkp/lib/vendor/guzzlehttp/guzzle/src/Handler/CurlFactory.php:1140
```

ORCID's other two answers need a server that answers ORCID's token
request in its place; Evidence describes the one the walk used. When
the token request is answered `500`, the popup stays blank in the same
way, with `Uncaught GuzzleHttp\Exception\ServerException: Server error:
`POST https://pub.sandbox.orcid.org/oauth/token` resulted in a `500
Internal Server Error` response`. When it is answered `401`
`invalid_client`, the profile shows "ORCID authorization failed: Client
not found: APP-TEST. Reason: invalid_client." and the popup closes. On
the registration page, though, the popup answers `200` and stays blank,
because its script fails with `TypeError: Cannot read properties of
undefined (reading 'eventBus')`. A server that does reach ORCID's
sandbox should get ORCID's own `401` refusal of `APP-TEST` from steps 3
and 6, without the `[proxy]` lines. That was not walked here.

## Cause

`PKP\orcid\actions\AuthorizeUserData::execute()` (lib/pkp
`classes/orcid/actions/AuthorizeUserData.php`) serves the popup's
return to `orcid/authorizeOrcid`. It posts the code to ORCID's
`oauth/token` in a `try` whose only `catch` is `ClientException`
(line 75), the exception Guzzle throws for a `4xx` answer. A request
that cannot connect throws `ConnectException`, and a `5xx` answer
throws `ServerException`. Neither is caught, so PHP stops with a fatal
error and the response is an empty `500`: the server side of "Crash:
both". The popup therefore never gets the script that closes it and
tells the page. `VerifyIdentityWithOrcid::getHandshakeResponse()` makes
the same token request for the emailed verification link. It already
catches every Guzzle failure (`GuzzleException`) and shows the failure
on its landing page; this class should do the same.

The registration page has a second fault, in the failures that are
caught (a `4xx` refusal). `renderFrontendErrorNotification()` writes
each message as `opener.pkp.eventBus.$emit("notify", "…")`. The profile
and the invitation wizard are back-office pages that carry
`pkp.eventBus`. The registration page is part of the reader frontend,
which has no `pkp.eventBus`: a theme that loads the frontend's Vue
runtime gives it `window.pkp`, but without the event bus. So on that
page the popup's script throws at its first message and never reaches
`window.close()`. This is the browser side of "Crash: both".

The message is also copied into a double-quoted JavaScript string
unescaped. `getAuthErrorDisplayMessage()` puts ORCID's
`error_description` in it, so a `"` from ORCID would break the script.

Even when a refused token is caught, the register case still asks ORCID
for the person and employment records, with no iD and no token. The log
then reads `Undefined variable $orcid` and `$accessToken`. The script
that follows would write those failed reads' empty values over the
form's name, email, country and affiliation fields and hide the button.
On today's code it never gets that far, because the `eventBus` line
throws first.

Reach:

- The profile's "Create or Connect your ORCID iD" and "Authorize and
  Connect your ORCID iD" (`targetOp=profile`): walked.
- The registration page's button (`targetOp=register`): walked.
- The invitation wizard's "Verify ORCID iD" (`targetOp=invitation`) has
  the same token request and catch (checked in the code). Its page has
  `pkp.eventBus`, so only the uncaught exceptions reach it.
- A "Deny" at ORCID from the profile returns with
  `error=access_denied` and no code. `execute()` never reads `error`
  and asks ORCID for a token anyway (checked in the code, not walked).
  With ORCID unreachable that fails as above, and the fix covers it.
  With ORCID reachable it probably ends in the generic refusal notice,
  "ORCID API credentials may be incorrect.". Recognising the denial is a
  separate change and stays out of this report.
- The register case's profile and employment requests also catch only
  `ClientException` (lines 102 and 127), so a `5xx` there fails the
  same way after a good token (checked in the code).
- Not affected: the emailed verification link (`OrcidHandler::verify()`
  through `VerifyIdentityWithOrcid`). The queued jobs
  (`DepositOrcidSubmission`, `RevokeOrcidToken`, `DepositOrcidReview`)
  also catch only `ClientException`, but the queue records a failed job
  and retries it, away from any screen, so they are left out.
- 3.4 and 3.3: the ORCID Profile plugin does this job there, in
  `OrcidProfileHandler::orcidAuthorize()` (3.4) and
  `OrcidHandler::orcidAuthorize()` (3.3, `pages/OrcidHandler.inc.php`).
  It posts the token request with no `try`, so every failure, a refusal
  included, ends in the same fatal error.

## Proposed fix

In `AuthorizeUserData::execute()`, catch every Guzzle failure of the
token request, as `VerifyIdentityWithOrcid` does, and make the messages
reach the registration page. The diff
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/fix.diff))
changes one pkp-lib file, the same in the three apps:

- A `catch (GuzzleException …)` after the `ClientException` one, as
  below.
- `$orcid`, `$orcidUri`, `$accessToken` and `$tokenData` start empty
  before the `try`.
- In the register case, with no iD, the popup's script carries only
  the messages and `window.close()`, so the form stays as typed. The
  profile and employment requests catch `GuzzleException`. The script
  fills only the fields ORCID returned a value for.
- `renderFrontendErrorNotification()` emits to `opener.pkp.eventBus`
  where the page has one. Otherwise it shows the message with `alert()`
  in the popup before closing it. Each message is written with
  `json_encode()`.

```diff
         } catch (ClientException $exception) {
             $message = $this->getAuthErrorDisplayMessage($exception);
             OrcidManager::logError("AuthorizeUserData::execute failed:\n {$exception->getMessage()}");
             $errorMessages[] = $message;
+        } catch (GuzzleException $exception) {
+            // ORCID could not be reached, or answered with a failure of its own (5xx)
+            OrcidManager::logError("AuthorizeUserData::execute failed:\n {$exception->getMessage()}");
+            $errorMessages[] = 'ORCID authorization failed: ORCID could not be contacted. Please try again later.';
         }
…
-            $returner .= 'opener.pkp.eventBus.$emit("notify", "' . $errorMessage . '", "warning");';
+            $returner .= 'if (opener.pkp && opener.pkp.eventBus) { opener.pkp.eventBus.$emit("notify", ' . json_encode($errorMessage) . ', "warning"); } else { alert(' . json_encode($errorMessage) . '); }';
```

The fix was tried on `main` (OJS, OMP, OPS). With it in, the Steps end
as Expected. On the profile, the popup closes and the page shows "ORCID
authorization failed: ORCID could not be contacted. Please try again
later.". On the registration page, the popup shows that text in an
alert and closes, and the form keeps "Hana", "Novak" and the address.
A `500` from ORCID ends the same way.

The nearby cases were run with and without the fix. A refused client
still reads "ORCID authorization failed: Client not found: APP-TEST.
Reason: invalid_client." on the profile. On the registration page it
now shows as an alert, where before the popup stayed blank. A granted
token still connects the iD on the profile, with no notice. On the
registration page, a granted token whose profile reads then fail fills
in the iD and keeps the typed name and address.

**Alternatives:**

- Catch `GuzzleException` in place of `ClientException`: this loses the
  refusal's detailed message (`getAuthErrorDisplayMessage()` reads the
  `401` body), which `pkp/pkp-lib#13283` asked for.
- Catch in `OrcidHandler::authorizeOrcid()`: the handler cannot tell
  the popup's three callers apart without repeating the method's
  `targetOp` switch.
- Show the notice in the registration form's own error block instead
  of an `alert()`: friendlier, but it needs a template change and a
  script of its own on the frontend. The `alert()` keeps the fix in the
  one method.

**What goes with it:**

- No stored data to repair, and no API or hook change. The messages
  stay in English, like the method's others; moving them to locale
  keys is a separate change.
- 3.5: the diff applies as written (the file differs by one blank
  line). 3.4 and 3.3: the backport belongs in pkp/orcidProfile, branches
  `stable-3_4_0` and `stable-3_3_0`: a `try`/`catch` around
  `orcidAuthorize()`'s token request. No diff was written for it.
- A test that sends the popup back with ORCID unreachable, on the
  profile and on the registration page, and expects the popup to close
  with the notice.

Small: one method in one pkp-lib file, following the sibling class's
catch.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/walk.js)
  with [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/lib.js),
  on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes the Steps
  once for each answer to the token request: `off` (the dead-port
  proxy, as in the Steps), then `500` and `401-invalid-client` through
  a local stand-in for ORCID's token endpoint
  ([`orcid-token-stub.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js)).
  The stand-in is an HTTPS proxy that the fleet's `[proxy]` points at.
  It ends TLS with a throwaway CA, which PHP trusts through `curl.cainfo`
  in an ini file on `PHP_INI_SCAN_DIR` when the server starts.
  `MODE=nb` runs the nearby cases, `401-invalid-client` and
  `200-token`. ORCID's site in the browser is answered locally. The
  popup's return is the `redirect_uri` the app built, with
  `&code=abc123`, loaded by the popup's own document, as in step 3.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/fix.diff ojs omp ops`.
  The walk and `MODE=nb` ran with the fix in, then `MODE=nb` after the
  revert, each on a freshly loaded dataset, on OJS, OMP and OPS `main`.
  The register case's fill guard was added after that run and tried on
  OJS alone; the file is the same in the three apps. `fix.diff` paths
  start at the app root (`a/lib/pkp/…`); in a pkp-lib clone apply it
  with `-p3`. Not tried on 3.5.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL,
  the default datasets of pkp/datasets eaf024c5 (2026-10-18), each walk
  on a freshly loaded dataset. MySQL not checked; nothing in the fault
  depends on the database. On 3.5, `AuthorizeUserData.php` at
  092ec34b0f was read as well, and it agrees with the walk.
- Tips: `main` OJS 6b4323ced7, OMP 5777025bec, OPS f048e747b4, pkp-lib
  042726ebf6 (the three apps' pointer); `stable-3_5_0` OJS 007c2cd0d6,
  OMP 2d575f250, OPS e737a9e465, pkp-lib 092ec34b0f. 3.4 was read at
  `upstream/stable-3_4_0`: OJS 0012bd1022 (ORCID Profile plugin
  894c2593e0) and OPS 0f1e21a117 (plugin 7d8c4e3c51), both on the
  plugin's `stable-3_4_0`. 3.3 was read at OJS d7d9dd14ec and OPS
  c5532e2161 (plugin 41864d3770, on `stable-3_3_0`). OMP bundles no
  ORCID plugin on 3.4 or 3.3.
- Not driven: ORCID's own sign-in and its real `401` (the test installs
  reach no outside service); the invitation wizard; the "Deny" return;
  a `5xx` on the profile or employment request after a good token; the
  registration success path with real ORCID records (the stand-in
  answers only the token request, so those reads fail there with `404`).
