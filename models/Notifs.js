const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const notifSchema = new Schema(
  {
    to: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
        seen: {
          type: Boolean,
          required: true,
        },
      },
    ],
    title: {
      type: String,
      required: true,
    },
    notifType: {
      type: String,
      required: true,
    },
    refTo: {
      type: Schema.Types.ObjectId,
    },
    image: {
      type: String,
    },
    postId: {
      type: Schema.Types.ObjectId,
    },
    likedBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notif", notifSchema);
