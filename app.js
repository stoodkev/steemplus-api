var express = require("express");
var bodyParser = require("body-parser");
var routes = require("./routes/routes.js");
var app = express();
require('dotenv').config();
var RateLimit = require('express-rate-limit');
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var TypeTransactionCollection = "TypeTransaction";
var UserCollection = "User";
var PointDetailCollection = "PointDetail";


app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

var limiter = new RateLimit({
  windowMs: 60*1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  delayMs: 0 // disable delaying - full speed until the max limit is reached
});


//  apply to all requests
app.use(limiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = client.db();
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT||3000, function () {
    console.log("app running on port ", server.address().port);
  });
});

routes(app);
