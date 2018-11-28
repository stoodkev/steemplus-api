const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubscriptionPremium = mongoose.model(
  "SubscriptionPremium",
  new Schema(
    {
      premiumFeature: { type: Schema.Types.ObjectId, ref: "PremiumFeature" },
      user: { type: Schema.Types.ObjectId, ref: "User" },
      subscriptionDate: Date,
      lastPayment: Date,
      isCanceled: Boolean
    },
    { collection: "subscriptionspremium" }
  )
);

module.exports = SubscriptionPremium;
