const ads = require("../../controllers/api/ads.js");

const apiRouter = function(app) {
  // Get all the ads that have been paid for and did not reach payout yet.
  // @parameters: none
  app.get("/ads", async function(req, res) {
    res.status(200).send(await ads.getAds());
  });

  app.get("/ads-whitelist", async function(req, res) {
    res.status(200).send(await ads.getAdsWhitelist());
  });

  // Creating an ad campaign via a POST method
  app.post("/ads", async function(req, res) {
    if (req.body.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    else if(req.body.url)
      res.status(200).send(await ads.createAd(req.body.url));
  });
};

module.exports = apiRouter;
