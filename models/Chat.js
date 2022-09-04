const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    convos: {
      type: Schema.Types.ObjectId,
      ref: "Convos",
    },
    from: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    to: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    body: {
      type: String,
    },
    img: {
      type: String,
    },
    liked: {
      type: Boolean,
      required: true,
    },
    seen: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
