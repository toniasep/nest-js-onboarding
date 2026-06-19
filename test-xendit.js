const { Xendit } = require('xendit-node');

const xendit = new Xendit({ secretKey: 'xnd_development_ePJWZz1KLM0qY12LgfTQz29OGYEd56HjRmnAOB5DfD2TBoIYY5NaQojNmK1E' });

xendit.Invoice.createInvoice({
  data: {
    externalId: 'test-' + Date.now(),
    amount: 50000,
    payerEmail: 'test@example.com',
    description: 'Test Payment',
    invoiceDuration: 900
  }
}).then(res => {
  console.log('SUCCESS:', res.id);
}).catch(err => {
  console.error('ERROR MESSAGE:', err.message);
  if (err.response) {
    console.error('ERROR STATUS:', err.response.status);
    console.error('ERROR DATA:', err.response.data);
  } else if (err.status) {
    console.error('ERROR STATUS:', err.status);
    console.error('ERROR DETAILS:', err);
  }
});
