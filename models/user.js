var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = mongoose.model("User", new mongoose.Schema({
  accountName : {type: String, unique: true},
  nbPoints : Number,
  pointsDetails : [{type: Schema.Types.ObjectId, ref: 'PointsDetail'}]
},{ collection : 'users' }));

module.exports = User;