const express = require("express");

const chatController = require("../controllers/chat.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/chat/get-chats/:convoId", isAuth, chatController.getChats);

router.post("/chat/send-text/:userId", isAuth, chatController.sendText);

router.get("/chat/set-liked/:msgId", isAuth, chatController.setLiked);

router.get("/chat/set-one-seen/:msgId", isAuth, chatController.setOneSeen);

router.get("/chat/set-seen/:convoId", isAuth, chatController.setSeen);

router.get("/chat/set-disliked/:msgId", isAuth, chatController.setDisliked);

router.get("/chat/delete-text/:msgId", isAuth, chatController.deleteText);

router.get("/chat/get-unread/:userId", isAuth, chatController.getUnread);

router.post(
  "/chat/send-media-text/:userId",
  isAuth,
  chatController.sendMediaText
);

module.exports = router;
