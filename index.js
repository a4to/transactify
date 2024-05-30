const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

class Transactify {
  constructor(provider, store = 'json') {
    this.provider = provider;
    this.dbType = store
    this.config = require('./.transactify.json');
    this.priceIndex = this.config.priceIndex;
    this.dbPath = path.join(process.cwd(), 'transactions.json');

    if (dbType === 'mongodb') {
      mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.Pay = mongoose.model('Transactions', new mongoose.Schema().set('strict', false));
    }
  }

  async processPayment(req, res) {
    const { product, ref, token, email, firstName, lastName, phone } = req.body;
    const provider = this.provider.toLowerCase();

    try {
      const providerModule = require(`./lib/providers/${provider}.js`);
      await providerModule(req, res);
    } catch (error) {
      res.status(400).json({ message: 'Payment failed', data: error });
    }
  }

  saveTransaction(payment) {
    if (this.dbType === 'mongodb') {
      const paymentDoc = new this.Pay(payment);
      return paymentDoc.save();
    } else {
      const transactions = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      transactions.push(payment);
      fs.writeFileSync(this.dbPath, JSON.stringify(transactions, null, 2));
    }
  }
}

module.exports = Transactify;
