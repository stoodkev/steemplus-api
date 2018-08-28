var mongoose = require('mongoose');

var User = mongoose.model("User", new mongoose.Schema({
  accountName : String,
  nbPoints : Number,
  PointDetails : [{type: Schema.Types.ObjectId, ref: 'PointDetail'}]
}));

module.exports = User;