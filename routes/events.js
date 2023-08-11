const express = require("express");
const router = express.Router();
const Trip = require("../models/trips");
const User = require("../models/users");
const Event = require("../models/events");
const uid2 = require("uid2");

// Import des fonctions
const { checkBody } = require("../modules/checkBody");
const { checkTokenTrip } = require("../modules/checkTrip");
const { checkTokenSession, checkTokenUser } = require("../modules/checkUser");
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
  if (!user) {
    return res.status(404).json({ result: false, error: "User not found" });
  }

  // On recherche un trip suivant le tokenTrip
  const findTrip = await Trip.findOne({ tokenTrip: event.tokenTrip });

  // Si on trouve pas le trip, on retourne une erreur
  if (!findTrip) {
    return res.status(404).json({ result: false, error: "Trip not found" });
  }

  // On vérifie si l'utilisateur à le droit d'accéder au Trip - et donc si le trip existe
  if (!user.trips.includes(findTrip._id)) {
    return res.status(404).json({ result: false, error: "Not allowed" });
  }
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
    ticket: event.ticket,
    description: event.description,
    participants: [user._id],
    infos : [],
  });

  try {
    // On enregistre l'Event
    await newEvent.save();

    // On populate les infos de l'Event
    await newEvent.populate([{ path: "user" }, { path: "trip" }, { path: "participants" }, { path: "infos.user" }]);

    // On filtre les infos que l'on veut renvoyer en front
    const eventRes = parseEvent(newEvent);
    res.json({ result: true, event: eventRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'Event :", error);
    res.status(404).json({ result: false, error: "Erreur lors de l'enregistrement de l'Event" });
  }
});



// Route PUT pour update un event
router.put("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (
    !checkBody(req.body, ["token", "event"])
    && !checkBody(req.body.token, ["tokenTrip", "tokenEvent", "category", "name", "date", "timeStart", "place", "description"])
  ) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const token = req.body.token;
  const { tokenEvent, category, name, date, timeStart, timeEnd, place, seats, ticket, description } = req.body.event;
console.log(seats)
  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On recherche un event suivant le tokenEvent
    const findEvent = await Event.findOne({ tokenEvent });

    // Si on trouve pas l'event, on retourne une erreur
    if (!findEvent) {
      return res.status(404).json({ result: false, error: "Event not found" });
    }

    // Si le user n'est pas propriétaire de l'event
    if (findEvent.user.toString() !== user._id.toString()) {
      return res.status(404).json({ result: false, error: "Not allowed" });
    }

    // On update l'event
    const updateEvent = await Event.findOneAndUpdate({ _id: findEvent._id }, { category, name, date, timeStart, timeEnd, place, seats, ticket, description }, { new: true });

    // On populate les infos de l'Event
    await updateEvent.populate([{ path: "user" }, { path: "trip" }, { path: "participants" }, { path: "infos.user" }]);

    // On filtre les infos que l'on veut renvoyer en front
    const eventRes = parseEvent(updateEvent);

    return res.json({ result: true, event: eventRes });
  } catch (error) {
    console.error("Erreur lors de l'update de l'event :", error);
    return res.status(404).json({ result: false, error: "Erreur lors de l'update de l'event" });
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
    if (!user) {
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


// Route DELETE pour supprimer tous les Events d'un trip
router.delete("/allEvents", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "tokenTrip"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const { token, tokenTrip } = req.body;

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On recherche l'id trip qui contient tous ces events
    const trip = await Trip.findOne({ tokenTrip });
    const tripId = trip._id;

    // On recherche tous les events suivant le tripId
    const findEvents = await Event.find({ trip: tripId });

    // Si on trouve pas d'events, on retourne une erreur
    if (!findEvents) {
      return res.status(404).json({ result: false, error: "Events not found" });
    }

    // On récupère tous les IDs des événements à supprimer
    const eventIdsToDelete = findEvents.map((event) => event._id);

    // On supprime tous les événements dont l'ID est présent dans le tableau eventIdsToDelete
    await Event.deleteMany({ _id: { $in: eventIdsToDelete } });
    res.json({ result: true });
  } catch (error) {
    console.error("Erreur lors de la suppression des Events :", error);
    res.status(404).json({ result: false, error: "Erreur lors de la suppression des Events" });
  }
});


// Route POST pour s'ajouter à un événement
router.post("/participant", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "tokenEvent"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const { token, tokenEvent } = req.body;

  // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
  const user = await checkTokenSession(token);
  if (!user) {
    return res.status(404).json({ result: false, error: "User not found" });
  }

  // On recherche un event suivant le tokenEvent
  const findEvent = await Event.findOne({ tokenEvent });
  
  // Si on trouve pas l'event, ou que le user ne participe pas au Trip, on retourne une erreur
  if (!findEvent || !user.trips.includes(findEvent.trip)) {
    return res.status(404).json({ result: false, error: "Event not found" });
  }

  // Si le user est le créateur de l'évènement ou qu'il y participe déjà, on retourne une erreur
  if (user._id === findEvent.user || findEvent.participants.includes(user._id)) {
    return res.status(404).json({ result: false, error: "User already added" });
  }

  try {
    // On ajoute l'utilisateur à la liste des participants de l'event
    findEvent.participants.push(user._id);
    await findEvent.save();

    // On populate les infos de l'Event
    await findEvent.populate([{ path: "user" }, { path: "trip" }, { path: "participants" }, { path: "infos.user" }]);

    // On filtre les infos que l'on veut renvoyer en front
    const eventRes = parseEvent(findEvent);
    res.json({ result: true, event: eventRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'Event :", error);
    res.status(404).json({ result: false, error: "Erreur lors de l'enregistrement de l'Event" });
  }
});


// Route POST pour s'enlever d'un événement
router.delete("/participant", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "tokenEvent"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const { token, tokenEvent } = req.body;

  // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
  const user = await checkTokenSession(token);
  if (!user) {
    return res.status(404).json({ result: false, error: "User not found" });
  }

  // On recherche un event suivant le tokenEvent
  const findEvent = await Event.findOne({ tokenEvent });
  
  // Si on trouve pas l'event, ou que le user ne participe pas au Trip, on retourne une erreur
  if (!findEvent || !user.trips.includes(findEvent.trip)) {
    return res.status(404).json({ result: false, error: "Event not found" });
  }

  // Si le user est le créateur de l'évènement ou qu'il n'y participe pas, on retourne une erreur
  if (user._id === findEvent.user || !findEvent.participants.includes(user._id)) {
    return res.status(404).json({ result: false, error: "User can not be removed" });
  }

  try {
    // On supprime l'utilisateur à la liste des participants de l'event
    const userIndex = findEvent.participants.indexOf(user._id);
    findEvent.participants.splice(userIndex, 1);
    await findEvent.save();

    // On populate les infos de l'Event
    await findEvent.populate([{ path: "user" }, { path: "trip" }, { path: "participants" }, { path: "infos.user" }]);

    // On filtre les infos que l'on veut renvoyer en front
    const eventRes = parseEvent(findEvent);
    res.json({ result: true, event: eventRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'Event :", error);
    res.status(404).json({ result: false, error: "Erreur lors de l'enregistrement de l'Event" });
  }
});


module.exports = router;
