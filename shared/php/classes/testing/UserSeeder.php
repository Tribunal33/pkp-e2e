<?php

/**
 * @file classes/testing/UserSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class UserSeeder
 *
 * @brief Creates users and enrols them in a context's default user groups the
 * way registration + the enrolment UI do (real repositories, real hooks).
 *
 * Two phases: parse(Spec) reads every key (so unknown keys 400 before any
 * write); seed(Context, plan) performs the mutations. Role keys are resolved
 * against each group's stored nameLocaleKey, so the vocabulary is exactly the
 * set of default groups the app ships (`default.groups.name.<key>` → key). A
 * key the app does not ship throws a SpecException that lists the whole set.
 *
 * U07 keys: `affiliation` (the Profile › Contact "Affiliation"), `masthead`
 * (per role key, the "Appear on the masthead" / "Does not appear on the
 * masthead" choice) and `pastRoles[]` (role periods that have ended, the
 * users list's "Edit" › "Remove Role", with an optional earlier start or
 * end date the screens cannot set: D9).
 *
 * U53: `roles: []` beside a non-empty `pastRoles` is the state the users
 * list's "Remove User" › "OK" leaves (UserGridHandler::removeUser: every
 * active role in the context ended now, the account still listed with no
 * role). Each period is ended by the same `endAssignments` as "Remove
 * Role"; the rows equal the handler's (parity ledger 2026-09-25).
 *
 * U54: a role the context scenario's `customRoles[]` creates ("Create New
 * Role", no nameLocaleKey) is named in `roles`, `pastRoles` and `masthead`
 * by the entry's own `key`: declareCustomRoles() registers the keys and
 * their levels before users[] is parsed, customRoleCreated() the new
 * role's id before users[] is seeded.
 *
 * U65: `notifications` {<setting name>: {enabled?, email?}} is the
 * account's own Profile › "Notifications" › "Save" in the context
 * (saveNotifications(): the app's NotificationSettingsForm through
 * FormPost, acting as the account).
 */

namespace PKP\testing;

use APP\core\Application;
use APP\facades\Repo;
use Carbon\Carbon;
use PKP\context\Context;
use PKP\core\Core;
use PKP\core\Registry;
use PKP\userGroup\relationships\UserUserGroup;
use PKP\orcid\OrcidManager;
use PKP\db\DAORegistry;
use PKP\security\Role;
use PKP\security\Validation;
use PKP\user\User;
use PKP\userGroup\UserGroup;

class UserSeeder
{
    /**
     * @param bool $appHash hash passwords the way the app does
     *   (Validation::encryptCredentials) instead of at cost 4; the
     *   bootstrap roster needs it, see seed()
     */
    public function __construct(protected bool $appHash = false)
    {
    }

    /**
     * Custom role key → ['roleId' => the level's role id, 'id' => the
     * created role's id, once customRoleCreated() has run] (U54).
     *
     * @var array<string, array{roleId: int, id: ?int}>
     */
    protected array $customRoles = [];

    /**
     * Register the context scenario's `customRoles[]` keys (key → role id
     * of the level) before users[] is parsed, so `masthead` can refuse a
     * choice the role's level does not offer.
     *
     * @param array<string, int> $keyToRoleId
     */
    public function declareCustomRoles(array $keyToRoleId): void
    {
        $this->customRoles = [];
        foreach ($keyToRoleId as $key => $roleId) {
            $this->customRoles[(string) $key] = ['roleId' => (int) $roleId, 'id' => null];
        }
    }

    /** The created role behind a declared custom key (U54). */
    public function customRoleCreated(string $key, int $userGroupId): void
    {
        $this->customRoles[$key]['id'] = $userGroupId;
    }

    /**
     * Read one user spec into a plain plan. $structureKey names the
     * sub-editor assignment list ('sections' or 'series').
     */
    public function parse(Spec $spec, string $structureKey): array
    {
        $username = (string) $spec->require('username');
        $roles = $spec->require('roles');
        if (!is_array($roles)) {
            throw new SpecException("{$spec->path}.roles", 'roles must be a list of role keys');
        }
        // ORCID iD fixture state (U4): a connected iD is only reachable
        // through ORCID's own OAuth sign-in, which can never complete in the
        // test env (outbound HTTP fails fast at the dead-port `[proxy]` in
        // config.test.inc.php, and the sandbox ORCID credentials are dummies)
        // — so the verified/unauthenticated states are seeded directly:
        // `orcid` + `orcidIsVerified`, and for a verified iD the OAuth
        // access fields the sign-in's completion stores too (see
        // orcidOAuthData(); parity ledger 2026-08-07 and 2026-09-13).
        $orcid = $spec->get('orcid');
        $orcidIsVerified = (bool) $spec->get('orcidIsVerified', false);
        if ($orcidIsVerified && !$orcid) {
            throw new SpecException("{$spec->path}.orcidIsVerified", 'orcidIsVerified requires an orcid value');
        }
        $pastRoles = $this->parsePastRoles($spec);
        if ($roles === [] && $pastRoles === []) {
            // `roles: []` is the state the Users list's "Remove User" leaves
            // (every role in the context ended, the account still listed);
            // with nothing ended either, the account would hold no row in the
            // context at all, which no screen leaves (U53).
            throw new SpecException("{$spec->path}.roles", 'Each user needs a non-empty roles list, or an empty one beside a non-empty pastRoles (every role here ended: "Remove User")');
        }
        // Each role key is one a new context has (registry/userGroups.xml)
        // or a `customRoles[]` key of the same build, refused here, before
        // the context exists (D4), rather than when the role is resolved.
        $known = self::registryRoleIds() + $this->customRoles;
        foreach ($roles as $i => $roleKey) {
            if (!is_string($roleKey) || !isset($known[$roleKey])) {
                $keys = array_keys($known);
                sort($keys);
                throw new SpecException("{$spec->path}.roles.{$i}", 'Unknown role key "' . (is_scalar($roleKey) ? $roleKey : gettype($roleKey)) . '". This app\'s keys: ' . implode(', ', $keys));
            }
        }
        foreach ($pastRoles as $pastPlan) {
            if (!isset($known[$pastPlan['role']])) {
                $keys = array_keys($known);
                sort($keys);
                throw new SpecException("{$pastPlan['specPath']}.role", "Unknown role key \"{$pastPlan['role']}\". This app's keys: " . implode(', ', $keys));
            }
        }
        $masthead = $this->parseMasthead($spec, $roles, $pastRoles);
        $affiliation = $spec->get('affiliation');
        if ($affiliation !== null && !is_string($affiliation) && !(is_array($affiliation) && !array_is_list($affiliation))) {
            throw new SpecException("{$spec->path}.affiliation", 'affiliation must be a string or a locale map');
        }
        if (($affiliation !== null || $pastRoles !== []) && Repo::user()->getByUsername($username, true)) {
            // Both write what an account already carries (its profile, its
            // assignments in the context), and the accounts that exist are
            // the shared roster and admin (A1): only a new account takes them.
            $key = $affiliation !== null ? 'affiliation' : 'pastRoles';
            throw new SpecException("{$spec->path}.{$key}", "\"{$key}\" is seeded on an account this entry creates only; \"{$username}\" already exists");
        }
        $disabled = $spec->get('disabled', false);
        if (!is_bool($disabled)) {
            throw new SpecException("{$spec->path}.disabled", 'disabled must be a boolean (the account disabled on Users & Roles)');
        }
        $notifications = $this->parseNotifications($spec);
        return [
            'specPath' => $spec->path,
            'username' => $username,
            'disabled' => $disabled,
            'roles' => $roles,
            'pastRoles' => $pastRoles,
            'masthead' => $masthead,
            'affiliation' => $affiliation,
            'givenName' => $spec->get('givenName', $username),
            'familyName' => $spec->get('familyName'),
            'email' => (string) $spec->get('email', "{$username}@mail.test"),
            // Deterministic password rule: explicit password honored, else the
            // username doubled (data/users.js getPassword).
            'password' => (string) $spec->get('password', $username . $username),
            'structures' => (array) $spec->get($structureKey, []),
            'structureKey' => $structureKey,
            'orcid' => $orcid !== null ? (string) $orcid : null,
            'orcidIsVerified' => $orcidIsVerified,
            'notifications' => $notifications,
        ];
    }

    /**
     * `notifications` (U65): the account's Profile › "Notifications" tab
     * in this context, a map from a row's setting name (the form's field
     * name, e.g. `notificationEditorialReport` for "Statistics report
     * summary.") to `{enabled?, email?}`: `enabled` the row's "Enable these
     * types of notifications." box, `email` whether email goes out, i.e.
     * false is "Do not send me an email for these types of notifications."
     * ticked. A new account's tab has every "Enable" box ticked and every
     * "Do not send me an email…" box unticked; an absent half keeps that.
     * Unticking "Enable" disables the email box on the tab (its script's
     * enable/disable pairs), which then posts nothing, so `{enabled: false,
     * email: false}` is a state the tab cannot save: a 400. Which rows the
     * tab shows depends on the context (Profile › Notifications leaves out
     * "Statistics report summary." while the context's editorialStatsEmail
     * is off), so that check is made at seed time. Parse phase: no writes.
     *
     * @return array<string, array{enabled: bool, email: bool}>
     */
    protected function parseNotifications(Spec $spec): array
    {
        $raw = $spec->get('notifications');
        if ($raw === null) {
            return [];
        }
        $map = (new \APP\notification\NotificationManager())->getNotificationSettingsMap();
        $names = array_column($map, 'settingName');
        $expected = 'notifications must be a map of Profile › Notifications setting name (' . implode(', ', $names) . ') to {enabled?, email?}';
        if (!is_array($raw) || $raw === [] || array_is_list($raw)) {
            throw new SpecException("{$spec->path}.notifications", $expected);
        }
        $plans = [];
        foreach ($raw as $name => $pair) {
            $name = (string) $name;
            $path = "{$spec->path}.notifications.{$name}";
            if (!in_array($name, $names, true)) {
                throw new SpecException($path, "Unknown notification setting \"{$name}\". {$expected}");
            }
            if (!is_array($pair) || $pair === [] || array_is_list($pair)) {
                throw new SpecException($path, "{$name} must be {enabled?, email?}, at least one of them");
            }
            foreach (array_keys($pair) as $key) {
                if (!in_array($key, ['enabled', 'email'], true)) {
                    throw new SpecException("{$path}.{$key}", "Unsupported spec key \"{$path}.{$key}\" (enabled: the \"Enable these types of notifications.\" box; email: false is \"Do not send me an email for these types of notifications.\" ticked)");
                }
                if (!is_bool($pair[$key])) {
                    throw new SpecException("{$path}.{$key}", "{$key} must be a boolean");
                }
            }
            $enabled = $pair['enabled'] ?? true;
            $email = $pair['email'] ?? true;
            if (!$enabled && !$email) {
                throw new SpecException($path, 'The tab disables "Do not send me an email…" while "Enable these types of notifications." is unticked, so it cannot be saved ticked: give enabled: false alone');
            }
            $plans[$name] = ['enabled' => $enabled, 'email' => $email];
        }
        return $plans;
    }

    /**
     * Profile › "Notifications" › "Save" as the account itself, in the
     * context (ProfileTabHandler::saveNotificationSettings: the app's
     * NotificationSettingsForm, its readInputData, validate and execute,
     * through FormPost). The post is the tab as it shows for the account
     * (the rows of getNotificationSettingCategories for the context, each
     * box as its stored subscription rows tick it) with the plan's boxes
     * changed, so the save rewrites both lists exactly as the tab's
     * "Save" does, rows the tab does not show included (a row absent from
     * the post is stored as blocked). Not run: the handler's "Saved" toast
     * (a trivial notification) and the POST and CSRF checks.
     *
     * @param array<string, array{enabled: bool, email: bool}> $plans
     */
    protected function saveNotifications(Context $context, User $user, array $plans, string $specPath): void
    {
        $form = new \APP\notification\form\NotificationSettingsForm();
        $map = (new \APP\notification\NotificationManager())->getNotificationSettingsMap();
        $shown = [];
        foreach ($form->getNotificationSettingCategories($context) as $category) {
            foreach ($category['settings'] as $settingId) {
                $shown[$settingId] = $map[$settingId];
            }
        }
        $shownNames = array_column($shown, 'settingName');
        foreach (array_keys($plans) as $name) {
            if (!in_array($name, $shownNames, true)) {
                throw new SpecException("{$specPath}.notifications.{$name}", "Profile › Notifications does not show the \"{$name}\" row in this context" . ($name === 'notificationEditorialReport' ? ' (its editorialStatsEmail is off)' : ''));
            }
        }

        $dao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO'); /** @var \PKP\notification\NotificationSubscriptionSettingsDAO $dao */
        $blocked = $dao->getNotificationSubscriptionSettings($dao::BLOCKED_NOTIFICATION_KEY, $user->getId(), $context->getId());
        $noEmail = $dao->getNotificationSubscriptionSettings($dao::BLOCKED_EMAIL_NOTIFICATION_KEY, $user->getId(), $context->getId());
        $vars = [];
        foreach ($shown as $settingId => $setting) {
            $plan = $plans[$setting['settingName']] ?? null;
            $enabled = $plan['enabled'] ?? !in_array($settingId, $blocked);
            $emailBoxTicked = $plan !== null ? !$plan['email'] : in_array($settingId, $noEmail);
            if ($enabled) {
                $vars[$setting['settingName']] = '1';
                // The email box is posted only while its "Enable" box is
                // ticked (the tab disables it otherwise).
                if ($emailBoxTicked) {
                    $vars[$setting['emailSettingName']] = '1';
                }
            }
        }

        $previousUser = Registry::get('user');
        Registry::set('user', $user);
        $restoreContext = ContextFactory::forceRequestContext($context);
        try {
            FormPost::run($form, $vars, "{$specPath}.notifications", 'Profile › Notifications would refuse this');
        } finally {
            $restoreContext();
            Registry::set('user', $previousUser);
        }
    }

    /**
     * Role key → role id of the default roles every new context gets
     * (registry/userGroups.xml, the file PKPContextService::add installs),
     * so a parse-phase check can refuse a key or a choice before any write.
     *
     * @return array<string, int>
     */
    public static function registryRoleIds(): array
    {
        $roleIds = [];
        $xml = simplexml_load_file(Core::getBaseDir() . '/registry/userGroups.xml');
        foreach ($xml->group as $group) {
            $key = preg_replace('/^default\.groups\.name\./', '', (string) $group['name']);
            $roleIds[$key] = (int) hexdec((string) $group['roleId']);
        }
        return $roleIds;
    }

    /**
     * `pastRoles[]`: each `{role, dateStart?, dateEnd?}`, a role period that
     * has ended. Dates are `YYYY-MM-DD`, start ≤ end ≤ today; both default
     * to today, the period "Remove Role" leaves on a role given today.
     *
     * @return array<int, array{role: string, dateStart: ?string, dateEnd: ?string, specPath: string}>
     */
    protected function parsePastRoles(Spec $spec): array
    {
        $today = Carbon::today()->toDateString();
        $plans = [];
        foreach ($spec->childList('pastRoles') as $pastSpec) {
            $role = $pastSpec->require('role');
            if (!is_string($role)) {
                throw new SpecException("{$pastSpec->path}.role", 'role must be a role key string');
            }
            $dates = [];
            foreach (['dateStart', 'dateEnd'] as $key) {
                $value = $pastSpec->get($key);
                if ($value !== null) {
                    $parsed = is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
                        ? \DateTime::createFromFormat('!Y-m-d', $value)
                        : false;
                    if (!$parsed || $parsed->format('Y-m-d') !== $value) {
                        throw new SpecException("{$pastSpec->path}.{$key}", "{$key} must be a date written YYYY-MM-DD");
                    }
                }
                $dates[$key] = $value;
            }
            $start = $dates['dateStart'] ?? $today;
            $end = $dates['dateEnd'] ?? $today;
            if ($end > $today) {
                throw new SpecException("{$pastSpec->path}.dateEnd", 'dateEnd must not be after today: a role ending later is still current (the ended period is what this key seeds)');
            }
            if ($start > $end) {
                throw new SpecException("{$pastSpec->path}.dateStart", 'dateStart must not be after dateEnd');
            }
            $pastSpec->assertConsumed();
            $plans[] = ['role' => $role, 'dateStart' => $dates['dateStart'], 'dateEnd' => $dates['dateEnd'], 'specPath' => $pastSpec->path];
        }
        return $plans;
    }

    /**
     * `masthead`: a map from a role key of this entry (`roles` or
     * `pastRoles`) to the masthead choice for it, `true` "Appear on the
     * masthead" (the default for every role) or `false` "Does not appear on
     * the masthead". A reviewer role has no choice on the screens (the
     * table prints "Appear on the masthead", the API refuses a change), so
     * `false` there is a 400.
     *
     * @return array<string, bool>
     */
    protected function parseMasthead(Spec $spec, array $roles, array $pastRoles): array
    {
        $raw = $spec->get('masthead');
        if ($raw === null) {
            return [];
        }
        if (!is_array($raw) || ($raw !== [] && array_is_list($raw))) {
            throw new SpecException("{$spec->path}.masthead", 'masthead must be a map of role key to true ("Appear on the masthead") or false ("Does not appear on the masthead")');
        }
        $entryKeys = array_merge(array_map('strval', $roles), array_column($pastRoles, 'role'));
        $roleIds = self::registryRoleIds() + array_map(fn (array $role) => $role['roleId'], $this->customRoles);
        $choices = [];
        foreach ($raw as $key => $value) {
            $key = (string) $key;
            if (!in_array($key, $entryKeys, true)) {
                throw new SpecException("{$spec->path}.masthead.{$key}", "masthead names \"{$key}\", which is not among this user's roles or pastRoles");
            }
            if (!is_bool($value)) {
                throw new SpecException("{$spec->path}.masthead.{$key}", "masthead.{$key} must be a boolean");
            }
            if ($value === false && ($roleIds[$key] ?? null) === Role::ROLE_ID_REVIEWER) {
                throw new SpecException("{$spec->path}.masthead.{$key}", "A reviewer role always appears (the user's roles table offers no choice for it and the API refuses one)");
            }
            $choices[$key] = $value;
        }
        return $choices;
    }

    /**
     * The seconds-to-live ORCID's token responses carry (`expires_in`): 20
     * years, for public and member scopes alike. The app never stores the
     * lifetime, only `now + expires_in`, so this is the one fixture value the
     * seed needs beyond the token strings.
     */
    public const ORCID_TOKEN_EXPIRES_IN = 631138518;

    /**
     * The ORCID settings an identity (user or contributor) carries, keyed the
     * way `AuthorizeUserData::getOrcidOAuthAccessData()` and
     * `VerifyIdentityWithOrcid::setIdentityData()` build them after ORCID's
     * sign-in completes: the iD, the verified mark, the access-denied marker
     * cleared, and the access token, its scope, the refresh token and the
     * expiry. Verified in the app is only ever the result of that completion,
     * so `orcidIsVerified: true` seeds the whole live set: the token strings
     * are fixtures (ORCID's service is unreachable, like the dummy client
     * credentials), the scope is the one the app requests for the context's
     * API type (`OrcidManager::buildOAuthUrl()`), and the expiry is computed
     * the way the completion computes it. An unverified iD stores the iD and
     * the mark alone, as a typed-in iD does.
     *
     * @param string $fixtureKey a per-identity suffix for the token strings
     */
    public static function orcidOAuthData(Context $context, string $orcid, bool $verified, string $fixtureKey): array
    {
        if (!$verified) {
            return ['orcid' => $orcid, 'orcidIsVerified' => false];
        }
        $scope = OrcidManager::isMemberApiEnabled($context)
            ? OrcidManager::ORCID_API_SCOPE_MEMBER
            : OrcidManager::ORCID_API_SCOPE_PUBLIC;
        return [
            'orcid' => $orcid,
            'orcidIsVerified' => true,
            'orcidAccessDenied' => null,
            'orcidAccessToken' => "test-orcid-access-token-{$fixtureKey}",
            'orcidAccessScope' => $scope,
            'orcidRefreshToken' => "test-orcid-refresh-token-{$fixtureKey}",
            'orcidAccessExpiresOn' => Carbon::now()->addSeconds(self::ORCID_TOKEN_EXPIRES_IN)->toDateTimeString(),
        ];
    }

    /**
     * Execute a parsed plan against a context.
     *
     * @param callable(string): ?int $resolveStructureId identifier → section/series id
     */
    public function seed(Context $context, array $plan, callable $resolveStructureId): User
    {
        $locale = $context->getPrimaryLocale();
        $username = $plan['username'];

        $user = Repo::user()->getByUsername($username, true);
        if ($user && ($plan['disabled'] ?? false)) {
            // A shared account (the roster, admin) is used by every worker:
            // disabling it would break unrelated suites (PRINCIPLES A7).
            throw new SpecException("{$plan['specPath']}.disabled", "\"{$username}\" is an existing account; disabled applies to a new throwaway account only");
        }
        if (!$user) {
            $user = Repo::user()->newDataObject();
            $user->setUsername($username);
            foreach ($this->asLocalized($plan['givenName'], $locale) as $nameLocale => $value) {
                $user->setGivenName($value, $nameLocale);
            }
            foreach ($this->asLocalized($plan['familyName'], $locale) as $nameLocale => $value) {
                $user->setFamilyName($value, $nameLocale);
            }
            $user->setEmail($plan['email']);
            // Profile › Contact "Affiliation" (ContactForm::execute:
            // setAffiliation per locale, saved with the account).
            foreach ($this->asLocalized($plan['affiliation'] ?? null, $locale) as $affiliationLocale => $value) {
                $user->setAffiliation($value, $affiliationLocale);
            }
            $user->setDateRegistered(Core::getCurrentDate());
            $user->setInlineHelp(1);
            // bcrypt at cost 4, not the app's cost 12 (Validation::encryptCredentials):
            // a seeded user is a fixture, and cost 12 is ~250 ms of CPU per user
            // (some 400 users per OJS run). password_verify accepts any cost; a
            // real form login rehashes the row at cost 12 (rehash-on-login), and
            // the changed hash signs out every other session of the user
            // (AuthenticateSession compares the hash it stored in the session).
            // A scenario user belongs to one test, so that stays inside the
            // test; the bootstrap roster is shared by every worker, and one
            // test's form login of a persona signed the others' sessions of
            // it out at the start of each run on a fresh install (ci-triage
            // "U01 S1's dashboard landing right after a cold bootstrap"), so
            // the roster gets the app's own hash, which never needs a rehash.
            $user->setPassword(
                $this->appHash
                    ? Validation::encryptCredentials($username, $plan['password'])
                    : password_hash($plan['password'], PASSWORD_BCRYPT, ['cost' => 4])
            );
            Repo::user()->add($user);
        }

        if (($plan['orcid'] ?? null) !== null) {
            // The same setter the profile popup's completion runs
            // (AuthorizeUserData::execute(), case 'profile'), fed the array
            // shape getOrcidOAuthAccessData() builds there.
            $user->setVerifiedOrcidOAuthData(
                self::orcidOAuthData($context, $plan['orcid'], $plan['orcidIsVerified'], $username)
            );
            Repo::user()->edit($user);
        }

        // Ended periods first, so "Remove Role" below ends only the period
        // it just gave (endAssignments ends every active row of the role).
        foreach ($plan['pastRoles'] ?? [] as $pastPlan) {
            $userGroup = $this->resolveUserGroup($context, $pastPlan['role'], "{$pastPlan['specPath']}.role");
            $this->seedPastRole($context, $user, $userGroup, $pastPlan, $plan['masthead'][$pastPlan['role']] ?? true);
        }

        $assignedGroups = [];
        foreach ($plan['roles'] as $i => $roleKey) {
            $userGroup = $this->resolveUserGroup($context, (string) $roleKey, "{$plan['specPath']}.roles.{$i}");
            // Explicit masthead = true: every admin-driven enrolment path
            // ends with an explicit boolean, and the default is "appears on
            // the masthead" — the users-grid edit form pre-checks every
            // masthead checkbox and sweeps the value on save
            // (UserForm::saveUserGroupAssignments ~188-194, verified live
            // 2026-08-23: grid enrolment writes masthead = 1), the reviewer
            // enrol forms pass true, and the invitation flow stores the
            // inviter's explicit choice (reviewers forced true). NULL is only
            // left by self-registration — not the path the roster mirrors.
            // Whether a user actually shows on the public masthead is still
            // gated by the GROUP's own masthead flag, exactly as in the app.
            // `masthead` (U07): false is the "Does not appear on the
            // masthead" choice, stored on the same row as the invitation's
            // acceptance stores it (UserRoleAssignmentReceiveController::
            // finalize → assignUserToGroup(…, masthead)).
            Repo::userGroup()->assignUserToGroup($user->getId(), $userGroup->id, null, null, $plan['masthead'][(string) $roleKey] ?? true);
            $assignedGroups[] = $userGroup;
        }

        // Sub-editor assignments (sections OJS/OPS, series OMP) — the same
        // subeditor_submission_group row the section/series form writes.
        if ($plan['structures']) {
            $subEditorGroup = $this->pickSubEditorGroup($assignedGroups);
            if (!$subEditorGroup) {
                throw new SpecException(
                    "{$plan['specPath']}.{$plan['structureKey']}",
                    "User \"{$username}\" has no sub-editor-capable role for a {$plan['structureKey']} assignment"
                );
            }
            $subEditorsDao = DAORegistry::getDAO('SubEditorsDAO'); /** @var \PKP\context\SubEditorsDAO $subEditorsDao */
            foreach ($plan['structures'] as $identifier) {
                $structureId = $resolveStructureId((string) $identifier);
                if (!$structureId) {
                    throw new SpecException(
                        "{$plan['specPath']}.{$plan['structureKey']}",
                        "Unknown {$plan['structureKey']} identifier \"{$identifier}\" for user \"{$username}\""
                    );
                }
                $subEditorsDao->insertEditor(
                    $context->getId(),
                    $structureId,
                    $user->getId(),
                    Application::ASSOC_TYPE_SECTION,
                    $subEditorGroup->id
                );
            }
        }

        // Profile › "Notifications" › "Save" by the account itself (U65),
        // after its roles and before a disable (a disabled account cannot
        // sign in to save it).
        if (($plan['notifications'] ?? []) !== []) {
            $this->saveNotifications($context, $user, $plan['notifications'], $plan['specPath']);
        }

        if ($plan['disabled'] ?? false) {
            $user = $this->disable($user);
        }

        return $user;
    }

    /**
     * One ended role period, the way the screens make one: the role given
     * (assignUserToGroup with the masthead choice, as an accepted
     * invitation gives it) and then ended by the users list's "Edit" ›
     * "Remove Role" (PUT users/{id}/endRole/{userGroupId} →
     * Repository::endAssignments: date_end now, the masthead and history
     * caches cleared, the audit-log line; the controller's "role ended"
     * email is the one mail not sent, seeding mail being dropped anyway).
     * No screen gives a start date before today (the invitation moves a
     * past one to today) nor an end date before today, so an earlier
     * `dateStart` goes through assignUserToGroup's own parameter and an
     * earlier `dateEnd` is written onto the ended row afterwards (D9: no
     * service sets it), the two caches cleared again for it.
     */
    protected function seedPastRole(Context $context, User $user, UserGroup $userGroup, array $pastPlan, bool $masthead): void
    {
        $userUserGroup = Repo::userGroup()->assignUserToGroup(
            $user->getId(),
            $userGroup->id,
            $pastPlan['dateStart'],
            null,
            (int) $userGroup->roleId === Role::ROLE_ID_REVIEWER ? true : $masthead
        );
        Repo::userGroup()->endAssignments($context->getId(), $user->getId(), $userGroup->id);
        if ($pastPlan['dateEnd'] !== null && $pastPlan['dateEnd'] !== Carbon::today()->toDateString()) {
            UserUserGroup::query()
                ->withUserUserGroupId((int) $userUserGroup->getKey())
                ->update(['date_end' => $pastPlan['dateEnd'] . ' 00:00:00']);
            \PKP\userGroup\Repository::forgetEditorialCache($context->getId());
            \PKP\userGroup\Repository::forgetEditorialHistoryCache($context->getId());
        }
    }

    /**
     * Disable the account the way Settings › Users & Roles › Users does:
     * the row's "Disable" opens the grid's "Disable User" window
     * (UserGridHandler::editDisableUser) and its "OK" posts
     * `disableReason` to disableUser, which runs UserDisableForm::execute
     * (the user's disabled flag and reason, the audit-log line, the
     * account's other sessions ended). The reason box is posted empty, as
     * it is when left unfilled. Acting as the seeding admin, who has full
     * administration over a throwaway account. Not run: the form's POST
     * and CSRF checks (the request's) and the grid's refresh event.
     */
    protected function disable(User $user): User
    {
        $form = new \PKP\controllers\grid\settings\user\form\UserDisableForm($user->getId(), false);
        $form->setData('disableReason', '');
        return $form->execute();
    }

    /**
     * Resolve a role key (`manager`, `sectionEditor`, `externalReviewer`, …)
     * against the context's default groups by nameLocaleKey.
     */
    public function resolveUserGroup(Context $context, string $roleKey, string $specKey): UserGroup
    {
        // A role `customRoles[]` created in this build, by its entry's key.
        $customId = $this->customRoles[$roleKey]['id'] ?? null;
        if ($customId !== null) {
            $custom = UserGroup::findById($customId, $context->getId());
            if ($custom) {
                return $custom;
            }
        }
        $groups = UserGroup::withContextIds([$context->getId()])->get();
        foreach ($groups as $group) {
            if ($group->nameLocaleKey === "default.groups.name.{$roleKey}") {
                return $group;
            }
        }
        $available = $groups
            ->map(fn (UserGroup $group) => preg_replace('/^default\.groups\.name\./', '', (string) $group->nameLocaleKey))
            ->filter()
            ->merge(array_keys(array_filter($this->customRoles, fn (array $role) => $role['id'] !== null)))
            ->unique()
            ->sort()
            ->values()
            ->join(', ');
        throw new SpecException($specKey, "Unknown role key \"{$roleKey}\". This app's keys: {$available}");
    }

    /** Wrap a bare string under the given locale; pass locale maps through. */
    private function asLocalized(mixed $value, string $locale): array
    {
        if ($value === null) {
            return [];
        }
        return is_array($value) ? $value : [$locale => $value];
    }

    /**
     * The group a sub-editor assignment rides on: a sub-editor-role group
     * first, else an editor (manager-role) group.
     *
     * @param UserGroup[] $groups
     */
    private function pickSubEditorGroup(array $groups): ?UserGroup
    {
        foreach ($groups as $group) {
            if ((int) $group->roleId === Role::ROLE_ID_SUB_EDITOR) {
                return $group;
            }
        }
        foreach ($groups as $group) {
            if ((int) $group->roleId === Role::ROLE_ID_MANAGER) {
                return $group;
            }
        }
        return null;
    }
}
