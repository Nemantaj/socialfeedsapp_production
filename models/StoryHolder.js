const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const storyHolderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    seenBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

storyHolderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model("StoryHolder", storyHolderSchema);
