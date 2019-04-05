// Replay
const config = require("../../config.js");
const ads = require("../../controllers/jobs/ads.js");
const spp = require("../../controllers/jobs/spp.js");
const premium = require("../../controllers/jobs/premium.js");
const User = require("../../models/user.js");
const PointsDetail = require("../../models/pointsDetail.js");
const Ads = require("../../models/ads.js");
const SubscriptionPremium = require("../../models/subscriptionPremium.js");
const PremiumFeature = require("../../models/premiumFeature.js");
const TypeTransaction = require("../../models/typeTransaction.js");

let replayStarted=false;

const replay = function(app) {
  // Method used to give user rewards depending on delegations
  app.get("/replay/:key", async function(req, res) {
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
    console.log("Clearing database ...");

    // Clear database and populate types
    await User.deleteMany({});
    await PointsDetail.deleteMany({});
    await Ads.deleteMany({});
    await TypeTransaction.deleteMany({});
    const types=["MinnowBooster","PostPromoter","Beneficiaries","Donation","Utopian.io","DTube","Purchase","SteemMonsters","Delegation","Reblog","Fundition","Weekly Reward","Premium Feature","Gift","Steemhunt"];
    for(type of types){
      new TypeTransaction({name:type}).save();
    }
    await PremiumFeature.deleteMany({});
    const premiums=[{"name": "Remove Beneficiaries Fee",
    "description": "By subscribing to that feature, you won't have any fee using the beneficiaries feature of SteemPlus",
    "price": 1000}];
    for(prem of premiums){
      new PremiumFeature(prem).save();
    }
    await SubscriptionPremium.deleteMany({});
    // Starting replay to get all the SPP since they were released.
    console.log("Starting Replay...");
    console.log("Updating SteemPlus Points for comments transfers and reblogs");
    await spp.updateSteemplusPoints();
    console.log("Done updating SPP");
    console.log("Starting Delegations");
    await spp.payDelegations();
    console.log("Done rewarding delegations");
    console.log("Debiting premium subscriptions");
    await premium.debitPremium();
    console.log("Done debiting");
    console.log("Start paying weekly rewards");
    await spp.payWeeklyRewards();
    console.log("Done paying daily rewards");
    console.log("Loading ads");
    await ads.add();
    console.log("Done loading ads");
    console.log("Done replaying");
    replayStarted = false;
  });
}

const hasReplayStarted = function(){
    return replayStarted;
}

module.exports.route = replay;
module.exports.hasReplayStarted=hasReplayStarted;
