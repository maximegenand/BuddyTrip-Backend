var express = require('express');
var router = express.Router();
const User = require('../models/users');
const bcrypt = require('bcrypt');
const uid2 = require('uid2');
const { format } = require("date-fns");


// Import des fonctions
const { checkBody } = require('../modules/checkBody');
const { parseTrip } = require("../modules/parseTrip");


// On récupère la date d'aujourd'hui sans les heures
const dateNow = new Date(format(new Date(), "yyyy-MM-dd"));

// Route pour l'inscription (signup)
router.post('/signup', async (req, res) => {
  if (!checkBody(req.body, ['username', 'email', 'password'])) {
    return res.json({ result: false, error: 'Missing or empty fields' });
  }

  // Check if the user has not already been registered
  const existingUser = await User.findOne({ username: req.body.username });

  if (!existingUser) {
    const hash = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
      tokenUser: uid2(32),
      tokenSession: uid2(32),
      username: req.body.username,
      email: req.body.email,
      password: hash,
      active: true,
    });

    const savedUser = await newUser.save();

    res.json({
      result: true,
      user: {
        tokenSession: savedUser.tokenSession,
        tokenUser: savedUser.tokenUser,
        username: savedUser.username,
        email: savedUser.email,
      },
    });
  } else {
    // User already exists in database
    res.json({ result: false, error: 'User already exists' });
  }
});

// Route pour la connexion (signin)
router.post('/signin', async (req, res) => {
  if (!checkBody(req.body, ['email', 'password'])) {
    return res.json({ result: false, error: 'Missing or empty fields' });
  }

  // Vérifier si l'utilisateur est déjà enregistré (email insensible à la casse ) et qu'il est actif
  const user = await User.findOne({ email: { '$regex': req.body.email, $options: 'i' }, active: true });

  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    await user.populate("trips");
    await user.populate([{ path: "trips.user" }, { path: "trips.participants" }]);

    // On filtre la date pour afficher seulement les Trip dont la date de fin est égale ou après aujourd'hui
    const tripsBrut = user.trips.filter((trip) => new Date(trip.dateEnd) >= dateNow);

    // On filtre les infos que l'on veut renvoyer en front
    const trips = tripsBrut.map((trip) => parseTrip(trip));

    return res.json({
      result: true,
      user: {
        token: user.tokenSession,
        username: user.username,
        email: user.email,
        image: user.image,
      },
      trips,
    });
  } else {
    res.json({ result: false, error: 'User not found or wrong password' });
  }
});

module.exports = router;

