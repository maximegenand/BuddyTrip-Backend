var express = require("express");
var router = express.Router();
const Trip = require("../models/trips");

router.post("/trips", async (req, res) => {
  if (!checkBody(req.body, ["name", "dateStart", "dateEnd", "description"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  // Destructuration des données du corps de la requête
  const { name, dateStart, dateEnd, description } = req.body;

  // Créer un nouveau voyage (trip)
  const newTrip = new Trip({
    name,
    dateStart,
    dateEnd,
    description,
  });

  // Sauvegarder le voyage dans la base de données
  try {
    await newTrip.save();
    res.json({ message: "Voyage créé avec succès !", trip: newTrip });
  } catch (error) {
    console.error("Erreur lors de la création du voyage:", error);
    res.status(500).json({ error: "Erreur lors de la création du voyage." });
  }
});

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

module.exports = router;
