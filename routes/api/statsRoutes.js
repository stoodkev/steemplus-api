const stats = require("../../controllers/api/stats.js");

const statsRouter = function(app) {
  app.get("/spp-stats", async function(req, res) {
    res.status(200).send(await stats.getSppStats());
  });
};

module.exports = statsRouter;
