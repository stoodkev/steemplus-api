const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PointsDetail = mongoose.model(
  "PointsDetail",
  new Schema(
    {
      nbPoints: Number,
      amount: Number,
      amountSymbol: String,
      permlink: String,
      url: String,
      title: String,
      typeTransaction: { type: Schema.Types.ObjectId, ref: "TypeTransaction" },
      user: { type: Schema.Types.ObjectId, ref: "User" },
      timestamp: Date,
      timestampString: String,
      requestType: Number
    },
    { collection: "pointsdetails" }
  )
);

module.exports = PointsDetail;
