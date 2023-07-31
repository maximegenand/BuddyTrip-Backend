var express = require("express");
var router = express.Router();
const Trip = require("../models/trips");
const User = require("../models/users");
const Event = require("../models/events");
const uid2 = require("uid2");

// Import des fonctions
const { checkBody } = require('../modules/checkBody');
const { tokenSession, tokenUser } = require('../modules/checkUser');
const { parseTrip } = require("../modules/parseTrip");

// Route POST pour créer un trip
router.post("/", async (req, res) => {
  // On vérifie si les infos obligatoires sont bien renseignées
  if (!checkBody(req.body, ["token", "trip"])) {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  // Destructuration des données du corps de la requête
  const token = req.body.token;
  const trip = req.body.trip;

  // On vérifie si l'utilisateur existe, et si oui on renvoie ses infos
  const user = await tokenSession(token);
  //console.log(user);
  if(!user) {
    return res.json({ result: false, error: "User not found" });
  }

  // On récupère les id des participants
  const participantsBrut = await Promise.all(trip.participants.map(async token => await tokenUser(token)));
  // On filtre pour supprimer les retours vides
  const participants = participantsBrut.filter(e => e && e);

  // Créer un nouveau voyage (trip)
  const newTrip = new Trip({
    tokenTrip: uid2(32),
    user: user._id,
    name: trip.name,
    dateStart: trip.dateStart,
    dateEnd: trip.dateEnd,
    description: trip.description,
    participants,
  });

  // Sauvegarder le voyage dans la base de données
  try {
    await newTrip.save();
    await newTrip.populate('user');
    await newTrip.populate('participants');
    const tripRes = await parseTrip(newTrip);
    res.json({ result: true, trip: tripRes });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du voyage:", error);
    res.json({ result: false, error: "Erreur lors de l'enregistrement du voyage." });
  }
});

// Route DELETE pour enlever un trip de la database
router.delete("/trips/:tokenTrip", async (req, res) => {
  const tokenTrip = req.params.tokenTrip;

  // Recherchez le voyage (trip) par rapport au tokenTrip
  const tripToDelete = await Trip.findOne({ tokenTrip });

  if (!tripToDelete) {
    // Le voyage (trip) avec le tokenTrip donné n'a pas été trouvé
    return res.status(404).json({ result: false, error: "Voyage non trouvé." });
  }

  // Supprimer le voyage (trip) de la base de données
  await tripToDelete.remove();

  res.json({ result: true, message: "Voyage supprimé avec succès !" });
});

// Route GET pour récupérer les nouveaux trips
router.get("/next", async (req, res) => {
  const token = req.query.tokenSession;
  const user = await User.findOne({ token }).populate("trips");
  if (!user) {
    return res.status(404).json({ result: false, error: "Utilisateur non trouvé." });
  }
  const upComingTrips = user.trips.filter((trip) => new Date(trip.dateEnd) > new Date()); // filtrer les trips pour envoyer que les nouveaux trips
  res.json({ result: true, trips: upComingTrips });
});

// Route GET pour récupérer les anciens trips
router.get("/past", async (req, res) => {
  const token = req.query.tokenSession;
  const user = await User.findOne({ token }).populate("trips");
  if (!user) {
    return res.status(404).json({ result: false, error: "Utilisateur non trouvé." });
  }
  const archiveTrips = user.trips.filter((trip) => new Date(trip.dateEnd) < new Date()); // filtrer les trips pour envoyer que les anciens trips
  res.json({ result: true, trips: archiveTrips });
});

// Route GET pour récupérer les informations du trip et la liste de ses événements
router.get("/trips/:tokenTrip", async (req, res) => {
  const tokenTrip = req.params.tokenTrip;
  const token = req.query.tokenSession;

  // Rechercher le trip par rapport au tokenTrip et en populant les données de l'utilisateur
  const trip = await Trip.findOne({ tokenTrip }).populate("user").populate("participants");

  if (!trip) {
    return res.status(404).json({ result: false, error: "Voyage non trouvé." });
  }

  // Vérifier que l'utilisateur a accès à ce voyage en comparant le token avec celui de l'utilisateur propriétaire ou des participants
  if (trip.user.tokenSession !== token && !trip.participants.some((participant) => participant.tokenUser === token)) {
    return res.json({ result: false, error: "Accès non autorisé à ce voyage." });
  }

  // Récupérer la liste de tous les événements associés à ce trip
  const events = await Event.find({ trip: trip._id }).populate([
    { path: "user" },
    { path: "participants" },
    { path: "infos.user" },
  ]);

  res.json({ result: true, trip: trip, events: events });
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
