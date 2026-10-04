<?php
// Walk rig of walk.js (CLI, run from the app root with PKP_CONFIG_FILE set and prepend.php prepended):
//   php state.php enable|disable|inspect
// enable/disable write what LazyLoadPlugin::setEnabled() writes for the journal "publicknowledge"
// (PluginSettingsDAO::updateSetting(<journal id>, 'PlnPlugin', 'enabled', <bool>, 'bool')); every
// action then prints, as JSON, what the plugin registry holds for that journal.
require getcwd() . '/tools/bootstrap.php';

use APP\core\Application;
use PKP\db\DAORegistry;
use PKP\plugins\PluginRegistry;

class U67bPlnState extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $action = $this->argv[0] ?? 'inspect';
        $context = Application::getContextDAO()->getByPath('publicknowledge');
        $contextId = $context->getId();
        $settings = DAORegistry::getDAO('PluginSettingsDAO');
        if ($action === 'enable' || $action === 'disable') {
            $settings->updateSetting($contextId, 'PlnPlugin', 'enabled', $action === 'enable', 'bool');
        }
        $version = DAORegistry::getDAO('VersionDAO')->getCurrentVersion('plugins.generic', 'pln');
        $products = Application::get()->getEnabledProducts('plugins.generic', $contextId);
        PluginRegistry::loadCategory('generic', true, $contextId);
        $registered = PluginRegistry::getPlugins('generic');
        echo json_encode([
            'action' => $action,
            'contextId' => $contextId,
            'installedVersion' => $version ? $version->getVersionString() : null,
            'enabledSetting' => $settings->getSetting($contextId, 'plnplugin', 'enabled'),
            'plnLoadedAtDispatch' => array_key_exists('pln', $products),
            'registeredAs' => array_values(array_filter(array_keys($registered), fn ($n) => stripos($n, 'pln') !== false)),
            "getPlugin('generic', 'plnplugin')" => PluginRegistry::getPlugin('generic', 'plnplugin') !== null,
        ]) . "\n";
    }
}

$tool = new U67bPlnState($argv ?? []);
$tool->execute();
