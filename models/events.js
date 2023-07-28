const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
  tokenEvent: String,
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'trips' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  name: String,
  description: String,
  place: String,
  date: Date,
  timeStart: Date,
  timeEnd: Date,
  seats: Number,
  ticket: String,
  infos: [{
    tokenInfo: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    name: String,
    type: String,
    uri: String,
  }], 
});

const Event = mongoose.model('events', eventSchema);

module.exports = Event;