const mongoose = require('mongoose');
mongoose.set('strictQuery', true)

const connectionString = process.env.CONNECTION_STRING;

const options = { useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 10000 }

mongoose.connect(connectionString, options)
  .then(() => console.log('Database connected'))
  .catch(error => console.error(error));
