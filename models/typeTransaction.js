var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TypeTransaction = mongoose.model("TypeTransaction", new mongoose.Schema({
  name : String
}, { collection : 'typetransactions' }));

module.exports = TypeTransaction