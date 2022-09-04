const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    comment: {
      type: String,
      required: true,
    },
    cmtBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    postId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Post",
    },
    liked: [
      {
        likedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
