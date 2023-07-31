const Trip = require("../models/trips");

// Fonction qui vérifie le token de l'utilisateur, et renvoie ses infos si true, ou juste false
const tokenUser = async token => {
    const findUser = await Trip.findOne({ tokenUser: token });

    if(!findUser) {
        return false;
    }
    return findUser;
  }
  
  module.exports = { tokenUser };