const fs = require("fs");
const path = require("path");

const io = require("../socket");

const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const imagemin = require("imagemin");
const mozjpeg = require("imagemin-mozjpeg");
const pngquant = require("imagemin-pngquant");

const User = require("../models/User");
const Chat = require("../models/Chat");

exports.getChats = (req, res, next) => {
  const convoId = req.params.convoId;

  if (!convoId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.find({
    convos: convoId,
  })
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ chatDoc: chatDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUnread = (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.find({ to: userId, seen: false })
    .then((seenDoc) => {
      if (!seenDoc) {
        const error = new Error("Convesation not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const unreadMessages = seenDoc.length;
      res.status(200).json({ seenDoc: unreadMessages });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUnreadConvos = (req, res, next) => {
  const convoId = req.params.convoId;

  if (!convoId) {
    const error = new Error("Convesation not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.find({ convos: convoId, seen: false })
    .then((seenDoc) => {
      if (!seenDoc) {
        const error = new Error("Convesation not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const unreadMessages = seenDoc.length;
      console.log(unreadMessages);
      res.status(200).json({ seenDoc: unreadMessages });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.sendText = (req, res, next) => {
  const userId = req.params.userId;
  const toUserId = req.body.toUserId;
  const convoId = req.body.convoId;
  const text = req.body.text;

  if (!userId || !toUserId || !convoId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  const newChat = new Chat({
    convos: convoId,
    from: userId,
    to: toUserId,
    body: text,
    liked: false,
    seen: false,
  });

  return newChat
    .save()
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Cannot send your message at the moment!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      console.log(chatDoc);

      io.getIO().emit("chat", {
        action: "new-chat",
        payload: chatDoc,
        convoId: chatDoc.convos,
      });
      res.status(200).json({ isSend: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setLiked = (req, res, next) => {
  const msgId = req.params.msgId;
  const userId = req.query.userId;

  if (!msgId || !userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.findById(msgId)
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (chatDoc.to.toString() !== userId.toString()) {
        const error = new Error("It seems like you cannot like this message.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      chatDoc.liked = true;
      return chatDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("It seems like you cannot like this message.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", { action: "liked", payload: result });
      res.status(200).json({ liked: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setOneSeen = (req, res, next) => {
  const userId = req.query.userId;
  const msgId = req.params.msgId;

  if (!msgId || !userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.findById(msgId)
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (cmtDoc.to.toString() !== userId.toString()) {
        return;
      }
      chatDoc.seen = true;
      return chatDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", { action: "seen", payload: result });
      res.status(200);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setSeen = (req, res, next) => {
  const convoId = req.params.convoId;
  const userId = req.query.userId;

  if (!convoId) {
    const error = new Error("Conversations not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.updateMany({ convos: convoId, to: userId }, { $set: { seen: true } })
    .then((result) => {
      if (!result) {
        const error = new Error("Server error!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", {
        action: "seen-all",
        payload: convoId,
        seenBy: userId,
      });
      res.status(200).json({ isSeen: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setDisliked = (req, res, next) => {
  const msgId = req.params.msgId;
  const userId = req.query.userId;

  if (!msgId || !userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.findById(msgId)
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (chatDoc.to.toString() !== userId.toString()) {
        const error = new Error(
          "It seems like you cannot dislike this message."
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      chatDoc.liked = false;
      return chatDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error(
          "It seems like you cannot dislike this message."
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", { action: "disliked", payload: result });
      res.status(200);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteText = (req, res, next) => {
  const msgId = req.params.msgId;
  const userId = req.query.userId;

  if (!msgId || !userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.findById(msgId)
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (chatDoc.from.toString() !== userId.toString()) {
        const error = new Error(
          "It seems like you cannot delete this message."
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Chat.findByIdAndRemove(msgId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error(
          "It seems like you cannot delete this message."
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", { action: "delete", payload: msgId });
      res.status(200).json({ isDeleted: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.sendMediaText = async (req, res, next) => {
  const userId = req.params.userId;
  const convoId = req.body.convoId;
  const toUserId = req.body.toUserId;

  if (!userId || !toUserId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No image provided!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  const compressFile = await imagemin(["images/" + req.file.filename], {
    destination: "images",
    plugins: [
      mozjpeg({
        quality: 50,
      }),
      pngquant({
        quality: 50,
      }),
    ],
  });

  const newChat = new Chat({
    convos: convoId,
    from: userId,
    to: toUserId,
    liked: false,
    seen: false,
    img: req.file.path,
  });

  return newChat
    .save()
    .then((chatDoc) => {
      if (!chatDoc) {
        const error = new Error("Messages not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("chat", { action: "new-chat", payload: chatDoc });
      res.status(200).json({ isSend: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
