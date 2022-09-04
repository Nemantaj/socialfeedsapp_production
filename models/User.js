const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  friends: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
  ],
  posts: {
    type: Number,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  imgShowcase: {
    type: String,
    required: true,
  },
  newUser: {
    type: Boolean,
    required: true,
  },
  bio: {
    type: String,
    default: "",
  },
  work: {
    type: String,
    default: "",
  },
  requests: [
    {
      from: { type: Schema.Types.ObjectId, ref: "User" },
      time: { type: Date, default: Date.now },
      status: { type: String },
    },
  ],
  requested: [
    {
      to: { type: Schema.Types.ObjectId, ref: "User" },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
