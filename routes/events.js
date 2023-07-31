var express = require("express");
var router = express.Router();
const Trip = require("../models/trips");
const User = require("../models/users");
const Event = require("../models/events");
const uid2 = require("uid2");

//pas fini
router.post("/events", async (req, res) => {
  if (!checkBody(req.body, ["name", "description", "place", "timeStart", "timeEnd", "seats", "travelId"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }
  const {name, description, place, timeStart, timeEnd, seats, travelId, token} = req.body;

  const newEvent = new Event({
    tokenEvent: uid2(32),
    user : token,

  })
});

module.exports = router;
