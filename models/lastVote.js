var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LastVote = mongoose.model("LastVote", new mongoose.Schema({
  date : String
},{ collection : 'lastvote' }));

module.exports = LastVote;