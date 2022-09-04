const fs = require("fs");
const path = require("path");

const io = require("../socket");
const mongoose = require("mongoose");

const User = require("../models/User");
const Notif = require("../models/Notifs");
const socket = require("../socket");

exports.getNotifs = (req, res, next) => {
  const userId = req.params.userId;
  const skip = req.query.skip;

  if (!userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Notif.find({
    to: {
      $elemMatch: {
        userId: userId,
      },
    },
  })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(9)
    .then((notifDoc) => {
      if (!notifDoc) {
        const error = new Error("Cannot fetch notifications!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      console.log(notifDoc);

      res.status(200).json({ notifData: notifDoc, isFetched: true });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setSeen = (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    const error = new Error("User not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Notif.updateMany(
    {
      "to.userId": userId,
    },
    { $set: { "to.$.seen": true } }
  )
    .then((result) => {
      if (!result) {
        const error = new Error("Server error!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("seen", { action: "set-seen-all", userId: userId });

      res.status(200).json({ updated: "true" });
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

  Notif.find({
    to: {
      $elemMatch: {
        userId: userId,
        seen: false,
      },
    },
  })
    .then((notifDoc) => {
      if (!notifDoc) {
        const error = new Error("Server error!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const count = notifDoc.length;

      console.log(count);

      res.status(200).json({ count: count, isFetched: true });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setOneSeen = (req, res, next) => {
  const notifId = req.params.notifId;
  const userId = req.query.userId;

  console.log(userId);

  if (!notifId || !userId) {
    const error = new Error("Server error!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Notif.update(
    {
      _id: notifId,
      "to.userId": userId,
    },
    { $set: { "to.$.seen": true } }
  )
    .then((result) => {
      if (!result) {
        const error = new Error("Server error!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Notif.findById(notifId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Server error!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("seen", { action: "seen-one", notif: result });

      res.status(200).json({ updated: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
