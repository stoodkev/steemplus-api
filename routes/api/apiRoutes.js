const mentions = require("../../controllers/api/mentions.js");
const witnesses = require("../../controllers/api/witnesses.js");
const delegations = require("../../controllers/api/delegations.js");
const wallet = require("../../controllers/api/wallet.js");
const rewards = require("../../controllers/api/rewards.js");
const reblogs = require("../../controllers/api/reblogs.js");
const followers = require("../../controllers/api/followers.js");
const blocks = require("../../controllers/api/blocks.js");

const utils = require("../../utils.js");

const apiRouter = function(app) {
  // Get all the articles and comments where a given user is mentionned
  // @parameter @username : username
  app.get("/mentions/:username", async function(req, res) {
    res.status(200).send(await mentions.getMentions(req.params.username));
  });

  // Get witness information for a given user
  // @parameter @username : username
  app.get("/witness/:username", async function(req, res) {
    res.status(200).send(await witnesses.getWitness(req.params.username));
  });

  // Get witness ranking. This request doesn't include inactive witnesses
  // No parameter!
  app.get("/witnesses-ranks", async function(req, res) {
    res.status(200).send(await witnesses.getWitnessesRank());
  });

  // Get all the received witness votes for a given user. Includes proxified votes
  // @parameter @username : username
  app.get("/received-witness-votes/:username", async function(req, res) {
    res.status(200).send(await witnesses.getReceivedVotes(req.params.username));
  });

  // Get all the incoming delegations for a given user
  // @parameter @username : username
  app.get("/delegators/:username", async function(req, res) {
    res.status(200).send(await delegations.getIncoming(req.params.username));
  });

  // Get all the wallet information for a given user
  // @parameter @username : username
  app.get("/wallet/:username", async function(req, res) {
    res.status(200).send(await wallet.getContent(req.params.username));
  });

  // Get amount of sp for a given user
  // @parameter @username : username
  app.get("/sp/:username", async function(req, res) {
    res.status(200).send(await wallet.getSP(req.params.username));
  });

  // Get all curation rewards, author rewards and benefactor rewards for a given user.
  // @parameter @username : username
  app.get("/rewards/:username", async function(req, res) {
    res.status(200).send(await rewards.getRewards(req.params.username));
  });

  //Get all followers / followee for a given user
  //@parameter @username : username
  app.get("/follow/:username", async function(req, res) {
    res.status(200).send(await followers.getDetail(req.params.username));
  });

  //Get last block id in SteemSQL
  app.get("/last-block", async function(req, res) {
    res.status(200).send(await blocks.getLastBlockId());
  });

  //Get the list of all resteem for a post.
  // @parameter author : author of the post
  // @parameter permlink : permlink of the post
  // The post is select by {permlink, author} because permlink can be the same for different authors.
  app.get("/reblogs/:author/:permlink", async function(req, res) {
    res
      .status(200)
      .send(await reblogs.getReblogs(req.params.author, req.params.permlink));
  });
};

module.exports = apiRouter;
