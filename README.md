
# Transactify

Transactify is a Node.js application designed to facilitate the configuration and management of multiple payment gateways. It offers a command-line interface for setting up, configuring, and cataloguing products with ease.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [License](#license)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/user/transactify.git
    cd transactify
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Ensure you have Node.js installed on your machine.

## Usage

Transactify provides a CLI to manage your payment gateways and catalogue products. You can initialize the configuration, configure gateways, and add products to your catalogue using the provided commands.

### Commands

#### Initialize

Initialize the configuration in a specified directory (or current directory if no location is provided).

```sh
./transactify init [location]
```

#### Configure

Configure your payment gateways.

```sh
./transactify config
```

#### Catalogue

Add a product to your catalogue.

```sh
./transactify catalogue
```

### Example

```sh
./transactify init
./transactify config
./transactify catalogue
```

## Configuration

The configuration involves setting up payment gateways and specifying URLs for transaction notifications.

### Setup Gateways

During setup, you will be prompted to select and configure gateways by providing public keys, secret keys, and test keys.

### Edit Gateway Keys

You can edit the keys for existing gateways.

### Remove Gateway

Remove an existing gateway from the configuration.

### Edit URLs

Edit the return, cancel, and notify URLs for transactions.

Configuration details are stored in `~/.config/transactify/config.json`.


## Development

To run the project in development mode:

```sh
npm start
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
