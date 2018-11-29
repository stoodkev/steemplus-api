const spp = require("../../controllers/api/spp.js");
const premium = require("../../controllers/api/premium.js");

const sppRouter = function(app) {
  // Function used to get the details of an account.
  // @parameter username : account name
  // Return the number of points of an account and other information as the detail of every entry of steemplus point
  app.get("/spp/:username", async function(req, res) {
    res.status(200).send(await spp.getSPP(req.params.username));
  });

  app.get("/premium-feature-list", async function(req, res) {
	res.status(200).send(await premium.getFeatureList());
  });
};

module.exports = sppRouter;
