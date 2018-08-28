var mongoose = require('mongoose');

var PointDetail = mongoose.model("PointDetail", new mongoose.Schema({
  idAccount : Number,
  nbPoints : Number,
  permlink : Number,
  typeTransaction : {type: Schema.Types.ObjectId, ref: 'TypeTransaction'},
  user : {type: Schema.Types.ObjectId, ref: 'User'}
}));

module.exports = PointDetail;