const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PremiumFeature = mongoose.model(
  "PremiumFeature",
  new Schema(
    {
      name: String,
      price: Number
    },
    { collection: "premiumfeatures" }
  )
);

module.exports = PremiumFeature;
