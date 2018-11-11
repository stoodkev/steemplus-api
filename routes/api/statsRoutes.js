const stats = require("../../controllers/api/stats.js");

const statsRouter = function(app) {
  app.get("/spp-stats", async function(req, res) {
    res.status(200).send(await stats.getSppStats());
  });

  app.get("/get-spp-stats", function(req, res) {
    res.redirect("/spp-stats");
  });

  app.get("/rankings", async function(req, res) {
	res.status(200).send(await stats.getRankings());
  });
};

module.exports = statsRouter;
