
// Fonction qui filtre les infos à renvoyer au Front en supprimant les ids et remplacant les user_id par des tokens
const parseTrip = async tripBrut => {
  const trip = tripBrut.toJSON();

  // On récupère seulement les infos qu'on veut renvoyer
  const { tokenTrip, name, dateStart, dateEnd, description } = trip;
  const user = { tokenUser: trip.user.tokenUser, username: trip.user.username };
  const participants = trip.participants.map( obj => {
    const { tokenUser, username, picture } = obj;
    return { tokenUser, username, picture };
  });

  return {
    tokenTrip,
    name,
    dateStart,
    dateEnd,
    description,
    user,
    participants,
  }
}

module.exports = { parseTrip };