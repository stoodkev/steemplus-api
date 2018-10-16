const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./routes/routes.js");
const apiRoutes = require("./routes/api/apiRoutes.js");
const sppRoutes = require("./routes/api/sppRoutes.js");
const jobsRoutes = require("./routes/jobs/jobsRoutes.js");
const statsRoutes = require("./routes/api/statsRoutes.js");
const app = express();
require("dotenv").config();
const RateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

const limiter = new RateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  delayMs: 0 // disable delaying - full speed until the max limit is reached
});

//  apply to all requests
app.use(limiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const uristring =
  process.env.MONGOLAB_PINK_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/heroku_fl6ldd26";
mongoose.connect(
  uristring,
  function(err, res) {
    if (err) {
      console.log("ERROR connecting to: " + uristring + ". " + err);
    } else {
      const server = app.listen(process.env.PORT || 3000, function() {
        console.log("app running on port ", server.address().port);
      });
      console.log("Succeeded connected to: " + uristring);
    }
  }
);

routes(app);
apiRoutes(app);
jobsRoutes(app);
sppRoutes(app);
statsRoutes(app);
