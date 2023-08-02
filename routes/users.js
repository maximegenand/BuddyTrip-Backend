var express = require('express');
var router = express.Router();

const User = require('../models/users');
const { checkBody } = require('../modules/checkBody');
const uid2 = require('uid2');
const bcrypt = require('bcrypt');

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

  // Vérifier si l'utilisateur est déjà enregistré
  const user = await User.findOne({ username: req.body.username });

  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({
      result: true,
      user: {
        tokenSession: user.tokenSession,
        tokenUser: user.tokenUser,
        username: user.username,
        email: user.email,
      },
    });
  } else {
    res.json({ result: false, error: 'User not found or wrong password' });
  }
});

module.exports = router;

