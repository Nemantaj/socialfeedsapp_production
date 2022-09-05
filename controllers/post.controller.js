const fs = require("fs");
const path = require("path");

const io = require("../socket");
const imagemin = require("imagemin");
const mozjpeg = require("imagemin-mozjpeg");
const pngquant = require("imagemin-pngquant");
const mongoose = require("mongoose");

const User = require("../models/User");
const Post = require("../models/Post");
const Notif = require("../models/Notifs");
const Story = require("../models/Story");
const StoryHolder = require("../models/StoryHolder");
const socket = require("../socket");

exports.newPost = async (req, res, next) => {
  const userId = req.params.userId;

  let newPost;
  let resultOne;

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

  const compressFile = await imagemin(["images/" + req.file.filename], {
    destination: "images",
    plugins: [
      mozjpeg({
        quality: 30,
      }),
      pngquant({
        quality: 30,
      }),
    ],
  });

  const post = new Post({
    userId: userId,
    caption: req.body.caption,
    location: req.body.location,
    img: req.file.path,
    likes: [],
  });

  post
    .save()
    .then((postDoc) =>
      postDoc
        .populate("userId", ["fname", "lname", "_id", "img", "friends"])
        .execPopulate()
    )
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured while trying to post!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      newPost = result;

      const toFriends = result.userId.friends.map((doc) => {
        return { userId: doc.userId, seen: false };
      });

      const newNotif = new Notif({
        to: toFriends,
        title: `${
          result.userId.fname + " " + result.userId.lname
        } has created a new post.`,
        notifType: "post",
        refTo: result._id,
        image: result.img,
      });

      return newNotif.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured while trying to post!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      resultOne = result;

      return User.updateOne({ _id: userId }, { $inc: { posts: 1 } });
    })
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured while trying to post!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("new-post", { action: "new-post", post: newPost });
      io.getIO().emit("notif", { action: "new-post", payload: resultOne });

      res.status(200).json({
        success: {
          title: "Success",
          msg: "Posted successfully.",
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

exports.getPosts = (req, res, next) => {
  const userId = req.params.userId;
  const skip = +req.query.skip;
  let posters;

  console.log(skip);

  User.findById(userId)
    .select("friends")
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("User not found!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }
      posters = userDoc.friends.map((doc) => {
        return doc.userId;
      });
      newPosters = [...posters, mongoose.Types.ObjectId(userId)];
      return Post.find({ userId: { $in: newPosters } })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(5)
        .populate("userId", ["fname", "lname", "_id", "img"]);
    })
    .then((data) => {
      if (!data) {
        const error = new Error("Error occured while trying to fetch!.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ posts: data });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.likePosts = (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.body.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const img = req.body.img;

  let post;
  let likeCounter;

  if (!postId || !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .populate("userId", ["fname", "lname", "_id", "img"])
    .then((postDoc) => {
      if (!postDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const like = { likedBy: userId };
      postDoc.likes.push(like);

      return postDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      post = result;

      return Notif.findOne({ refTo: postId, notifType: "like" });
    })
    .then((result) => {
      if (result === null) {
        const newNotif = new Notif({
          to: { userId: post.userId._id, seen: false },
          title: `${fname + " " + lname} liked your post.`,
          notifType: "like",
          refTo: postId,
          image: img,
        });
        likeCounter = 1;
        return newNotif.save();
      } else {
        const likeCount = post.likes.length - 1;
        result.title = `${
          fname + " " + lname
        } and ${likeCount} others liked your post.`;
        result.img = img;
        likeCounter = likeCount;
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

      io.getIO().emit("liked", {
        action: "post-liked",
        liked: true,
        post: post,
      });

      io.getIO().emit("notif", {
        action: "liked-post",
        payload: result,
        likeCounter: likeCounter,
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

exports.dislikePosts = (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.body.userId;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const img = req.body.img;

  let post;
  let likeCount;
  let notifId;

  if (!postId || !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .populate("userId", ["fname", "lname", "_id", "img"])
    .then((postDoc) => {
      if (!postDoc) {
        const error = new Error("Error occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      postDoc.likes = postDoc.likes.filter((doc) => {
        return doc.likedBy.toString() !== userId.toString();
      });

      return postDoc.save();
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      post = result;

      return Notif.findOne({ refTo: postId, notifType: "like" });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      likeCount = post.likes.length - 1;

      if (likeCount > 0) {
        result.title = `${likeCount} users have liked your post.`;
        result.img = img;

        return result.save();
      } else {
        notifId = result._id;
        return Notif.findByIdAndRemove(result._id);
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("liked", {
        action: "post-disliked",
        liked: false,
        post: post,
      });
      if (likeCount > 0) {
        io.getIO().emit("notif", { action: "dislike-post", payload: result });
      } else {
        io.getIO().emit("notif", { action: "disliked-post", payload: notifId });
      }

      res.status(200).json({ liked: "false" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  const userId = req.query.userId;

  if (!postId || !userId) {
    const error = new Error("Error occured!");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  let resultOne;

  Post.findById(postId)
    .then((postDoc) => {
      if (!postDoc) {
        const error = new Error("Could not find the post!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      if (postDoc.userId.toString() !== userId.toString()) {
        const error = new Error("You are not authorized to delete this post!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      clearImage(postDoc.img);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      return Notif.deleteMany({ refTo: postId });
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error Occured!");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      resultOne = result;

      return User.updateOne({ _id: userId }, { $inc: { posts: -1 } });
    })
    .then((result) => {
      io.getIO().emit("new-post", { action: "delete-post", postId: postId });
      io.getIO().emit("notif", {
        action: "delete-post",
        data: resultOne,
        payload: postId,
      });
      res.status(200).json({ deleted: true });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.newStory = async (req, res, next) => {
  const userId = req.params.userId;

  let StoryObj;
  let StoryHolderId;

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

  const compressFile = await imagemin(["images/" + req.file.filename], {
    destination: "images",
    plugins: [
      mozjpeg({
        quality: 25,
      }),
      pngquant({
        quality: 25,
      }),
    ],
  });

  StoryHolder.findOne({ userId: userId })
    .then((result) => {
      if (result === null || result.length >= 0) {
        const newstoryHolder = new StoryHolder({
          userId: userId,
          seenBy: [],
        });
        return newstoryHolder.save().then((resultNew) => {
          StoryHolderId = resultNew._id;
          const newStory = new Story({
            userId: userId,
            stories: { img: req.file.path, caption: req.body.caption },
            storyHolder: StoryHolderId,
          });
          return newStory.save();
        });
      } else {
        console.log(result);
        StoryHolderId = result._id;
        result.createdAt = Date.now();
        result.seenBy = [];
        return result.save().then((resultNew) => {
          const newStory = new Story({
            userId: userId,
            stories: { img: req.file.path, caption: req.body.caption },
            storyHolder: StoryHolderId,
          });
          return newStory.save();
        });
      }
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("story", { action: "new-story", story: result });

      res.status(200).json({ story: "success" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// exports.getStory = (req, res, next) => {
//   const userId = req.params.userId;

//   if (!userId) {
//     const error = new Error("Error occured.");
//     error.title = "Error Occured";
//     error.statusCode = 422;
//     throw error;
//   }

//   User.findById(userId)
//     .select("friends")
//     .then((userDoc) => {
//       if (!userDoc) {
//         const error = new Error("Error occured.");
//         error.title = "Error Occured";
//         error.statusCode = 422;
//         throw error;
//       }
//       const users = userDoc.friends.map((doc) => {
//         return doc.userId;
//       });
//       const userList = [...users, mongoose.Types.ObjectId(userId)];

//       return Story.find({ userId: { $in: userList } }).populate("userId", [
//         "fname",
//         "lname",
//         "img",
//         "_id",
//       ]);
//     })
//     .then((result) => {
//       if (result === undefined || result === null) {
//         const error = new Error("Error occured.");
//         error.title = "Error Occured";
//         error.statusCode = 422;
//         throw error;
//       }

//       console.log(result);

//       const Stories = result.map((doc) => {
//         const path = doc.stories.img;
//         const path2 = path.replace(/\\/g, "/");
//         return {
//           url: `http://localhost:3001/${path2}`,
//           header: {
//             heading: doc.userId.fname + " " + doc.userId.lname,
//             subheading: `${doc.expire_at}`,
//             profileImage: `http://localhost:3001${doc.userId.img}`,
//           },
//           userId: doc.userId._id,
//         };
//       });

//       console.log(Stories);

//       res.status(200).json({
//         stories: Stories,
//       });
//     })
//     .catch((err) => {
//       if (!err.statusCode) {
//         err.statusCode = 500;
//       }
//       next(err);
//     });
// };

exports.getStoryHolders = (req, res, next) => {
  const userId = req.params.userId;

  if (!userId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  User.findById(userId)
    .select("friends")
    .then((userDoc) => {
      if (!userDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const users = userDoc.friends.map((doc) => {
        return doc.userId;
      });

      const userList = [...users, mongoose.Types.ObjectId(userId)];

      return StoryHolder.find({ userId: { $in: userList } }).populate(
        "userId",
        ["fname", "lname", "img", "_id"]
      );
    })
    .then((storyDoc) => {
      res.status(200).json({ storyHolders: storyDoc, success: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getStories = (req, res, next) => {
  const holderId = req.params.holderId;

  if (!holderId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Story.find({ storyHolder: holderId })
    .then((storyDoc) => {
      if (!storyDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const Stories = storyDoc.map((doc) => {
        const path = doc.stories.img;
        const path2 = path.replace(/\\/g, "/");
        return {
          url: `https://socialfeedsapp.vercel.app/${path2}`,
          header: {
            heading: doc.stories.caption,
            subheading: new Date(doc.expire_at)
              .toISOString()
              .slice(0, 19)
              .replace(/-/g, "/")
              .replace("T", " "),
          },
        };
      });

      res.status(200).json({ storyDoc: Stories, success: "true" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.setStorySeen = (req, res, next) => {
  const userId = req.query.userId;
  const holderId = req.params.holderId;

  if (!userId || !holderId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  StoryHolder.findById(holderId)
    .populate("userId", ["fname", "lname", "img", "_id"])
    .then((holderDoc) => {
      if (!holderDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      const isUser = holderDoc.seenBy.some((doc) => {
        return doc.userId.toString() === userId.toString();
      });

      if (isUser) {
        return holderDoc;
      } else {
        holderDoc.seenBy.push({ userId: userId });
        return holderDoc.save();
      }
    })
    .then((result) => {
      console.log(result);
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ success: "true", newStoryHolder: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getLikes = (req, res, next) => {
  const postId = req.params.postId;

  if (!postId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .select("likes")
    .populate("likes.likedBy", ["fname", "lname", "img", "_id"])
    .then((likeDoc) => {
      if (!likeDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ likeDoc: likeDoc });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.changeCaption = (req, res, next) => {
  const postId = req.params.postId;
  const postCap = req.body.caption;

  if (!postId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .then((postDoc) => {
      if (!postDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      postDoc.caption = req.body.caption;

      return postDoc
        .save()
        .then((postDoc) =>
          postDoc
            .populate("userId", ["fname", "lname", "_id", "img", "friends"])
            .execPopulate()
        );
    })
    .then((result) => {
      if (!result) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      io.getIO().emit("new-post", { action: "edit-post", payload: result });
      res.status(200).json({ isEdited: true });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserPosts = (req, res, next) => {
  const userId = req.params.userId;
  if (!userId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.find({ userId: userId })
    .populate("userId", ["fname", "lname", "_id", "img"])
    .then((userPosts) => {
      if (!userPosts) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ userPosts: userPosts });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;

  if (!postId) {
    const error = new Error("Error occured.");
    error.title = "Error Occured";
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .populate("userId", ["fname", "lname", "_id", "img"])
    .then((postDoc) => {
      if (!postDoc) {
        const error = new Error("Error occured.");
        error.title = "Error Occured";
        error.statusCode = 422;
        throw error;
      }

      res.status(200).json({ postDoc: postDoc });
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
