<?php

/**
 * @file classes/testing/InstitutionSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class InstitutionSeeder
 *
 * @brief The context scenario's `institutions[]` {name*, ipRanges?, ror?}
 * (U51 on a journal, U66 on the three apps): each entry is Settings ›
 * "Institutions" › "Add Institution" › "Save", the panel's POST
 * institutions run through PKPInstitutionController::add itself (ApiCall)
 * as `admin` (a manager of every scratch context) with the router's
 * context on the new context. `name` is typed into the primary language's
 * box (the other form languages' boxes arrive empty, as null), `ipRanges`
 * one line of the "IP ranges" box each, `ror` the "ROR" box; an empty box
 * arrives as null (ConvertEmptyStringsToNull). The controller's own
 * refusals ("Invalid IP range", the ROR format) are the seed's 400s. Names
 * are unique in a seed, since an OJS subscription names its institution
 * (APP\testing\SubscriptionSeeder reads the ids this seeder returns).
 */

namespace PKP\testing;

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Http\Request;
use PKP\API\v1\institutions\PKPInstitutionController;
use PKP\context\Context;
use PKP\core\Registry;

class InstitutionSeeder
{
    /**
     * Parse phase: the `institutions[]` entries keyed by name, in the order
     * given, each checked by the institution repository's own validate
     * (the one PKPInstitutionController::add runs) against the new
     * context's form languages, so a refused entry ("Invalid IP range", a
     * malformed ROR) is a 400 before the context exists. No writes.
     *
     * @param string[] $formLocales the new context's form languages
     *
     * @return array<string, array{name: string, ror: ?string, ipRanges: string[], path: string}>
     */
    public static function parse(Spec $root, string $primaryLocale, array $formLocales): array
    {
        $plans = [];
        foreach ($root->childList('institutions') as $spec) {
            $name = $spec->require('name');
            if (!is_string($name) || trim($name) === '') {
                throw new SpecException("{$spec->path}.name", 'name must be a non-empty string (the "Name" box)');
            }
            $ror = $spec->get('ror');
            if ($ror !== null && !is_string($ror)) {
                throw new SpecException("{$spec->path}.ror", 'ror must be a string (the "ROR" box)');
            }
            $ipRanges = $spec->get('ipRanges', []);
            if (!is_array($ipRanges) || !array_is_list($ipRanges) || array_filter($ipRanges, fn ($r) => !is_string($r) || trim($r) === '') !== []) {
                throw new SpecException("{$spec->path}.ipRanges", 'ipRanges must be a list of IP ranges, one per line of the "IP ranges" box (e.g. ["127.0.0.1", "10.0.0.0/8"])');
            }
            if (isset($plans[$name])) {
                throw new SpecException("{$spec->path}.name", "Two institutions named \"{$name}\": names are unique in a seed (a subscription names its institution)");
            }
            $plan = ['name' => $name, 'ror' => $ror, 'ipRanges' => $ipRanges, 'path' => $spec->path];
            $body = self::body($plan, $primaryLocale, $formLocales);
            // As the controller converts the box: one range per line.
            $body['ipRanges'] = $body['ipRanges'] === null ? null : array_map('trim', explode(PHP_EOL, $body['ipRanges']));
            // The context does not exist yet: its id, which the controller
            // sets, is the one field left to that save.
            $errors = Repo::institution()->validate(null, array_filter($body, fn ($v) => $v !== null), $formLocales, $primaryLocale);
            unset($errors['contextId']);
            if ($errors !== []) {
                throw new SpecException($spec->path, 'The "Add Institution" form would be refused: ' . json_encode($errors));
            }
            $plans[$name] = $plan;
        }
        return $plans;
    }

    /**
     * Execute phase, as `admin` with the router's context on the context,
     * read afresh before each save as the panel's request reads it. Returns
     * the response entries, {id, name} in the order seeded.
     *
     * @return array<int, array{id: int, name: string}>
     */
    public static function execute(Context $context, array $plans): array
    {
        if ($plans === []) {
            return [];
        }
        $previousActingUser = Registry::get('user');
        Registry::set('user', Repo::user()->getByUsername('admin', true));
        $contextId = (int) $context->getId();
        $restore = ContextFactory::forceRequestContext(Application::getContextDAO()->getById($contextId));
        $created = [];
        try {
            foreach ($plans as $name => $plan) {
                $fresh = Application::getContextDAO()->getById($contextId);
                ContextFactory::forceRequestContext($fresh);
                $created[] = ['id' => self::add($fresh, $plan), 'name' => $name];
            }
        } finally {
            $restore();
            Registry::set('user', $previousActingUser);
        }
        return $created;
    }

    /** "Add Institution" › "Save" (POST institutions); the router's context must be $context. */
    public static function add(Context $context, array $institution): int
    {
        $body = self::body($institution, $context->getPrimaryLocale(), (array) $context->getSupportedFormLocales());
        $request = ApiCall::request(Request::class, 'POST', $body, [], $institution['path'], 'The "Add Institution" form would be refused');
        $answer = ApiCall::answer(ApiCall::controller(PKPInstitutionController::class)->add($request), $institution['path'], 'The "Add Institution" form was refused');
        return (int) $answer['id'];
    }

    /**
     * The panel's POST body: "Name" in every form language, the primary
     * one typed; the ranges one per line; an emptied box as null
     * (ConvertEmptyStringsToNull).
     */
    protected static function body(array $institution, string $primaryLocale, array $formLocales): array
    {
        $name = array_fill_keys($formLocales, null);
        $name[$primaryLocale] = $institution['name'];
        return [
            'name' => $name,
            'ipRanges' => $institution['ipRanges'] ? implode(PHP_EOL, $institution['ipRanges']) : null,
            'ror' => ($institution['ror'] ?? '') === '' ? null : $institution['ror'],
        ];
    }
}
