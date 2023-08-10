
// Fonction qui filtre les infos à renvoyer au Front en supprimant les ids et remplacant les user_id par des tokens
const parseEvent = eventBrut => {
  const event = eventBrut.toJSON();

  // On récupère seulement les infos qu'on veut renvoyer
  const { tokenEvent, category, name, date, timeStart, timeEnd, place, description, seats, ticket } = event;

  const user = { tokenUser: event.user.tokenUser, username: event.user.username, image: event.user.image };

  const { tokenTrip } = event.trip;

  const participants = event.participants.map( obj => {
    const { tokenUser, username, image } = obj;
    return { tokenUser, username, image };
  });

  const infos = event.infos.map( obj => {
    return {
      tokenInfo: obj.tokenInfo,
      user: { tokenUser: obj.user.tokenUser, username: obj.user.username, image: obj.user.image },
      name: obj.name,
      type: obj.type,
      uri: obj.uri,
    };
  });

  return {
    tokenEvent,
    tokenTrip,
    category,
    name,
    date,
    timeStart,
    timeEnd,
    place,
    description,
    seats,
    ticket,
    user,
    participants,
    infos,
  }
}

module.exports = { parseEvent };