const express = require("express");
const router = express.Router();
const Trip = require("../models/trips");
const User = require("../models/users");
const Event = require("../models/events");
const uid2 = require("uid2");
const { format } = require("date-fns");

// Import des fonctions
const { checkBody } = require("../modules/checkBody");
const { checkTokenSession, checkTokenUser } = require("../modules/checkUser");
const { parseTrip } = require("../modules/parseTrip");
const { parseEvent } = require("../modules/parseEvent");

// On récupère la date d'aujourd'hui sans les heures
const dateNow = new Date(format(new Date(), "yyyy-MM-dd"));

// Route POST pour créer un trip
router.post("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "trip"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const token = req.body.token;
  const trip = req.body.trip;

  // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
  const user = await checkTokenSession(token);
  if (!user) {
    return res.status(404).json({ result: false, error: "User not found" });
  }

  // On récupère les id des participants
  const participantsBrut = await Promise.all(trip.participants.map(async (token) => await checkTokenUser(token)));
  // On filtre pour supprimer les retours vides
  const participants = participantsBrut.filter((e) => e && e);

  // On créé un nouveau Trip
  const newTrip = new Trip({
    tokenTrip: uid2(32),
    user: user._id,
    name: trip.name,
    dateStart: trip.dateStart,
    dateEnd: trip.dateEnd,
    description: trip.description,
    participants,
  });

  try {
    // On enregistre le Trip
    await newTrip.save();

    // Lier le nouveau voyage à l'utilisateur qui l'a créé
    user.trips.push(newTrip._id); // Ajoute directement le nouveau voyage au tableau trips de l'utilisateur
    await user.save();

    // On populate les infos du Trip
    await newTrip.populate("user");
    await newTrip.populate("participants");

    // On filtre les infos que l'on veut renvoyer en front
    const tripRes = parseTrip(newTrip);
    res.json({ result: true, trip: tripRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du Trip :", error);
    res.status(404).json({ result: false, error: "Erreur lors de l'enregistrement du Trip" });
  }
});

// Route PUT pour update un trip
router.put("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "trip"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.body
  const token = req.body.token;
  const { tokenTrip, name, dateStart, dateEnd, description } = req.body.trip;

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On recherche un trip suivant le tokenTrip
    const findTrip = await Trip.findOne({ tokenTrip });

    // Si on trouve pas le trip, on retourne une erreur
    if (!findTrip) {
      return res.status(404).json({ result: false, error: "Trip not found" });
    }

    // Si le user n'est pas propriétaire du trip
    if (findTrip.user.toString() !== user._id.toString()) {
      return res.status(404).json({ result: false, error: "Not allowed" });
    }

    // On update le Trip
    const update = await Trip.updateOne({ _id: findTrip._id }, { name, dateStart, dateEnd, description });
    // Si on n'a pas pu modifier
    return res.json({ result: true });
  } catch (error) {
    console.error("Erreur lors de l'update du Trip :", error);
    return res.status(404).json({ result: false, error: "Erreur lors de l'update du Trip" });
  }

  // IL FAUT AJOUTER LA GESTION DE L'EXISTANCE DES INPUTS ET MODIFIER LES INFOS RENVOYEES SI TRUE
});

// Route DELETE pour supprimer un Trip
router.delete("/", async (req, res) => {
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

    // On recherche un trip suivant le tokenTrip
    const findTrip = await Trip.findOne({ tokenTrip });

    // Si on trouve pas le trip, on retourne une erreur
    if (!findTrip) {
      return res.status(404).json({ result: false, error: "Trip not found" });
    }

    // Si le user n'est pas propriétaire du trip
    if (findTrip.user.toString() !== user._id.toString()) {
      return res.status(404).json({ result: false, error: "Not allowed" });
    }

    // On supprime le Trip
    await Trip.deleteOne({ _id: findTrip._id });
    return res.json({ result: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du Trip :", error);
    return res.status(404).json({ result: false, error: "Erreur lors de la suppression du Trip" });
  }

  // IL FAUT AJOUTER LA GESTION DE LA SUPPRESSION DU TRIP DANS LA COLLECTION USERS
});

// Route GET pour récupérer les nouveaux Trips
router.get("/next", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.query, ["token"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.query
  const token = req.query.token;

  console.log("query param", req.query.token);

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    console.log("user", user);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }
    await user.populate("trips");
    await user.populate([{ path: "trips.user" }, { path: "trips.participants" }]);

    // On filtre la date pour afficher seulement les Trip dont la date de fin est égale ou après aujourd'hui
    const tripsBrut = user.trips.filter((trip) => new Date(trip.dateEnd) >= dateNow);

    // On filtre les infos que l'on veut renvoyer en front
    const trips = tripsBrut.map((trip) => parseTrip(trip));

    return res.json({ result: true, trips });
  } catch (error) {
    console.error("Erreur lors de la récupération des Trips :", error);
    return res.status(404).json({ result: false, error: "Erreur lors de la récupération des Trips" });
  }
});

// Route GET pour récupérer les anciens Trips
router.get("/past", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.query, ["token"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.query
  const token = req.query.token;

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    await user.populate("trips");
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On filtre la date pour afficher seulement les Trips dont la date de fin est plus ancienne que aujourd'hui
    const tripsBrut = user.trips.filter((trip) => new Date(trip.dateEnd) < dateNow);

    // On filtre les infos que l'on veut renvoyer en front
    const trips = tripsBrut.map((trip) => parseTrip(trip));

    res.json({ result: true, trips });
  } catch (error) {
    console.error("Erreur lors de la récupération des Trips :", error);
    res.status(404).json({ result: false, error: "Erreur lors de la récupération des Trips" });
  }
});

// Route GET pour récupérer les informations du Trip et la liste de ses événements
router.get("/:tokenTrip", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.query, ["token"]) || !checkBody(req.params, ["tokenTrip"])) {
    return res.status(404).json({ result: false, error: "Missing or empty fields" });
  }

  // On récupère les infos du req.param && req.query
  const token = req.query.token;
  const tokenTrip = req.params.tokenTrip;

  try {
    // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
    const user = await checkTokenSession(token);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // On cherche le trip correspondant au tokenTrip et en vérifiant que l'utilisateur est soit l'auteur, soit participant
    // $or operator => https://kb.objectrocket.com/mongo-db/or-in-mongoose-1018
    const tripFind = await Trip.findOne({
      tokenTrip,
      $or: [{ user: user._id }, { participants: user._id }],
    });

    // Si aucun Trip n'est trouvé, on retourne une erreur
    if (!tripFind) {
      return res.status(404).json({ result: false, error: "Trip not found" });
    }

    // On populate les infos du Trip
    await tripFind.populate("user");
    await tripFind.populate("participants");

    // On récupère la liste de tous les événements associés à ce Trip
    const eventsFind = await Event.find({ trip: tripFind._id }).populate([
      { path: "user" },
      { path: "trip" },
      { path: "participants" },
      { path: "infos.user" },
    ]);

    // On filtre les infos que l'on veut renvoyer en front
    const tripRes = parseTrip(tripFind);
    const eventsRes = await Promise.all(eventsFind.map(async (event) => await parseEvent(event)));

    res.json({ result: true, trip: tripRes, events: eventsRes });
  } catch (error) {
    console.error("Erreur lors de la récupération du Trip :", error);
    res.status(404).json({ result: false, error: "Erreur lors de la récupération du Trip" });
  }
});

// Route POST pour ajouter un participant à un trip
router.post("/participant", async (req, res) => {
  const { tokenSession, tokenTrip } = req.body;

  // Rechercher l'utilisateur par rapport au tokenSession
  const user = await User.findOne({ tokenSession });

  if (!user) {
    return res.status(404).json({ result: false, error: "Utilisateur non trouvé." });
  }

  // Rechercher le trip par rapport au tokenTrip
  const trip = await Trip.findOne({ tokenTrip }).populate("participants");

  if (!trip) {
    return res.status(404).json({ result: false, error: "Voyage non trouvé." });
  }

  // Vérifier si l'utilisateur est déjà un participant du trip
  if (trip.participants.some((participant) => participant.tokenUser === user.tokenUser)) {
    return res.json({ result: false, error: "L'utilisateur est déjà un participant de ce voyage." });
  }

  // Ajouter l'utilisateur à la liste des participants du trip
  trip.participants.push(user._id);
  await trip.save();

  // Mettre à jour la référence du trip dans le document de l'utilisateur
  user.trips.push(trip._id);
  await user.save();

  res.json({ result: true, trip: trip });
});

// Route DELETE pour enlever un participant à un trip
router.delete("/participant", async (req, res) => {
  const { tokenSession, tokenTrip } = req.body;

  // Rechercher l'utilisateur par rapport au tokenSession
  const user = await User.findOne({ tokenSession });

  if (!user) {
    return res.status(404).json({ result: false, error: "Utilisateur non trouvé." });
  }

  // Rechercher le trip par rapport au tokenTrip
  const trip = await Trip.findOne({ tokenTrip }).populate("participants");

  if (!trip) {
    return res.status(404).json({ result: false, error: "Voyage non trouvé." });
  }

  // Vérifier si l'utilisateur est un participant du trip
  const isParticipant = trip.participants.some((participant) => participant.tokenUser === user.tokenUser);
  if (!isParticipant) {
    return res.json({ result: false, error: "L'utilisateur n'est pas un participant de ce voyage." });
  }

  // Retirer l'utilisateur de la liste des participants du trip
  trip.participants = trip.participants.filter((participant) => participant.tokenUser !== user.tokenUser);
  await trip.save();

  // Mettre à jour la référence du trip dans le document de l'utilisateur
  user.trips.pull(trip._id);
  await user.save();

  res.json({ result: true, trip: trip });
});

module.exports = router;
