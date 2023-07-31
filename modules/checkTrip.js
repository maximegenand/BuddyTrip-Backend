const Trip = require("../models/trips");

// Fonction cherche le tokenTrip, et renvoie son id, ou juste false
const checkTokenTrip = async token => {
  const findTrip = await Trip.findOne({ tokenTrip: token });

  if(!findTrip) {
    return false;
  }
  return findTrip._id;
}
  
  module.exports = { checkTokenTrip };