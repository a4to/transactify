
const axios = require('axios');
const pe = require('../../../.transactify.json').priceIndex;
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const { product, ref, token, email } = req.body;
  const config = require('../../../.transactify.json');
  const { return_url, cancel_url, notify_url } = config.urls;
  let price = pe[product].price;
  const PAYGATE_ID = config.providers.paygate.publicKey;
  const PAYGATE_SECRET = config.providers.paygate.secret;

  const body = {
    PAYGATE_ID,
    REFERENCE: ref,
    AMOUNT: price,
    CURRENCY: 'ZAR',
    RETURN_URL: return_url,
    TRANSACTION_DATE: new Date().toISOString(),
    LOCALE: 'en-za',
    COUNTRY: 'ZAF',
    EMAIL: email
  };

  await axios.post('https://secure.paygate.co.za/payweb3/initiate.trans', body, {
    headers: { 'Authorization': `Basic ${Buffer.from(`${PAYGATE_ID}:${PAYGATE_SECRET}`).toString('base64')}` },
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
