const express = require("express");

const commentController = require("../controllers/comment.controller");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/post/get-comment/:postId", isAuth, commentController.getComments);

router.post("/post/new-comment", isAuth, commentController.newComment);

router.post("/post/like-comment", isAuth, commentController.likeComment);

router.post("/post/dislike-comment", isAuth, commentController.dislikeComment);

router.get(
  "/post/delete-comment/:cmtId",
  isAuth,
  commentController.deleteComment
);

module.exports = router;
