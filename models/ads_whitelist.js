const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AdsWhitelist = mongoose.model(
  "AdsWhitelist",
  new Schema(
    {
      username:String
    },
    { collection: "ads_whitelist" }
  )
);

module.exports = AdsWhitelist;
