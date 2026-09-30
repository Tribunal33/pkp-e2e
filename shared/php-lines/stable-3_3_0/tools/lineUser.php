<?php

if (PHP_SAPI !== 'cli') {
    exit('This script can only be executed from the command-line');
}

/**
 * @file tools/lineUser.php (stable-3_3_0 line)
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @brief Create one user on a 3.3 test install, optionally with a role in a
 * context, through the app's own DAOs (the lines without the `_test` API,
 * harness.md "The stable lines"). The probe kit's lineUser() runs it:
 *
 *   php tools/lineUser.php --username u --password p --email e \
 *       [--given G] [--family F] [--context <urlPath> --role manager|subeditor|assistant|author|reviewer|reader]
 *
 * Prints {"userId": n, "contextId": n|null, "userGroupId": n|null} as JSON.
 * Refuses a database without "test" in its name.
 */

require(dirname(__FILE__) . '/bootstrap.inc.php');

import('lib.pkp.classes.security.Role');
import('lib.pkp.classes.security.Validation');

class LineUserTool extends CommandLineTool
{
    public function usage()
    {
        echo "usage: php tools/lineUser.php --username u --password p --email e [--given G] [--family F] [--context path --role manager]\n";
    }

    public function execute()
    {
        $roles = [
            'manager' => ROLE_ID_MANAGER,
            'subeditor' => ROLE_ID_SUB_EDITOR,
            'assistant' => ROLE_ID_ASSISTANT,
            'author' => ROLE_ID_AUTHOR,
            'reviewer' => ROLE_ID_REVIEWER,
            'reader' => ROLE_ID_READER,
        ];
        $dbName = (string) Config::getVar('database', 'name');
        if (stripos($dbName, 'test') === false) {
            fwrite(STDERR, "lineUser: database \"{$dbName}\" does not look like a test DB — refusing.\n");
            exit(1);
        }
        $opts = [];
        for ($i = 0; $i < count($this->argv); $i++) {
            if (preg_match('/^--([a-z]+)$/', $this->argv[$i], $m)) {
                $opts[$m[1]] = isset($this->argv[$i + 1]) ? $this->argv[++$i] : '';
            }
        }
        foreach (['username', 'password', 'email'] as $required) {
            if (empty($opts[$required])) {
                $this->usage();
                exit(1);
            }
        }
        $roleId = null;
        if (!empty($opts['context'])) {
            $role = isset($opts['role']) ? $opts['role'] : 'manager';
            if (!isset($roles[$role])) {
                fwrite(STDERR, 'lineUser: --role is one of ' . implode(', ', array_keys($roles)) . "\n");
                exit(1);
            }
            $roleId = $roles[$role];
        }

        $site = DAORegistry::getDAO('SiteDAO')->getSite();
        $locale = $site->getPrimaryLocale();
        $userDao = DAORegistry::getDAO('UserDAO');
        $user = $userDao->newDataObject();
        $user->setUsername($opts['username']);
        $user->setEmail($opts['email']);
        $user->setPassword(Validation::encryptCredentials($opts['username'], $opts['password']));
        $user->setGivenName(isset($opts['given']) ? $opts['given'] : $opts['username'], $locale);
        $user->setFamilyName(isset($opts['family']) ? $opts['family'] : 'Scratch', $locale);
        $user->setDateRegistered(Core::getCurrentDate());
        $user->setMustChangePassword(0);
        $user->setDisabled(0);
        $user->setInlineHelp(1);
        $userId = $userDao->insertObject($user);

        $contextId = null;
        $userGroupId = null;
        if ($roleId) {
            $context = Application::getContextDAO()->getByPath($opts['context']);
            if (!$context) {
                fwrite(STDERR, "lineUser: no context with the path \"{$opts['context']}\" (the user {$userId} was created without a role)\n");
                exit(1);
            }
            $contextId = $context->getId();
            $userGroupDao = DAORegistry::getDAO('UserGroupDAO');
            $group = $userGroupDao->getDefaultByRoleId($contextId, $roleId);
            if (!$group) {
                fwrite(STDERR, "lineUser: no user group for that role in \"{$opts['context']}\"\n");
                exit(1);
            }
            $userGroupId = $group->getId();
            $userGroupDao->assignUserToGroup($userId, $userGroupId);
        }
        echo json_encode(['userId' => (int) $userId, 'contextId' => $contextId, 'userGroupId' => $userGroupId]) . "\n";
    }
}

$tool = new LineUserTool(isset($argv) ? $argv : []);
$tool->execute();
