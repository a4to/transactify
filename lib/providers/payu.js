
const axios = require('axios');
const pe = require('../../../.transactify.json').priceIndex;
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const { product, ref, token, email, firstName, lastName, phone } = req.body;
  const config = require('../../../.transactify.json');
  const { return_url, cancel_url, notify_url } = config.urls;
  let price = pe[product].price;
  const PAYU_SECRET = config.providers.payu.secret;

  const body = {
    customerIp: req.ip,
    merchantPosId: config.providers.payu.publicKey,
    description: product,
    currencyCode: 'USD',
    totalAmount: price,
    extOrderId: ref,
    buyer: {
      email,
      phone,
      firstName,
      lastName
    },
    products: [{ name: product, unitPrice: price, quantity: 1 }]
  };

  await axios.post('https://secure.payu.com/api/v2_1/orders', body, {
    headers: { 'Authorization': `Bearer ${PAYU_SECRET}` },
  }).then(async (response) => {
    console.log(response.data);
    const payment = { transaction: response.data, product, ref };

    if (process.env.DB_TYPE === 'mongodb') {
      const Pay = require('mongoose').model('Transactions', new require('mongoose').Schema().set('strict', false));
      const paymentDoc = new Pay(payment);
      await paymentDoc.save();
    } else {
      const dbPath = path.join(process.cwd(), 'transactions.json');
      const transactions = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      transactions.push(payment);
      fs.writeFileSync(dbPath, JSON.stringify(transactions, null, 2));
    }
    res.status(200).json({ message: 'Payment successful', data: response.data });
  }).catch((error) => {
    console.log(error);
    res.status(400).json({ message: 'Payment failed', data: error });
  });
};
