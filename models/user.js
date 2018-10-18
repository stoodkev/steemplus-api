const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = mongoose.model(
  "User",
  new Schema(
    {
      accountName: { type: String, unique: true },
      nbPoints: Number,
      pointsDetails: [{ type: Schema.Types.ObjectId, ref: "PointsDetail" }]
    },
    { collection: "users" }
  )
);

module.exports = User;
