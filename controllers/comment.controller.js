const fs = require("fs");
const path = require("path");

const io = require("../socket");

const User = require("../models/User");
const Post = require("../models/Post");
const Notif = require("../models/Notifs");
const Comment = require("../models/Comment");
const socket = require("../socket");

exports.newComment = (req, res, next) => {
  const userId = req.body.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const img = req.body.img;

  const postId = req.body.postId;

  let newCmt;
  let cmtCount;
  let toUserId;
  let cmtId;

  if (!userId || !postId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  const newComment = new Comment({
    comment: req.body.cmtText,
    cmtBy: userId,
    postId: postId,
    liked: [],
  });

  newComment
    .save()
    .then((cmtDoc) =>
      cmtDoc.populate("cmtBy", ["fname", "lname", "_id", "img"]).execPopulate()
    )
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured while trying to comment!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      cmtId = result._id;

      newCmt = result;
      return Post.findById(postId).select("userId");
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured while trying to comment!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      toUserId = { userId: result.userId, seen: false };

      return Notif.findOne({ refTo: postId, notifType: "comment" });
    })
    .then((result) => {
      if (!result) {
        const newNotif = new Notif({
          to: toUserId,
          title: `${fname + " " + lname} commented on your post.`,
          notifType: "comment",
          refTo: postId,
          image: img,
          liked: [],
        });
        cmtCount = 1;
        return newNotif.save();
      } else {
        cmtCount = 2;
        result.title = `${
          fname + " " + lname
        } has also commented on your post.`;
        result.img = img;
        return result.save();
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured while trying to comment!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("comment", {
        action: "new-comment",
        payload: newCmt,
      });

      io.getIO().emit("notif", {
        action: "new-comment",
        payload: result,
        count: cmtCount,
      });

      res.status(200).json({ isSuccess: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.likeComment = (req, res, next) => {
  const postId = req.body.postId;
  const cmtId = req.body.cmtId;
  const userId = req.body.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const img = req.body.img;

  let cmt;
  let cmtCount;

  if (!postId || !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Comment.findById(cmtId)
    .populate("cmtBy", ["fname", "lname", "_id", "img"])
    .then((cmtDoc) => {
      if (!cmtDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const like = { likedBy: userId };
      cmtDoc.liked.push(like);

      return cmtDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      cmt = result;

      return Notif.findOne({ refTo: cmt._id, notifType: "cmt-like" });
    })
    .then((result) => {
      if (result === null) {
        const newNotif = new Notif({
          to: { userId: cmt.cmtBy, seen: false },
          title: `${fname + " " + lname} liked your comment.`,
          notifType: "cmt-like",
          refTo: cmtId,
          image: img,
          postId: postId,
        });
        cmtCount = 1;
        return newNotif.save();
      } else {
        const cmtCounter = cmt.liked.length - 1;
        result.title = `${
          fname + " " + lname
        } and ${cmtCounter} others liked your comment.`;
        result.img = img;
        cmtCount = cmtCounter;
        return result.save();
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      console.log(result);

      io.getIO().emit("comment", {
        action: "like-comment",
        liked: true,
        cmt: cmt,
      });

      io.getIO().emit("notif", {
        action: "liked-comment",
        payload: result,
        likeCounter: cmtCount,
      });

      res.status(200).json({ liked: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.dislikeComment = (req, res, next) => {
  const postId = req.body.postId;
  const cmtId = req.body.cmtId;
  const userId = req.body.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const img = req.body.img;

  let cmt;
  let cmtCount;
  let notifId;

  if (!postId || !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Comment.findById(cmtId)
    .populate("cmtBy", ["fname", "lname", "_id", "img"])
    .then((cmtDoc) => {
      if (!cmtDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      cmtDoc.liked = cmtDoc.liked.filter((doc) => {
        return doc.likedBy.toString() !== userId.toString();
      });

      return cmtDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      cmt = result;

      return Notif.findOne({ refTo: cmtId, notifType: "cmt-like" });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      cmtCount = cmt.liked.length - 1;

      if (cmtCount > 0) {
        result.title = `${cmtCount} users have commented on your post.`;
        result.img = img;

        return result.save();
      } else {
        notifId = result._id;
        return Notif.findByIdAndRemove(notifId);
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      console.log(result + "dis");

      io.getIO().emit("comment", {
        action: "dislike-comment",
        liked: true,
        cmt: cmt,
      });

      if (cmtCount > 0) {
        io.getIO().emit("notif", {
          action: "dislike-comment",
          payload: result,
        });
      } else {
        io.getIO().emit("notif", {
          action: "disliked-comment",
          payload: notifId,
        });
      }

      res.status(200).json({ liked: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteComment = (req, res, next) => {
  const cmtId = req.params.cmtId;
  const userId = req.query.userId;
  const postId = req.query.postId;

  let cmtLength;

  if (!cmtId || !userId || !postId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Comment.findById(cmtId)
    .then((cmtDoc) => {
      if (!cmtDoc) {
        const error = new Error("Could not find the comment!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (cmtDoc.cmtBy.toString() !== userId.toString()) {
        const error = new Error(
          "You are not authorized to delete this comment!"
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Comment.findByIdAndRemove(cmtId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Notif.deleteMany({
        refTo: cmtId,
        notifType: "cmt-like",
      });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Comment.find({ postId: postId });
    })
    .then((cmtDoc) => {
      if (!cmtDoc) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      cmtLength = cmtDoc.length;

      return Notif.findOne({ refTo: postId, notifType: "comment" });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      console.log(result);

      if (cmtLength > 0) {
        result.title = `There are ${cmtLength} comments on your post. `;
        return result.save();
      } else {
        return Notif.deleteMany({ refTo: postId, notifType: "comment" });
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("comment", { action: "delete-comment", cmtId: cmtId });
      io.getIO().emit("notif", { action: "delete-comment", payload: cmtId });

      res.status(200).json({ deleted: true });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getComments = (req, res, next) => {
  const postId = req.params.postId;

  if (!postId) {
    const error = new Error("Error Occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Comment.find({ postId: postId })
    .populate("cmtBy", ["fname", "lname", "img", "_id"])
    .then((cmtDoc) => {
      if (!cmtDoc) {
        const error = new Error("Could not find any comments!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ cmtData: cmtDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
