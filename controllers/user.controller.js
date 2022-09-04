const fs = require("fs");
const path = require("path");

const io = require("../socket");

const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const imagemin = require("imagemin");
const mozjpeg = require("imagemin-mozjpeg");
const pngquant = require("imagemin-pngquant");

const User = require("../models/User");

exports.getUser = (req, res, next) => {
  const userId = req.params.userId;

  User.findOne({ _id: userId })
    .then((user) => {
      if (!user) {
        const error = new Error("User not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      res.json({
        userData: user,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.searchUser = (req, res, next) => {
  const queryName = req.query.name;

  if (!queryName) {
    const error = new Error("Users not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }
  User.find({ fname: { $regex: queryName, $options: "i" } })
    .select("fname lname img")
    .then((docs) => {
      if (!docs) {
        const error = new Error("No users found.");
        error.title = "Try Again";
        error.statusCode = 422;
        throw error;
      }
      res.json({ docs: docs });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.searchUserFriends = (req, res, next) => {
  const userId = req.params.userId;
  const queryName = req.query.name;

  if (!userId || !queryName) {
    const error = new Error("Users not found!.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.find({
    friends: { $elemMatch: { userId: userId } },
    fname: { $regex: queryName, $options: "i" },
  })
    .select("fname lname img _id")
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Users not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ userResult: userDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.sendRequest = (req, res, next) => {
  const toUser = req.body.toUser;
  const fromUser = req.body.fromUser;

  if (!toUser || !fromUser) {
    const error = new Error("Sending request failed!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(toUser)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Sending request failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      const newRequest = {
        from: fromUser,
        status: "Pending",
      };

      userDoc.requests = [...userDoc.requests, newRequest];
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Sending request failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("send-request", {
        action: "send-request-to",
        data: result,
        request: result.requests,
      });

      return User.findById(fromUser);
    })
    .then((user) => {
      if (!user) {
        const error = new Error("Sending request failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      const newRequested = {
        to: toUser,
      };

      user.requested.push(newRequested);
      return user.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Sending request failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("send-request", {
        action: "send-request-from",
        data: result,
      });

      res.status(200).json({
        message: { title: "Sent!", msg: "Request sent succesfully" },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deleteRequest = (req, res, next) => {
  const userId = req.params.userId;
  const friendId = req.query.friend;

  console.log(`${userId} and ${friendId}`);

  if (!userId || !friendId) {
    const error = new Error("Failed!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(friendId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.requests = userDoc.requests.filter((doc) => {
        return doc.from.toString() !== userId.toString();
      });
      userDoc.requested = userDoc.requested.filter((doc) => {
        return doc.to.toString() !== userId.toString();
      });

      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("delete-request", {
        action: "delete-req-to",
        id: result._id,
      });

      return User.findById(userId);
    })
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.requests = userDoc.requests.filter((doc) => {
        return doc.from.toString() !== friendId.toString();
      });
      userDoc.requested = userDoc.requested.filter((doc) => {
        return doc.to.toString() !== friendId.toString();
      });

      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("delete-request", {
        action: "delete-req-from",
        status: "nothing",
      });

      res.status(200).json({
        title: "Success",
        msg: "Request deleted!",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.checkIsFriends = (req, res, next) => {
  const userId = req.params.userId;
  const friendId = req.query.friend;

  let result;

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const isFriend = userDoc.friends.some((c) => {
        return c.userId == friendId;
      });

      if (isFriend) {
        return (result = "friend");
      }

      const isRequested = userDoc.requested.some((c) => {
        return c.to.toString() === friendId.toString();
      });

      if (isRequested) {
        return (result = "requested");
      }

      const isRequest = userDoc.requests.some((c) => {
        return c.from == friendId;
      });

      if (isRequest) {
        return (result = "pending");
      }

      return (result = "nothing");
    })
    .then((data) => {
      if (!data) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ result: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getRequests = (req, res, next) => {
  const userId = req.params.userId;

  User.findById(userId)
    .select("requests")
    .populate("requests.from", ["fname", "lname", "img", "_id"])
    .exec()
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ userData: userDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.acceptFriend = (req, res, next) => {
  const userId = req.params.userId;
  const friendId = req.query.friend;

  if (!userId || !friendId) {
    const error = new Error("Failed!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(friendId)
    .select("requested friends")
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.requested = userDoc.requested.filter((doc) => {
        return doc.to.toString() !== userId.toString();
      });

      const newFriend = { userId: userId };
      userDoc.friends.push(newFriend);
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return User.findById(userId);
    })
    .then((user) => {
      if (!user) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      user.requests = user.requests.filter((doc) => {
        return doc.from.toString() !== friendId.toString();
      });

      const newFriend = { userId: friendId };
      user.friends.push(newFriend);
      return user.save();
    })
    .then((data) => {
      if (!data) {
        const error = new Error("Sending request failed!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("accept-request", {
        action: "accept-request",
        status: "friend",
      });

      res.status(200).json({
        message: {
          title: "Success",
          msg: "Request accepted!",
        },
        userData: data,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.unfriend = (req, res, next) => {
  const userId = req.params.userId;
  const friendId = req.query.friend;

  if (!userId || !friendId) {
    const error = new Error("Failed!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  let userProfileData;

  User.findById(friendId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.friends = userDoc.friends.filter((doc) => {
        return doc.userId.toString() !== userId.toString();
      });
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      userProfileData = result;
      return User.findById(userId).select("friends");
    })
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error while fetching request data!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.friends = userDoc.friends.filter((doc) => {
        return doc.userId.toString() !== friendId.toString();
      });
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("unfriend", {
        action: "unfriend",
        status: "nothing",
        userData: userProfileData,
      });

      res.status(200).json({ title: "Unfollowed", msg: "Success" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeUserInfo = (req, res, next) => {
  const userId = req.params.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;

  if (!userId || !fname || !lname) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.fname = fname;
      userDoc.lname = lname;

      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "The user info has been successfully changed.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changePassword = (req, res, next) => {
  const userId = req.params.userId;
  const newPass = req.body.newPass;
  const oldPass = req.body.oldPass;

  if (!userId || !newPass || !oldPass) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  let userData;

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userData = userDoc;

      return bcryptjs.compare(oldPass, userDoc.password);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Wrong password! please try again.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return bcryptjs.hash(newPass, 12);
    })
    .then((hashedPass) => {
      userData.password = hashedPass;

      return userData.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error(
          "An error occured while saving new password! please try again."
        );
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        message: {
          title: "Success",
          msg: "The password has been successfully changed!",
        },
        success: "true",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeProfileImage = async (req, res, next) => {
  const userId = req.params.userId;
  let userData;

  if (!userId) {
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

  const compressFile = imagemin(["images/" + req.file.filename], {
    destination: "images",
    plugins: [
      mozjpeg({
        quality: 20,
      }),
      pngquant({
        quality: 20,
      }),
    ],
  });

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (userDoc.img !== "/uploads/profile/default.jpg") {
        clearImage(userDoc.img);
      }

      userDoc.img = req.file.path;
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "The profile image has been changed successfully.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeProfileShowcase = async (req, res, next) => {
  const userId = req.params.userId;
  let userData;

  if (!userId) {
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

  const compressFile = imagemin(["images/" + req.file.filename], {
    destination: "images",
    plugins: [
      mozjpeg({
        quality: 20,
      }),
      pngquant({
        quality: 20,
      }),
    ],
  });

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (userDoc.imgShowcase !== "/uploads/showcase/default.jpg") {
        clearImage(userDoc.img);
      }

      userDoc.imgShowcase = req.file.path;
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "The profile showcase image has been changed successfully.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeUserBio = (req, res, next) => {
  const userId = req.params.userId;
  const newBio = req.body.newBio;

  if (!userId || !newBio) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.bio = newBio;
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "Successfully changed.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeUserWork = (req, res, next) => {
  const userId = req.params.userId;
  const newWork = req.body.newWork;

  if (!userId || !newWork) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      userDoc.work = newWork;
      return userDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "Successfully changed.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.finishUserSetup = (req, res, next) => {
  const userId = req.params.userId;
  const work = req.body.newWork;
  const bio = req.body.newBio;

  console.log(work + " " + bio);

  if (!userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.updateOne(
    { _id: userId },
    { $set: { bio: bio, work: work, newUser: false } }
  )
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return User.findById(userId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({
        userData: result,
        message: {
          title: "Success",
          msg: "Successfully changed.",
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getFriendList = (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(userId)
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const usersList = [...userDoc.friends];
      const editedList = usersList.map((doc) => {
        return doc.userId;
      });

      return User.find({ _id: { $in: editedList } }).sort({ fname: 1 });
    })
    .then((usersDoc) => {
      res.status(200).json({ friendsList: usersDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
