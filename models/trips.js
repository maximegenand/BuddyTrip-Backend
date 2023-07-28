const mongoose = require('mongoose');

const tripSchema = mongoose.Schema({
  tokenTrip: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  name: String,
  dateStart: Date,
  dateEnd: Date,
  description: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
});

const Trip = mongoose.model('trips', tripSchema);

module.exports = Trip;