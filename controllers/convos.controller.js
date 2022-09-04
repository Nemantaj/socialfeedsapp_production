const fs = require("fs");
const path = require("path");

const io = require("../socket");
const mongoose = require("mongoose");

const Chat = require("../models/Chat");
const Convos = require("../models/Convos");

exports.createPrivateConvos = (req, res, next) => {
  const userId = req.params.userId;
  const fromId = req.query.fromId;

  if (!userId || !fromId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  const usersList = [
    mongoose.Types.ObjectId(userId),
    mongoose.Types.ObjectId(fromId),
  ];

  const userIds = [
    { userId: mongoose.Types.ObjectId(userId) },
    { userId: mongoose.Types.ObjectId(fromId) },
  ];

  Convos.find({ users: { $all: userIds } })
    .then((match) => {
      if (match.length > 0) {
        const error = new Error(
          "A conversation with this user already exists!"
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      } else {
        const newConvos = new Convos({
          users: [{ userId: userId }, { userId: fromId }],
          type: "private",
        });

        return newConvos
          .save()
          .then((conDoc) =>
            conDoc
              .populate("users.userId", ["fname", "lname", "img", "_id"])
              .execPopulate()
          );
      }
    })
    .then((conDoc) => {
      if (!conDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const convoHeader = conDoc.users.filter((doc) => {
        return doc.userId._id.toString() !== userId.toString();
      });

      const newFiltered = {
        type: conDoc.type,
        header: convoHeader,
        _id: conDoc._id,
        createdAt: conDoc.createdAt,
      };

      io.getIO().emit("convos", {
        action: "new-convos",
        payload: newFiltered,
        userId: userId,
        otherId: convoHeader[0].userId._id,
      });
      res.status(200).json({ created: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteConvos = (req, res, next) => {
  const userId = req.query.userId;
  const convoId = req.params.convoId;

  if (!userId || !convoId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Convos.findById(convoId)
    .then((conDoc) => {
      if (!conDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const isConvoUser = conDoc.users.some((doc) => {
        return doc.userId.toString() === userId.toString();
      });

      if (!isConvoUser) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Convos.findByIdAndRemove(convoId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Chat.deleteMany({ convos: convoId });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("convos", { action: "delete-convos", payload: convoId });
      res.status(200).json({ title: "Success", msg: "Deleted successfully." });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getConvos = (req, res, next) => {
  const userId = req.params.userId;
  let newConvos;
  let latestMessage;

  if (!userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Convos.find({ "users.userId": userId })
    .populate("users.userId", ["fname", "lname", "img", "_id"])
    .then((conDoc) => {
      if (!conDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const newFiltered = conDoc.map((data) => {
        const convoHeader = data.users.filter((doc) => {
          return doc.userId._id.toString() !== userId.toString();
        });

        return {
          type: data.type,
          header: convoHeader,
          _id: data._id,
          createdAt: data.createdAt,
        };
      });

      newConvos = newFiltered;

      res.status(200).json({ convosData: newConvos });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getConvosDetails = (req, res, next) => {
  const convoId = req.params.convoId;
  const userId = req.query.userId;

  let latestMessage;

  if (!convoId && !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Chat.findOne({ convos: convoId })
    .sort({ _id: -1 })
    .populate("from", ["fname", "_id"])
    .then((conDoc) => {
      if (!conDoc) {
        conDoc = {};
      }

      if (Object.keys(conDoc).length) {
        const isFromUser = conDoc.from._id.toString() === userId.toString();
        latestMessage = { conData: conDoc, isFromUser: isFromUser };
      } else {
        latestMessage = null;
      }

      return Chat.find({ convos: convoId, to: userId, seen: false });
    })
    .then((unRead) => {
      if (!unRead) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const unreadMessages = unRead.length;

      res
        .status(200)
        .json({ latest: latestMessage, unread: unreadMessages, isRes: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
