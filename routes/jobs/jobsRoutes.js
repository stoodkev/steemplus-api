const config = require("../../config.js");
const spp = require("../../controllers/jobs/spp.js");
const vote = require("../../controllers/jobs/vote.js");
const steemplusPay = require("../../controllers/jobs/steemplusPay.js");
const utils = require("../../utils.js");
const steem = require("steem");

const VOTING_ACCOUNT = "steem-plus";

const jobRoutes = function(app) {
  // Method used to give user rewards depending on delegations
  app.get("/job/pay-delegations/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    spp.payDelegations();
    res.status(200).send("OK");
  });

  app.get("/job/grow/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    steemplusPay.grow();
    res.status(200).send("OK");
  });

  // This function is used to update steemplus point.
  // Function executed every hour.
  // Only get the results since the last entry.
  app.get("/job/update-steemplus-points/:key", async function(req, res) {
    // If key is not the right key, permission denied and return
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    spp.updateSteemplusPoints();
    res.status(200).send("OK");
  });

  // Bot for Steemplus daily vote
  app.get("/job/bot-vote/:key", function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    // get Steem-plus voting power
    steem.api.getAccounts([VOTING_ACCOUNT], function(err, result) {
      if (err) console.log(err);
      else {
        let spAccount = result[0];
        // Only start voting if the voting power is full
        if (
          (utils.getVotingPowerPerAccount(spAccount) > 99.87 ||
            process.env.FORCE_VOTE === "true") &&
          process.env.CAN_VOTE === "true"
        ) {
          console.log("start voting...");
          vote.startBotVote(spAccount);
          res.status(200).send("OK");
        } else {
          if (process.env.CAN_VOTE === "false") {
            console.log("Voting bot disabled...");
            res.status(200).send("Voting bot disabled...");
          } else {
            let votingPowerSP = utils.getVotingPowerPerAccount(spAccount);
            console.log(
              `Voting power (mana) is only ${votingPowerSP}%... Need to wait more`
            );
            res
              .status(200)
              .send(
                `Voting power (mana) is only ${votingPowerSP}%... Need to wait more`
              );
          }
        }
      }
    });
  });
};

module.exports = jobRoutes;
