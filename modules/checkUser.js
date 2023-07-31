const User = require("../models/users");

// Fonction qui vérifie le tokenSession de l'utilisateur, et renvoie ses infos si true, ou juste false
const tokenSession = async token => {
  const findUser = await User.findOne({ tokenSession: token });

  if(!findUser) {
    return false;
  }
  return findUser;
}
  
// Fonction cherche le tokenUser de l'utilisateur, et renvoie son id, ou juste false
const tokenUser = async token => {
  const findUser = await User.findOne({ tokenUser: token });

  if(!findUser) {
    return false;
  }
  return findUser._id;
}
  
  module.exports = { tokenSession, tokenUser };