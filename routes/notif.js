const express = require("express");

const notifController = require("../controllers/notif.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/notif/get-notif/:userId", isAuth, notifController.getNotifs);

router.get("/notif/set-seen/:userId", isAuth, notifController.setSeen);

router.get("/notif/get-unread/:userId", isAuth, notifController.getUnread);

router.get("/notif/set-one-seen/:notifId", isAuth, notifController.setOneSeen);

module.exports = router;
