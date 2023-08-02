const express = require("express");
const router = express.Router();
const Trip = require("../models/trips");
const User = require("../models/users");
const Event = require("../models/events");
const uid2 = require("uid2");

// Import des fonctions
const { checkBody } = require('../modules/checkBody');
const { checkTokenTrip } = require('../modules/checkTrip');
const { checkTokenSession, checkTokenUser } = require('../modules/checkUser');
const { parseEvent } = require("../modules/parseEvent");



// Route POST pour créer un événement
router.post("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "event"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const { token, event } = req.body;

  // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
  const user = await checkTokenSession(token);
  if(!user) {
    return res.status(404).json({ result: false, error: "User not found" });
  }

  // On recherche un trip suivant le tokenTrip
  const findTrip = await Trip.findOne({ tokenTrip: event.tokenTrip });

  // Si on trouve pas le trip, on retourne une erreur
  if (!findTrip) {
    return res.status(404).json({ result: false, error: "Trip not found" });
  }

  // On vérifie si l'utilisateur à le droit d'accéder au Trip - et donc si le trip existe
  if(!user.trips.includes(findTrip._id)) {
    return res.status(404).json({ result: false, error: "Not allowed" });
  }

  // On transforme les infos supplémentaires pour pouvoir l'enregistrer
  const infos = await Promise.all(event.infos.map(async obj => {
    return {
      tokenInfo: uid2(32),
      //user: await checkTokenUser(obj.tokenUser), <-- on sait que celui qui enregistre est le créateur de l'evenement, pas la peine de check
      user: user._id,
      name: obj.name,
      type: obj.type,
      uri: obj.uri,
    }
  }));

  // On créé un nouveau Event
  const newEvent = new Event({
    tokenEvent: uid2(32),
    trip: findTrip._id,
    user: user._id,
    category: event.category,
    name: event.name,
    date: event.date,
    timeStart: event.timeStart,
    timeEnd: event.timeEnd,
    place: event.place,
    seats: event.seats,
    description: event.description,
    participants: [user._id],
    infos,
  });

  try {
    // On enregistre l'Event
    await newEvent.save();

    // On populate les infos de l'Event
    await newEvent.populate([
      { path: "user" },
      { path: "trip" },
      { path: "participants" },
      { path: "infos.user" },
    ]);

    // On filtre les infos que l'on veut renvoyer en front
    const eventRes = parseEvent(newEvent);
    res.json({ result: true, event: eventRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'Event :", error);
    res.status(404).json({ result: false, error: "Erreur lors de l'enregistrement de l'Event" });
  }
});



// Route DELETE pour supprimer un Event
router.delete("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "tokenEvent"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const { token, tokenEvent } = req.body;

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    if(!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On recherche un trip suivant le tokenEvent
    const findEvent = await Event.findOne({ tokenEvent });

    // Si on trouve pas l'Event', on retourne une erreur
    if (!findEvent) {
      return res.status(404).json({ result: false, error: "Event not found" });
    }

    // Si le user n'est pas le créateur de l'Event
    if (findEvent.user.toString() !== user._id.toString()) {
      return res.status(404).json({ result: false, error: "Not allowed" });
    }

    // On supprime l'event'
    await Event.deleteOne({ _id: findEvent._id });
    res.json({ result: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'Event :", error);
    res.status(404).json({ result: false, error: "Erreur lors de la suppression de l'Event" });
  }
});


module.exports = router;
