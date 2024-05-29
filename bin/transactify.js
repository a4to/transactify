#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.config', 'transactify', 'config.json');

const ensureConfigDir = () => {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const loadConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
};

const saveConfig = (config) => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

const init = async (location) => {
  const globalConfig = loadConfig();
  const providers = globalConfig.providers || {};
  const configuredProviders = Object.keys(providers).filter(provider => {
    return providers[provider].publicKey && providers[provider].secret;
  });

  if (configuredProviders.length === 0) {
    const setup = await prompts({
      type: 'confirm',
      name: 'setup',
      message: 'No gateway details have been set up. Do you want to set them up now?',
      initial: true
    });

    if (setup.setup) {
      await config();
      globalConfig = loadConfig();
      providers = globalConfig.providers || {};
      configuredProviders = Object.keys(providers).filter(provider => {
        return providers[provider].publicKey && providers[provider].secret;
      });
    } else {
      console.log('Initialization aborted.');
      return;
    }
  }

  const config = {
    providers: configuredProviders.reduce((acc, provider) => {
      acc[provider] = providers[provider];
      return acc;
    }, {}),
    priceIndex: {},
    urls: globalConfig.urls || {
      return_url: '',
      cancel_url: '',
      notify_url: ''
    }
  };

  const filePath = path.join(location, '.transactify.json');
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log('\x1b[32m%s\x1b[0m', '.transactify.json has been created ✔');
};

const config = async () => {
  const existingConfig = loadConfig();

  const choices = existingConfig.providers ? [
    { title: 'Add Gateway(s)', value: 'add' },
    { title: 'Edit Gateway Keys', value: 'edit' },
    { title: 'Remove Gateway', value: 'remove' },
    { title: 'Edit URLs', value: 'edit_urls' }
  ] : [{ title: 'Setup Gateway(s)', value: 'setup' }];

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Choose an action',
    choices
  });

  let gateways, updatedConfig;

  switch (action) {
    case 'setup':
      const setupResponse = await prompts({
        type: 'multiselect',
        name: 'gateways',
        message: 'Select gateways to integrate',
        choices: Object.keys(require('../lib/providers')).map(gateway => ({
          title: gateway,
          value: gateway
        }))
      });
      gateways = setupResponse.gateways;

      updatedConfig = { providers: {} };
      for (const gateway of gateways) {
        const keys = await prompts([
          { type: 'text', name: 'publicKey', message: `${gateway} Public Key` },
          { type: 'text', name: 'secret', message: `${gateway} Secret Key` },
          { type: 'text', name: 'testKey', message: `${gateway} Test Key` },
          { type: 'text', name: 'testSecret', message: `${gateway} Test Secret` }
        ]);
        updatedConfig.providers[gateway] = keys;
      }
      saveConfig(updatedConfig);
      break;
    case 'add':
      const addResponse = await prompts({
        type: 'multiselect',
        name: 'gateways',
        message: 'Select gateways to add',
        choices: Object.keys(require('../lib/providers')).map(gateway => ({
          title: gateway,
          value: gateway
        }))
      });
      gateways = addResponse.gateways;

      updatedConfig = loadConfig();
      for (const gateway of gateways) {
        if (!updatedConfig.providers[gateway]) {
          const keys = await prompts([
            { type: 'text', name: 'publicKey', message: `${gateway} Public Key` },
            { type: 'text', name: 'secret', message: `${gateway} Secret Key` },
            { type: 'text', name: 'testKey', message: `${gateway} Test Key` },
            { type: 'text', name: 'testSecret', message: `${gateway} Test Secret` }
          ]);
          updatedConfig.providers[gateway] = keys;
        }
      }
      saveConfig(updatedConfig);
      break;
    case 'edit':
      gateways = Object.keys(existingConfig.providers);
      const editResponse = await prompts({
        type: 'select',
        name: 'gateway',
        message: 'Select gateway to edit',
        choices: gateways.map(g => ({ title: g, value: g }))
      });
      const gatewayToEdit = editResponse.gateway;

      const newKeys = await prompts([
        { type: 'text', name: 'publicKey', message: `${gatewayToEdit} Public Key`, initial: existingConfig.providers[gatewayToEdit].publicKey },
        { type: 'text', name: 'secret', message: `${gatewayToEdit} Secret Key`, initial: existingConfig.providers[gatewayToEdit].secret },
        { type: 'text', name: 'testKey', message: `${gatewayToEdit} Test Key`, initial: existingConfig.providers[gatewayToEdit].testKey },
        { type: 'text', name: 'testSecret', message: `${gatewayToEdit} Test Secret`, initial: existingConfig.providers[gatewayToEdit].testSecret }
      ]);
      existingConfig.providers[gatewayToEdit] = newKeys;
      saveConfig(existingConfig);
      break;
    case 'remove':
      gateways = Object.keys(existingConfig.providers);
      const removeResponse = await prompts({
        type: 'multiselect',
        name: 'gatewaysToRemove',
        message: 'Select gateways to remove',
        choices: gateways.map(g => ({ title: g, value: g }))
      });
      const gatewaysToRemove = removeResponse.gatewaysToRemove;

      for (const gateway of gatewaysToRemove) {
        delete existingConfig.providers[gateway];
      }
      saveConfig(existingConfig);
      break;
    case 'edit_urls':
      const urls = await prompts([
        { type: 'text', name: 'return_url', message: 'Return URL', initial: existingConfig.urls.return_url },
        { type: 'text', name: 'cancel_url', message: 'Cancel URL', initial: existingConfig.urls.cancel_url },
        { type: 'text', name: 'notify_url', message: 'Notify URL', initial: existingConfig.urls.notify_url }
      ]);
      existingConfig.urls = urls;
      saveConfig(existingConfig);
      break;
  }
};

const catalogue = async () => {
  const filePath = path.join(process.cwd(), '.transactify.json');
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const productResponse = await prompts({
    type: 'text',
    name: 'product',
    message: 'Enter the product name'
  });
  const product = productResponse.product;

  const priceResponse = await prompts({
    type: 'number',
    name: 'price',
    message: 'Enter the product price (in cents)'
  });
  const price = priceResponse.price;

  config.priceIndex[product] = { price };
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log('\x1b[32m%s\x1b[0m', 'Product added to price index ✔');
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      await init(args[1] || process.cwd());
      break;
    case 'config':
      await config();
      break;
    case 'catalogue':
      await catalogue();
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
};

main();
