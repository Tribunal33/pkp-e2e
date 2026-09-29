<?php

/**
 * @file classes/testing/SubscriptionSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class SubscriptionSeeder
 *
 * @brief The OJS context scenario's subscription keys (U51), each the save
 * of the screen that makes the state, run through the screen's own
 * handler code as `admin` (a manager of every scratch journal), in this
 * order:
 *  - `payments` {enabled?, currency?, paymentPluginName?,
 *    manualInstructions?} — Settings › Distribution › "Payments" › "Save"
 *    (the shared PKP\testing\PaymentSettingsSeeder, which a press uses
 *    too); and its {publicationFee?, purchaseArticleFee?,
 *    purchaseIssueFee?, membershipFee?, restrictOnlyPdf?} — the "Payments"
 *    page › "Payment Types" › "Save" (PaymentsHandler::savePaymentTypes,
 *    PaymentTypesForm on the POST).
 *  - `subscriptionName`, `subscriptionEmail`, `subscriptionPhone`,
 *    `subscriptionMailingAddress`, `subscriptionAdditionalInformation`,
 *    `subscriptionExpiryPartial` and the four expiry-reminder lists — the
 *    "Payments" page › "Subscription Policies" › "Save"
 *    (PaymentsHandler::saveSubscriptionPolicies, SubscriptionPolicyForm on
 *    the POST, the unnamed fields posted as the tab shows them).
 *  - `institutions[]` is the app-neutral PKP\testing\InstitutionSeeder,
 *    which the context scenario core runs after users[] and before this
 *    seeder (U66); a subscription names one of its entries and receives
 *    the ids it created.
 *  - `subscriptionTypes[]` {name*, description?, cost*, currency*,
 *    duration?, format?, institutional?, membership?, hidden?} — "Payments"
 *    › "Subscription Types" › "Create New Subscription Type" › "Save"
 *    (SubscriptionTypeGridHandler::updateSubscriptionType,
 *    SubscriptionTypeForm on the POST).
 *  - `subscriptions[]` {user*, type*, status?, dateStart?, dateEnd?,
 *    membership?, referenceNumber?, notes?; institutional: institution*,
 *    mailingAddress?, domain?} — "Individual Subscriptions" (or
 *    "Institutional Subscriptions", an entry naming an `institution`) ›
 *    "Create New Subscription" › "Save" (the grid's
 *    IndividualSubscriptionForm / InstitutionalSubscriptionForm on the
 *    POST, the email box unticked).
 * Each legacy form runs through FormPost, so its refusals are the seed's
 * 400s. Journal only, but for the `payments` setup fields, which OMP reads
 * too (U73); OPS reads none of these keys (400).
 */

namespace APP\testing;

use APP\controllers\grid\subscriptions\IndividualSubscriptionForm;
use APP\controllers\grid\subscriptions\InstitutionalSubscriptionForm;
use APP\controllers\grid\subscriptions\SubscriptionTypeForm;
use APP\core\Application;
use APP\facades\Repo;
use APP\subscription\form\PaymentTypesForm;
use APP\subscription\form\SubscriptionPolicyForm;
use APP\subscription\Subscription;
use APP\subscription\SubscriptionType;
use PKP\context\Context;
use PKP\core\Registry;
use PKP\db\DAORegistry;
use PKP\testing\ContextFactory;
use PKP\testing\FormPost;
use PKP\testing\PaymentSettingsSeeder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class SubscriptionSeeder
{
    /** Status words → the subscription window's "Status" list. */
    public const STATUSES = [
        'active' => Subscription::SUBSCRIPTION_STATUS_ACTIVE,
        'needsInformation' => Subscription::SUBSCRIPTION_STATUS_NEEDS_INFORMATION,
        'needsApproval' => Subscription::SUBSCRIPTION_STATUS_NEEDS_APPROVAL,
        'awaitingManualPayment' => Subscription::SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT,
        'awaitingOnlinePayment' => Subscription::SUBSCRIPTION_STATUS_AWAITING_ONLINE_PAYMENT,
        'other' => Subscription::SUBSCRIPTION_STATUS_OTHER,
    ];

    /** Format words → the type window's "Format" list ("Online", "Print", "Print and Online"). */
    public const FORMATS = [
        'online' => SubscriptionType::SUBSCRIPTION_TYPE_FORMAT_ONLINE,
        'print' => SubscriptionType::SUBSCRIPTION_TYPE_FORMAT_PRINT,
        'printOnline' => SubscriptionType::SUBSCRIPTION_TYPE_FORMAT_PRINT_ONLINE,
    ];

    /** The "Subscription Policies" text boxes a seed may fill. */
    public const POLICY_TEXTS = ['subscriptionName', 'subscriptionEmail', 'subscriptionPhone', 'subscriptionMailingAddress'];

    /** The four "Subscription Expiry Reminders" lists and their largest choice. */
    public const POLICY_REMINDERS = [
        'numMonthsBeforeSubscriptionExpiryReminder' => 12,
        'numWeeksBeforeSubscriptionExpiryReminder' => 3,
        'numMonthsAfterSubscriptionExpiryReminder' => 12,
        'numWeeksAfterSubscriptionExpiryReminder' => 3,
    ];

    /** The "Payment Types" tab's fee boxes. */
    public const FEES = ['publicationFee', 'purchaseIssueFee', 'purchaseArticleFee', 'membershipFee'];

    /**
     * Parse phase: every key, its shape and the references between the
     * lists (a subscription's type and institution by name, among this
     * request's: $institutionNames are the core's institutions[] entries;
     * its user among $members, the new journal's users: `admin`, its
     * manager, and the users[] entries). No writes. Returns null when no
     * key is given.
     */
    public static function parse(Spec $root, string $primaryLocale, array $members, array $institutionNames): ?array
    {
        $plan = [
            'payments' => self::parsePayments($root),
            'policies' => self::parsePolicies($root, $primaryLocale),
            'types' => [],
            'subscriptions' => [],
        ];

        foreach ($root->childList('subscriptionTypes') as $spec) {
            $name = $spec->require('name');
            if (!is_string($name) || trim($name) === '') {
                throw new SpecException("{$spec->path}.name", 'name must be a non-empty string (the "Name of Type" box, primary language)');
            }
            if (isset($plan['types'][$name])) {
                throw new SpecException("{$spec->path}.name", "Two subscription types named \"{$name}\": a subscription names its type, so names are unique in a seed");
            }
            $description = $spec->get('description');
            if ($description !== null && !is_string($description)) {
                throw new SpecException("{$spec->path}.description", 'description must be a string (the "Description" box, primary language)');
            }
            $cost = $spec->require('cost');
            if (!is_int($cost) && !is_float($cost) && !is_string($cost)) {
                throw new SpecException("{$spec->path}.cost", 'cost must be a number (the "Cost" box)');
            }
            $currency = $spec->require('currency');
            if (!is_string($currency)) {
                throw new SpecException("{$spec->path}.currency", 'currency must be a currency code (the "Currency" list, e.g. "USD")');
            }
            $duration = $spec->get('duration');
            if ($duration !== null && (!is_int($duration) || $duration < 0)) {
                throw new SpecException("{$spec->path}.duration", 'duration must be a whole number of months, or absent for a non-expiring type (the "Duration" box left empty)');
            }
            $format = $spec->get('format', 'online');
            if (!is_string($format) || !isset(self::FORMATS[$format])) {
                throw new SpecException("{$spec->path}.format", 'format must be one of: ' . implode(', ', array_keys(self::FORMATS)) . ' (the "Format" list: "Online", "Print", "Print and Online")');
            }
            $flags = [];
            foreach (['institutional', 'membership', 'hidden'] as $flag) {
                $value = $spec->get($flag, false);
                if (!is_bool($value)) {
                    throw new SpecException("{$spec->path}.{$flag}", "{$flag} must be a boolean");
                }
                $flags[$flag] = $value;
            }
            $plan['types'][$name] = [
                'name' => $name,
                'description' => $description,
                'cost' => (string) $cost,
                'currency' => $currency,
                'duration' => $duration,
                'format' => self::FORMATS[$format],
                'path' => $spec->path,
            ] + $flags;
        }

        foreach ($root->childList('subscriptions') as $spec) {
            $user = $spec->require('user');
            if (!is_string($user) || !in_array($user, $members, true)) {
                throw new SpecException("{$spec->path}.user", 'user must be admin or a username of users[] in this request: the window\'s "Locate a User" lists the journal\'s users only');
            }
            $typeName = $spec->require('type');
            if (!is_string($typeName) || !isset($plan['types'][$typeName])) {
                throw new SpecException("{$spec->path}.type", 'type must name an entry of subscriptionTypes[] in this request');
            }
            $institutional = $spec->has('institution');
            if ($plan['types'][$typeName]['institutional'] !== $institutional) {
                throw new SpecException("{$spec->path}.type", $institutional
                    ? "\"{$typeName}\" is an individual type; the \"Institutional Subscriptions\" window offers institutional types only"
                    : "\"{$typeName}\" is an institutional type: an institutional subscription names its institution (the \"Institutional Subscriptions\" window)");
            }
            $status = $spec->get('status', 'active');
            if (!is_string($status) || !isset(self::STATUSES[$status])) {
                throw new SpecException("{$spec->path}.status", 'status must be one of: ' . implode(', ', array_keys(self::STATUSES)) . ' (the window\'s "Status" list)');
            }
            $dates = [];
            foreach (['dateStart', 'dateEnd'] as $key) {
                $value = $spec->get($key);
                if ($value !== null) {
                    $parsed = is_string($value) ? \DateTime::createFromFormat('!Y-m-d', $value) : false;
                    if (!$parsed || $parsed->format('Y-m-d') !== $value) {
                        throw new SpecException("{$spec->path}.{$key}", "{$key} must be a date as YYYY-MM-DD (the date picker's posted value)");
                    }
                }
                $dates[$key] = $value;
            }
            $texts = [];
            foreach (array_merge(['referenceNumber', 'notes'], $institutional ? ['mailingAddress', 'domain'] : ['membership']) as $key) {
                $value = $spec->get($key);
                if ($value !== null && !is_string($value)) {
                    throw new SpecException("{$spec->path}.{$key}", "{$key} must be a string");
                }
                $texts[$key] = $value;
            }
            $institution = null;
            if ($institutional) {
                $institution = $spec->get('institution');
                if (!is_string($institution) || !in_array($institution, $institutionNames, true)) {
                    throw new SpecException("{$spec->path}.institution", 'institution must name an entry of institutions[] in this request');
                }
            }
            $plan['subscriptions'][] = [
                'user' => $user,
                'type' => $typeName,
                'institution' => $institution,
                'status' => self::STATUSES[$status],
                'path' => $spec->path,
            ] + $dates + $texts;
        }

        $empty = $plan['payments'] === null && $plan['policies'] === null && !$plan['types'] && !$plan['subscriptions'];
        return $empty ? null : $plan;
    }

    /** `payments`: the two screens' fields; null without the key. */
    protected static function parsePayments(Spec $root): ?array
    {
        $spec = $root->child('payments');
        if ($spec === null) {
            return null;
        }
        $setup = PaymentSettingsSeeder::parse($spec);
        $types = [];
        foreach (self::FEES as $fee) {
            if ($spec->has($fee)) {
                $value = $spec->get($fee);
                if ((!is_int($value) && !is_float($value)) || $value < 0) {
                    throw new SpecException("payments.{$fee}", "payments.{$fee} must be a number of 0 or more (the \"Payment Types\" box; the form refuses anything else)");
                }
                $types[$fee] = $value;
            }
        }
        if ($spec->has('restrictOnlyPdf')) {
            $value = $spec->get('restrictOnlyPdf');
            if (!is_bool($value)) {
                throw new SpecException('payments.restrictOnlyPdf', 'payments.restrictOnlyPdf must be a boolean (the "Only Restrict Access to PDF version of issues and articles" box)');
            }
            $types['restrictOnlyPdf'] = $value;
        }
        return ['setup' => $setup, 'types' => $types];
    }

    /** The "Subscription Policies" root keys; null when none is given. */
    protected static function parsePolicies(Spec $root, string $primaryLocale): ?array
    {
        $policies = [];
        foreach (self::POLICY_TEXTS as $key) {
            if ($root->has($key)) {
                $value = $root->get($key);
                if (!is_string($value)) {
                    throw new SpecException($key, "{$key} must be a string (a \"Subscription Policies\" box)");
                }
                $policies[$key] = $value;
            }
        }
        if ($root->has('subscriptionAdditionalInformation')) {
            $value = $root->get('subscriptionAdditionalInformation');
            if (!is_string($value) && !is_array($value)) {
                throw new SpecException('subscriptionAdditionalInformation', 'subscriptionAdditionalInformation must be a string or a locale map (the "Subscription Information" box)');
            }
            $policies['subscriptionAdditionalInformation'] = $root->localized('subscriptionAdditionalInformation', $primaryLocale);
        }
        if ($root->has('subscriptionExpiryPartial')) {
            $value = $root->get('subscriptionExpiryPartial');
            if (!is_bool($value)) {
                throw new SpecException('subscriptionExpiryPartial', 'subscriptionExpiryPartial must be a boolean (true "Partial expiry", false "Full expiry")');
            }
            $policies['subscriptionExpiryPartial'] = $value ? '1' : '0';
        }
        foreach (self::POLICY_REMINDERS as $key => $max) {
            if ($root->has($key)) {
                $value = $root->get($key);
                if (!is_int($value) || $value < 0 || $value > $max) {
                    throw new SpecException($key, "{$key} must be a whole number from 0 (\"Disabled\") to {$max}, as its list offers");
                }
                $policies[$key] = (string) $value;
            }
        }
        return $policies === [] ? null : $policies;
    }

    /**
     * Execute phase, as `admin` with the router's context on the journal;
     * the context is read afresh before each save, as each screen's request
     * reads it. $institutionIds maps the core's institutions[] names to the
     * ids InstitutionSeeder created. Returns the response entries.
     */
    public static function execute(Context $context, array $plan, array $institutionIds): array
    {
        $admin = Repo::user()->getByUsername('admin', true);
        $previousActingUser = Registry::get('user');
        Registry::set('user', $admin);
        $contextId = (int) $context->getId();
        $fresh = fn () => Application::getContextDAO()->getById($contextId);
        $restore = ContextFactory::forceRequestContext($fresh());
        $response = [];
        try {
            if ($plan['payments'] !== null) {
                PaymentSettingsSeeder::save($fresh, $plan['payments']['setup']);
                if ($plan['payments']['types'] !== []) {
                    ContextFactory::forceRequestContext($fresh());
                    self::savePaymentTypes($plan['payments']['types']);
                }
            }
            if ($plan['policies'] !== null) {
                ContextFactory::forceRequestContext($fresh());
                self::savePolicies($fresh(), $plan['policies']);
            }
            ContextFactory::forceRequestContext($fresh());

            $typeIds = [];
            foreach ($plan['types'] as $name => $type) {
                $typeIds[$name] = self::addType($fresh(), $type);
                $response['subscriptionTypes'][] = ['id' => $typeIds[$name], 'name' => $name, 'institutional' => $type['institutional']];
            }

            foreach ($plan['subscriptions'] as $subscription) {
                $response['subscriptions'][] = self::addSubscription($fresh(), $subscription, $plan['types'][$subscription['type']], $typeIds, $institutionIds);
            }
        } finally {
            $restore();
            Registry::set('user', $previousActingUser);
        }
        return $response;
    }

    /** "Payment Types" › "Save": PaymentTypesForm on the POST, the unnamed boxes as the tab shows them. */
    protected static function savePaymentTypes(array $types): void
    {
        $form = new PaymentTypesForm();
        $form->initData();
        $vars = [];
        foreach (self::FEES as $fee) {
            $vars[$fee] = array_key_exists($fee, $types) ? (string) $types[$fee] : (string) $form->getData($fee);
        }
        if ($types['restrictOnlyPdf'] ?? $form->getData('restrictOnlyPdf')) {
            $vars['restrictOnlyPdf'] = '1';
        }
        FormPost::run(new PaymentTypesForm(), $vars, 'payments', 'The "Payment Types" tab would refuse this');
    }

    /** "Subscription Policies" › "Save": the tab's whole POST, the unnamed fields as it shows them. */
    protected static function savePolicies(Context $context, array $policies): void
    {
        $form = new SubscriptionPolicyForm();
        $form->initData();
        $vars = [];
        foreach (self::POLICY_TEXTS as $key) {
            $vars[$key] = $policies[$key] ?? (string) $form->getData($key);
        }
        $shownInformation = (array) $form->getData('subscriptionAdditionalInformation');
        $vars['subscriptionAdditionalInformation'] = [];
        foreach ((array) $context->getSupportedFormLocales() as $locale) {
            $vars['subscriptionAdditionalInformation'][$locale] = $policies['subscriptionAdditionalInformation'][$locale] ?? (string) ($shownInformation[$locale] ?? '');
        }
        $vars['subscriptionExpiryPartial'] = $policies['subscriptionExpiryPartial'] ?? ($form->getData('subscriptionExpiryPartial') ? '1' : '0');
        foreach (array_keys(self::POLICY_REMINDERS) as $key) {
            $vars[$key] = $policies[$key] ?? (string) (int) $form->getData($key);
        }
        // The boxes: posted ("1") only when ticked; the four online-payment
        // boxes are greyed (not posted) while payments are not set up.
        $paymentsConfigured = Application::get()->getPaymentManager($context)->isConfigured();
        foreach (['enableOpenAccessNotification', 'enableSubscriptionOnlinePaymentNotificationPurchaseIndividual', 'enableSubscriptionOnlinePaymentNotificationPurchaseInstitutional', 'enableSubscriptionOnlinePaymentNotificationRenewIndividual', 'enableSubscriptionOnlinePaymentNotificationRenewInstitutional'] as $box) {
            if ($form->getData($box) && ($box === 'enableOpenAccessNotification' || $paymentsConfigured)) {
                $vars[$box] = '1';
            }
        }
        FormPost::run(new SubscriptionPolicyForm(), $vars, 'subscriptionEmail', 'The "Subscription Policies" tab would refuse this');
    }

    /** "Create New Subscription Type" › "Save": SubscriptionTypeForm on the POST. */
    protected static function addType(Context $context, array $type): int
    {
        $localized = fn (?string $value) => array_merge(
            array_fill_keys((array) $context->getSupportedFormLocales(), ''),
            [$context->getPrimaryLocale() => (string) $value]
        );
        $vars = [
            'name' => $localized($type['name']),
            'description' => $localized($type['description']),
            'currency' => $type['currency'],
            'cost' => $type['cost'],
            'format' => (string) $type['format'],
            'duration' => $type['duration'] === null ? '' : (string) $type['duration'],
        ];
        // The "Subscriptions" radios arrive with neither chosen; the
        // save reads an absent choice as "Individual".
        if ($type['institutional']) {
            $vars['institutional'] = '1';
        }
        if ($type['membership']) {
            $vars['membership'] = '1';
        }
        if ($type['hidden']) {
            $vars['disable_public_display'] = '1';
        }
        $subscriptionTypeDao = DAORegistry::getDAO('SubscriptionTypeDAO'); /** @var \APP\subscription\SubscriptionTypeDAO $subscriptionTypeDao */
        $before = array_map(fn ($t) => $t->getId(), $subscriptionTypeDao->getByJournalId($context->getId())->toArray());
        FormPost::run(new SubscriptionTypeForm($context->getId()), $vars, $type['path'], 'The subscription type window would refuse this');
        $after = array_map(fn ($t) => $t->getId(), $subscriptionTypeDao->getByJournalId($context->getId())->toArray());
        return (int) current(array_diff($after, $before));
    }

    /**
     * "Create New Subscription" › "Save": the grid's form on the POST.
     * Dates default to today and, for an expiring type, today plus the
     * type's duration; a non-expiring type posts both boxes empty.
     */
    protected static function addSubscription(Context $context, array $plan, array $type, array $typeIds, array $institutionIds): array
    {
        $user = Repo::user()->getByUsername($plan['user'], true);
        $vars = [
            'userId' => (string) $user->getId(),
            'typeId' => (string) $typeIds[$plan['type']],
            'status' => (string) $plan['status'],
            'dateStart' => '',
            'dateEnd' => '',
            'referenceNumber' => (string) ($plan['referenceNumber'] ?? ''),
            'notes' => (string) ($plan['notes'] ?? ''),
        ];
        if ($type['duration'] !== null) {
            $start = $plan['dateStart'] ?? date('Y-m-d');
            $vars['dateStart'] = $start;
            $vars['dateEnd'] = $plan['dateEnd'] ?? (new \DateTime($start))->modify("+{$type['duration']} months")->format('Y-m-d');
        } else {
            $vars['dateStart'] = (string) ($plan['dateStart'] ?? '');
            $vars['dateEnd'] = (string) ($plan['dateEnd'] ?? '');
        }
        $request = Application::get()->getRequest();
        if ($plan['institution'] !== null) {
            $vars['institutionId'] = (string) $institutionIds[$plan['institution']];
            $vars['institutionMailingAddress'] = (string) ($plan['mailingAddress'] ?? '');
            $vars['domain'] = (string) ($plan['domain'] ?? '');
            $form = new InstitutionalSubscriptionForm($request);
        } else {
            $vars['membership'] = (string) ($plan['membership'] ?? '');
            $form = new IndividualSubscriptionForm($request);
        }
        FormPost::run($form, $vars, $plan['path'], 'The subscription window would refuse this');
        return array_filter([
            'id' => (int) $form->subscription->getId(),
            'user' => $plan['user'],
            'type' => $plan['type'],
            'institution' => $plan['institution'],
        ], fn ($v) => $v !== null);
    }
}
