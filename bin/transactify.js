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

const saveTransactifyConfig = (config, loc) => {
  const filePath = path.join(loc, '.transactify.json');
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log('\n\x1b[33m.transactify.json \x1b[32mhas been created ✔\x1b[0m');
}

const config = async (skip = false) => {
  const existingConfig = loadConfig();

  const choices = existingConfig.providers ? [
    { title: 'Add Gateway(s)', value: 'add', description: 'Add new gateways to the existing configuration' },
    { title: 'Remove Gateway(s)', value: 'remove', description: 'Remove gateways from the existing configuration' },
    { title: 'Edit Gateway Keys', value: 'edit', description: 'Edit the keys of an existing gateway' },
    { title: 'Edit Callback URLs', value: 'edit_urls', description: 'These are the URLs that the payment gateway will redirect to after a transaction' },
  ] : [
    { title: 'Setup Gateway(s)', value: 'setup', description: 'Set up gateway keys for the first time' }
  ];

  const { action } = skip ? { action: 'setup' } : await prompts({
    type: 'select',
    name: 'action',
    message: 'Choose an action',
    choices
  });

  if(!action) return;

  let gateways, updatedConfig;

  switch (action) {
    case 'setup':
      const setupResponse = await prompts({
        type: 'multiselect',
        name: 'gateways',
        message: 'Select which gateways to set up',
        instructions: `\n`,
        optionsPerPage: 15,
        choices: Object.keys(require('../lib/providers')).map(gateway => ({
          title: gateway,
          value: gateway
        }))
      });
      gateways = setupResponse.gateways;

      updatedConfig = { providers: {} };
      for (const gateway of gateways) {
        const keys = await prompts([
          { type: 'text', name: 'publicKey', message: `${gateway} Public Key`, validate: value => value.length > 10 ? true : 'Public Key is invalid' },
          { type: 'text', name: 'secret', message: `${gateway} Secret Key`, validate: value => value.length > 10 ? true : 'Secret Key is invalid' },
          { type: 'text', name: 'testKey', message: `${gateway} Test Key (optional)` },
          { type: 'text', name: 'testSecret', message: `${gateway} Test Secret (optional)` }
        ]);
        updatedConfig.providers[gateway] = keys;
      }
      if (Object.keys(updatedConfig.providers).length <= 0) {
        console.log('\n\x1b[31m[-]\x1b[0m No gateways selected. Aborting setup.');
        return;
      }
      saveConfig(updatedConfig);
      break;
    case 'add':
      const existingGateways = Object.keys(existingConfig.providers || {});
      const addResponse = await prompts({
        type: 'multiselect',
        name: 'gateways',
        message: 'Select which gateways to add',
        instructions: `\n`,
        optionsPerPage: 15,
        choices: Object.keys(require('../lib/providers')).filter(gateway => !existingGateways.includes(gateway)).map(gateway => ({
          title: gateway,
          value: gateway
        }))
      });

      gateways = addResponse.gateways;
      if (gateways.length <= 0) {
        console.log('\n\x1b[31m[-]\x1b[0m No gateways selected. Aborting setup.');
        return;
      }

      updatedConfig = loadConfig();
      for (const gateway of gateways) {
        if (!updatedConfig.providers[gateway]) {
          const keys = await prompts([
            { type: 'text', name: 'publicKey', message: `${gateway} Public Key`, validate: value => value.length > 10 ? true : 'Public Key is invalid' },
            { type: 'text', name: 'secret', message: `${gateway} Secret Key`, validate: value => value.length > 10 ? true : 'Secret Key is invalid' },
            { type: 'text', name: 'testKey', message: `${gateway} Test Key (optional)` },
            { type: 'text', name: 'testSecret', message: `${gateway} Test Secret (optional)` }
          ]);

          if (keys.publicKey && keys.secret) updatedConfig.providers[gateway] = keys;
          else console.log('\n\x1b[31m[-]\x1b[0m Invalid keys for gateway: ' + gateway);
        }
      }
      if (Object.keys(updatedConfig.providers).length <= 0) {
        console.log('\n\x1b[31m[-]\x1b[0m No gateways selected. Aborting setup.');
        return;
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

      if (!editResponse.gateway) {
        console.log('\n\x1b[31m[-]\x1b[0m No gateway selected. Aborting setup.');
        return;
      }

      const gatewayToEdit = editResponse.gateway;

      const newKeys = await prompts([
        { type: 'text', name: 'publicKey', message: `${gatewayToEdit} Public Key`, initial: existingConfig.providers[gatewayToEdit].publicKey, validate: value => value.length > 10 ? true : 'Public Key is invalid' },
        { type: 'text', name: 'secret', message: `${gatewayToEdit} Secret Key`, initial: existingConfig.providers[gatewayToEdit].secret, validate: value => value.length > 10 ? true : 'Secret Key is invalid' },
        { type: 'text', name: 'testKey', message: `${gatewayToEdit} Test Key (optional)`, initial: existingConfig.providers[gatewayToEdit].testKey },
        { type: 'text', name: 'testSecret', message: `${gatewayToEdit} Test Secret (optional)`, initial: existingConfig.providers[gatewayToEdit].testSecret }
      ]);

      if (newKeys.publicKey && newKeys.secret) existingConfig.providers[gatewayToEdit] = newKeys;
      else console.log('\n\x1b[31m[-]\x1b[0m Invalid keys for gateway: ' + gatewayToEdit);

      saveConfig(existingConfig);
      break;
    case 'remove':
      gateways = Object.keys(existingConfig.providers);
      const removeResponse = await prompts({
        type: 'multiselect',
        name: 'gatewaysToRemove',
        message: 'Select gateways to remove',
        instructions: `\n`,
        optionsPerPage: 15,
        choices: gateways.map(g => ({ title: g, value: g }))
      });
      const gatewaysToRemove = removeResponse.gatewaysToRemove;
      if (gatewaysToRemove.length <= 0) {
        console.log('\n\x1b[31m[-]\x1b[0m No gateways selected. Aborting setup.');
        return;
      }

      for (const gateway of gatewaysToRemove) {
        delete existingConfig.providers[gateway];
      }
      saveConfig(existingConfig);
      break;
    case 'edit_urls':
      existingConfig.urls = existingConfig.urls || {};
      const urls = await prompts([
        { type: 'text', name: 'return_url', message: 'Return URL', initial: existingConfig.urls.return_url, validate: value => value.length > 0 ? true : 'Return URL cannot be empty' },
        { type: 'text', name: 'cancel_url', message: 'Cancel URL', initial: existingConfig.urls.cancel_url, validate: value => value.length > 0 ? true : 'Cancel URL cannot be empty' },
        { type: 'text', name: 'notify_url', message: 'Notify URL', initial: existingConfig.urls.notify_url, validate: value => value.length > 0 ? true : 'Notify URL cannot be empty' }
      ]);
      existingConfig.urls = urls;
      saveConfig(existingConfig);
      break;
  }
};

const init = async (location) => {
  let globalConfig = loadConfig();
  let providers = globalConfig.providers || {};
  let configuredProviders = Object.keys(providers).filter(provider => {
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
      await config(true);
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

  process.stdout.write('\n\x1b[36mConfigured Providers: ');
  Object.keys(providers).forEach((provider, index) => {
    process.stdout.write(`\x1b[33m${provider}\x1b[0m${index < Object.keys(providers)?.length - 1 ? '\x1b[35m, \x1b[0m' : ''}`);
  });
  console.log('\n');
  const configData = {
    providers: configuredProviders.reduce((acc, provider) => {
      acc[provider] = providers[provider];
      return acc;
    }, {}),
    priceIndex: {},
    urls: globalConfig.urls || await prompts([
      { type: 'text', name: 'return_url', message: 'Return URL', validate: value => value.length > 0 ? true : 'Return URL cannot be empty' },
      { type: 'text', name: 'cancel_url', message: 'Cancel URL', validate: value => value.length > 0 ? true : 'Cancel URL cannot be empty' },
      { type: 'text', name: 'notify_url', message: 'Notify URL', validate: value => value.length > 0 ? true : 'Notify URL cannot be empty' }
    ])
  };

  if (!configData.urls.return_url || !configData.urls.cancel_url || !configData.urls.notify_url) {
    console.log('\n\x1b[31m[-]\x1b[0m URLs cannot be empty. Aborting initialization.');
    return;
  }

  const filePath = path.join(location, '.transactify.json');
  fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
  console.log('\n\x1b[32mTransactify initialized ✔  \n\n\x1b[36mSee: \x1b[33m' + filePath + '\x1b[0m\n');
};

const catalogue = async () => {
  const filePath = path.join(process.cwd(), '.transactify.json');
  if (!fs.existsSync(filePath)) {
    await init(process.cwd());
  }
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const actionResponse = await prompts({
    type: 'select',
    name: 'action',
    message: 'Choose an action',
    choices: [
      { title: 'List Products', value: 'list', description: 'List all products in the price index' },
      { title: 'Add Product', value: 'add', description: 'Add a product to the price index' },
      { title: 'Remove Product', value: 'remove', description: 'Remove a product from the price index' }
    ]
  });

  if (!actionResponse.action) return;

  switch (actionResponse.action) {
    case 'list':
      console.log('\n\x1b[36mPrice Index:\n\x1b[0m---\n');
      Object.keys(config.priceIndex).forEach((product, index) => {
        console.log(`\x1b[33m${product}\x1b[0m: \x1b[32m${config.priceIndex[product]}\x1b[0m cents`);
      });
      console.log('\n');
      break;
    case 'add':
      await addProduct(config, filePath);
      break;
    case 'remove':
      const removeResponse = await prompts({
        type: 'select',
        name: 'product',
        message: 'Select a product to remove',
        choices: Object.keys(config.priceIndex).map(product => ({ title: product, value: product }))
      });

      if (!removeResponse.product) {
        console.log('\n\x1b[31m[-]\x1b[0m No product selected. Aborting removal.');
        return;
      }

      delete config.priceIndex[removeResponse.product];
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log('\x1b[32m%s\x1b[0m', 'Product removed from price index ✔');
      break;
  }
};

const addProduct = async (config, filePath) => {
  const productResponse = await prompts({
    type: 'text',
    name: 'product',
    message: 'Enter the product name',
    validate: value => value.length > 0 ? true : 'Product name cannot be empty'
  });
  const product = productResponse.product;

  const priceResponse = await prompts({
    type: 'number',
    name: 'price',
    message: 'Enter the product price in cents',
    validate: value => value > 0 ? true : 'Price must be greater than 0'
  });
  const price = priceResponse.price;

  config.priceIndex[product] = price;
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log('\x1b[32m%s\x1b[0m', 'Product added to price index ✔');
};



const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n \x1b[33mWelcome to Transactify\n\x1b[0m');
    const { command } = await prompts({
      type: 'select',
      name: 'command',
      message: 'Choose a command to execute',
      choices: [
        { title: 'Initialize', value: 'init', description: 'Initialize a new / update an existing transactify configuration' },
        { title: 'Configure', value: 'config', description: 'Configure global settings' },
        { title: 'Catalogue', value: 'catalogue', description: 'Add products to the price index' },
        { title: 'Help', value: 'help', description: 'Show this help message' },
        { title: 'Exit', value: 'exit', description: 'Exit the program' }
      ]
    });

    if (!command || command === 'exit') return;

    args[0] = command;
  }

  const help = () => {
    console.log('\n\x1b[36mTransactify CLI\n\n\x1b[0;1mUsage:\x1b[0m \x1b[32mtransactify \x1b[35m<\x1b[33mcommand\x1b[35m>\n\n\x1b[0;1mCommands:\x1b[0m\n\n\x1b[33minit\x1b[0m \x1b[35m-\x1b[36m Initialize a new / update an existing transactify configuration\n\x1b[33mconfig\x1b[0m \x1b[35m-\x1b[36m Configure global settings\n\x1b[33mcatalogue\x1b[0m \x1b[35m-\x1b[36m Add products to the price index\n\x1b[33mhelp\x1b[0m \x1b[35m-\x1b[36m Show this help message\n\x1b[33mexit\x1b[0m \x1b[35m-\x1b[36m Exit the program\n');
  }

  switch (args[0]) {
    case 'init':
      await init(args[1] || process.cwd());
      break;
    case 'config':
      await config();
      break;
    case 'catalogue':
      await catalogue();
      break;
    case 'help':
      help();
      break;
    default:
      console.log(`Unknown command: ${args[0]}`);
  }
};

main();
