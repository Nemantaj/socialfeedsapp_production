const express = require("express");

const convosController = require("../controllers/convos.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get(
  "/chat/create-convos/:userId",
  isAuth,
  convosController.createPrivateConvos
);

router.get(
  "/chat/delete-convos/:convoId",
  isAuth,
  convosController.deleteConvos
);

router.get("/chat/get-convos/:userId", isAuth, convosController.getConvos);

router.get(
  "/chat/get-convos-details/:convoId",
  isAuth,
  convosController.getConvosDetails
);

module.exports = router;
