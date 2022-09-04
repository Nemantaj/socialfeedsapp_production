const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const convosSchema = new Schema(
  {
    users: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    type: {
      type: String,
    },
    title: {
      type: String,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Convos", convosSchema);
