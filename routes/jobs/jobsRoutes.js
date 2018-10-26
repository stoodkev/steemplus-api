const config = require("../../config.js");
const spp = require("../../controllers/jobs/spp.js");
const vote = require("../../controllers/jobs/vote.js");
const steemplusPay = require("../../controllers/jobs/steemplusPay.js");
const utils = require("../../utils.js");
const steem = require("steem");

const VOTING_ACCOUNT = "steem-plus";

let payDelegationsStarted = false;
let growStarted = false;
let updateSteemplusPointsStarted = false;
let botVoteStarted = false;

const jobRoutes = function(app) {
  // Method used to give user rewards depending on delegations
  app.get("/job/pay-delegations/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(payDelegationsStarted) {
      res.status(403).send("Pay delegation already started");
      return;
    }
    payDelegationsStarted = true;
    res.status(200).send("OK");
    await spp.payDelegations();
    payDelegationsStarted = false;
  });

  app.get("/job/grow/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(growStarted) {
      res.status(403).send("Grow already started");
      return;
    }
    growStarted = true;
    res.status(200).send("OK");
    await steemplusPay.grow();
    growStarted = false;
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
    if(updateSteemplusPointsStarted) {
      res.status(403).send("Update Steemplus Points already started");
      return;
    }
    console.log(updateSteemplusPointsStarted);
    updateSteemplusPointsStarted = true;
    console.log(updateSteemplusPointsStarted);
    res.status(200).send("OK");
    await spp.updateSteemplusPoints();
    console.log("Finished")
    updateSteemplusPointsStarted = false;
    console.log(updateSteemplusPointsStarted);
  });

  // Bot for Steemplus daily vote
  app.get("/job/bot-vote/:key", function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    if(botVoteStarted) {
      res.status(403).send("Bot vote already started");
      return;
    }
    botVoteStarted = true;
    // get Steem-plus voting power
    steem.api.getAccounts([VOTING_ACCOUNT], async function(err, result) {
      if (err) {
        console.log(err);
        botVoteStarted = false;
      } 
      else {
        let spAccount = result[0];
        // Only start voting if the voting power is full
        if (
          (utils.getVotingPowerPerAccount(spAccount) > 99.87 ||
            process.env.FORCE_VOTE === "true") &&
          process.env.CAN_VOTE === "true"
        ) {
          console.log("start voting...");
          res.status(200).send("OK");
          await vote.startBotVote(spAccount);
          botVoteStarted = false;
        } else {
          if (process.env.CAN_VOTE === "false") {
            console.log("Voting bot disabled...");
            botVoteStarted = false;
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
            botVoteStarted = false;
          }
        }
      }
    });
  });
};

module.exports = jobRoutes;
