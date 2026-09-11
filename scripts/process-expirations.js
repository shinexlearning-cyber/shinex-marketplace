require('dotenv').config();
const { processExpirations } = require('../services/subscriptions');
processExpirations().then(n=>{console.log(`Processed ${n} subscription records`);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
