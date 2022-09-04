const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    img: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      required: true,
    },
    likes: [
      {
        likedBy: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
