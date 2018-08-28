var mongoose = require('mongoose');

var TypeTransaction = mongoose.model("TypeTransaction", new mongoose.Schema({
  name : String
}));

module.exports = TypeTransaction