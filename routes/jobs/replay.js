// Replay
const config = require("../../config.js");
const ads = require("../../controllers/jobs/ads.js");
const spp = require("../../controllers/jobs/spp.js");
let replayStarted=false;

const replay = function(app) {
  // Method used to give user rewards depending on delegations
  app.get("/job/replay/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(replayStarted) {
      res.status(403).send("Replay already started");
      return;
    }
    replayStarted = true;
    res.status(200).send("OK");
    await Promise.all([spp.payDelegations(),
    spp.updateSteemplusPoints(),
    spp.debitPremium(),
    spp.payWeeklyRewards(),
    ads.add()]);
    replayStarted = false;
  });
}

module.exports = replay;
