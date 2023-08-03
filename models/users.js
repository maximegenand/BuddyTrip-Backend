const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  tokenSession: String,
  tokenUser: String,
  username: String,
  email: String,
  password: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  trips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'trips' }],
  image: String,
  active: Boolean,
  documents: [{
    tokenDocument: String,
    type: String,
    name: String,
    uri: String,
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'trips' },
  }],
});

const User = mongoose.model('users', userSchema);

module.exports = User;