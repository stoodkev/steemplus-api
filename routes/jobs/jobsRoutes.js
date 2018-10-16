const config = require("../../config.js");
const steem = require("steem");
const spp = require("../../controllers/jobs/spp.js");
const blockchain = require("../../controllers/jobs/blockchain.js");

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

  app.get("/job/power/:key", async function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    blockchain.power();
    res.status(200).send("OK");
  });

  // This function is used to update steemplus point.
  // Function executed every hour.
  // Only get the results since the last entry.
  app.get("/job/update-steemplus-points/:key", function(req, res) {
    // If key is not the right key, permission denied and return
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    res.status(200).send("OK");
  });

  // Bot for Steemplus daily vote
  app.get("/job/bot-vote/:key", function(req, res) {
    if (req.params.key !== config.key) {
      res.status(403).send("Permission denied");
      return;
    }
    // get Steem-plus voting power
    steem.api.getAccounts([votingAccount], function(err, result) {
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
          // Find all the accounts names that has more than 0 points
          User.find({ nbPoints: { $gt: 0 } }, "accountName", function(
            err,
            users
          ) {
            if (err) console.log(`Error while getting users : ${err}`);
            else {
              vote.startBotVote(spAccount);
              res.status(200).send("OK");
            }
          });
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
