<?php

/**
 * @file classes/testing/PaymentSettingsSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class PaymentSettingsSeeder
 *
 * @brief The context scenario's `payments` setup fields {enabled?,
 * currency?, paymentPluginName?, manualInstructions?}: Settings ›
 * Distribution › "Payments" › "Save" (PKPPaymentSettingsForm with the
 * payment plugins' own fields), run as PUT _payments through
 * PKPBackendPaymentsSettingsController::edit with the body the form sends,
 * the plugins' settings hooks included. A journal (U51, with the "Payment
 * Types" fees of its own SubscriptionSeeder) and a press (U73) have the
 * tab; a preprint server has none, so OPS reads no `payments` key (400).
 */

namespace PKP\testing;

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Http\Request;
use PKP\API\v1\_payments\PKPBackendPaymentsSettingsController;
use PKP\context\Context;
use PKP\core\Registry;
use PKP\db\DAORegistry;

class PaymentSettingsSeeder
{
    /** The "Payment Plugins" list's values (the installed paymethod plugins of both apps). */
    public const PLUGINS = ['ManualPayment' => 'Manual Fee Payment', 'PaypalPayment' => 'Paypal Fee Payment'];

    /**
     * The tab's fields off the `payments` child spec (parse phase, no
     * writes): `enabled` the "Enable" box (default true), `currency` a
     * "Currency" code, `paymentPluginName` a "Payment Plugins" value,
     * `manualInstructions` the "Manual Payment Instructions" box.
     */
    public static function parse(Spec $spec): array
    {
        $setup = [];
        $enabled = $spec->get('enabled', true);
        if (!is_bool($enabled)) {
            throw new SpecException('payments.enabled', 'payments.enabled must be a boolean (the "Enable" box)');
        }
        $setup['enabled'] = $enabled;
        foreach (['currency', 'paymentPluginName', 'manualInstructions'] as $key) {
            $value = $spec->get($key);
            if ($value !== null && !is_string($value)) {
                throw new SpecException("payments.{$key}", "payments.{$key} must be a string");
            }
            $setup[$key] = $value;
        }
        if ($setup['paymentPluginName'] !== null && !array_key_exists($setup['paymentPluginName'], self::PLUGINS)) {
            throw new SpecException('payments.paymentPluginName', 'payments.paymentPluginName must be ManualPayment ("Manual Fee Payment") or PaypalPayment ("Paypal Fee Payment"), the "Payment Plugins" list');
        }
        return $setup;
    }

    /**
     * "Save": the form sends every field it shows, each payment plugin's
     * included, form-encoded (a box as "true" / "false"); the seed's values
     * replace the shown ones. The caller acts as `admin` with the router's
     * context on the context ($fresh reads it afresh, as the request does).
     */
    public static function save(callable $fresh, array $setup): void
    {
        $context = $fresh();
        $contextId = (int) $context->getId();
        $pluginSettingsDao = DAORegistry::getDAO('PluginSettingsDAO'); /** @var \PKP\plugins\PluginSettingsDAO $pluginSettingsDao */
        $pluginSetting = fn (string $plugin, string $name) => $pluginSettingsDao->getSetting($contextId, $plugin, $name);
        $body = [
            'paymentsEnabled' => $setup['enabled'] ? 'true' : 'false',
            'currency' => $setup['currency'] ?? (string) $context->getData('currency'),
            'paymentPluginName' => $setup['paymentPluginName'] ?? (string) $context->getData('paymentPluginName'),
            'manualInstructions' => $setup['manualInstructions'] ?? (string) $pluginSetting('manualpaymentplugin', 'manualInstructions'),
            'testMode' => $pluginSetting('paypalpaymentplugin', 'testMode') ? 'true' : 'false',
            'accountName' => (string) $pluginSetting('paypalpaymentplugin', 'accountName'),
            'clientId' => (string) $pluginSetting('paypalpaymentplugin', 'clientId'),
            'secret' => (string) $pluginSetting('paypalpaymentplugin', 'secret'),
        ];
        $request = ApiCall::request(Request::class, 'PUT', $body, [], 'payments', 'The "Payments" form would be refused');
        ApiCall::answer(ApiCall::controller(PKPBackendPaymentsSettingsController::class)->edit($request), 'payments', 'The "Payments" form was refused');
    }

    /** save() as `admin` with the router's context on the context (a press's overlay). */
    public static function execute(Context $context, array $setup): void
    {
        $previousActingUser = Registry::get('user');
        Registry::set('user', Repo::user()->getByUsername('admin', true));
        $contextId = (int) $context->getId();
        $fresh = fn () => Application::getContextDAO()->getById($contextId);
        $restore = ContextFactory::forceRequestContext($fresh());
        try {
            self::save($fresh, $setup);
        } finally {
            $restore();
            Registry::set('user', $previousActingUser);
        }
    }
}
