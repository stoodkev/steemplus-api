var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PointsDetail = mongoose.model("PointsDetail", new mongoose.Schema({
  nbPoints : Number,
  amount: Number,
  amountSymbol: String,
  permlink : String,
  url : String,
  title : String,
  typeTransaction : {type: Schema.Types.ObjectId, ref: 'TypeTransaction'},
  user : {type: Schema.Types.ObjectId, ref: 'User'},
  timestamp: Date,
  timestampString: String,
  requestType : Number
}, { collection : 'pointsdetails' }));

module.exports = PointsDetail;