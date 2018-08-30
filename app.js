var express = require("express");
var bodyParser = require("body-parser");
var routes = require("./routes/routes.js");
var app = express();
require('dotenv').config();
var RateLimit = require('express-rate-limit');
var mongoose = require ("mongoose");

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
var uristring = process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/heroku_fl6ldd26';
mongoose.connect(uristring, function (err, res) {
  if (err) 
  {
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else 
  {
    var server = app.listen(process.env.PORT||3000, function () {
      console.log("app running on port ", server.address().port);
    });
    console.log ('Succeeded connected to: ' + uristring);
  }
});
routes(app);
