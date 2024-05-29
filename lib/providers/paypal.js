
const axios = require('axios');
const pe = require('../../../.transactify.json').priceIndex;
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const { product, ref, token, email, firstName, lastName } = req.body;
  const config = require('../../../.transactify.json');
  const { return_url, cancel_url, notify_url } = config.urls;
  let price = pe[product].price;
  const PAYPAL_SECRET = config.providers.paypal.secret;

  const body = {
    intent: 'sale',
    payer: { payment_method: 'paypal' },
    transactions: [{ amount: { total: (price / 100).toFixed(2), currency: 'USD' }, description: product }],
    redirect_urls: { return_url, cancel_url },
    payer: {
      payer_info: {
        email,
        first_name: firstName,
        last_name: lastName
      }
    }
  };

  await axios.post('https://api.paypal.com/v1/payments/payment', body, {
    headers: { 'Authorization': `Bearer ${PAYPAL_SECRET}` },
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
