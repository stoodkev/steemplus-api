const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TypeTransaction = mongoose.model(
  "TypeTransaction",
  new Schema(
    {
      name: String
    },
    { collection: "typetransactions" }
  )
);

module.exports = TypeTransaction;
