const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const storySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  stories: {
    img: {
      type: String,
    },
    caption: {
      type: String,
    },
  },
  storyHolder: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  expire_at: {
    type: Date,
    default: Date.now,
  },
});

storySchema.index({ expire_at: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Story", storySchema);
