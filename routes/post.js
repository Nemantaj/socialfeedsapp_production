const express = require("express");

const postController = require("../controllers/post.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/post/get-posts/:userId", isAuth, postController.getPosts);

router.get(
  "/post/get-story-holders/:userId",
  isAuth,
  postController.getStoryHolders
);

router.get("/post/get-stories/:holderId", isAuth, postController.getStories);

router.get("/post/get-likes/:postId", isAuth, postController.getLikes);

router.get("/post/delete-post/:postId", isAuth, postController.deletePost);

router.get("/post/get-user-posts/:userId", isAuth, postController.getUserPosts);

router.get(
  "/post/get-single-post/:postId",
  isAuth,
  postController.getSinglePost
);

router.get(
  "/post/set-story-seen/:holderId",
  isAuth,
  postController.setStorySeen
);

router.post("/post/new-post/:userId", isAuth, postController.newPost);

router.post("/post/new-story/:userId", isAuth, postController.newStory);

router.post("/post/like-post", isAuth, postController.likePosts);

router.post("/post/dislike-post", isAuth, postController.dislikePosts);

router.post(
  "/post/change-caption/:postId",
  isAuth,
  postController.changeCaption
);

module.exports = router;
