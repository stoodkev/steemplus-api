const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LastVote = mongoose.model(
  "LastVote",
  new Schema(
    {
      date: String
    },
    { collection: "lastvote" }
  )
);

module.exports = LastVote;
