const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = mongoose.model(
  "User",
  new Schema(
    {
      accountName: { type: String, unique: true },
      nbPoints: Number,
      pointsDetails: [{ type: Schema.Types.ObjectId, ref: "PointsDetail" }],
      activeSubscriptions: [{ type: Schema.Types.ObjectId, ref: "SubscriptionPremium" }]
    },
    { collection: "users" }
  )
);

module.exports = User;
