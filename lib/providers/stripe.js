
const axios = require('axios');
const pe = require('../../../.transactify.json').priceIndex;
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const { product, ref, token, email } = req.body;
  const config = require('../../../.transactify.json');
  const { return_url, cancel_url, notify_url } = config.urls;
  let price = pe[product].price;
  const STRIPE_SECRET = config.providers.stripe.secret;

  const body = {
    source: token,
    amount: price,
    currency: 'usd',
    description: product,
    receipt_email: email
  };

  await axios.post('https://api.stripe.com/v1/charges', body, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
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
