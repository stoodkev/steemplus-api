const utils = require("../utils");
const steem = require("steem");

let lastPermlink = null;
const appRouter = function(app) {
  app.get("/", function(req, res) {
    res.status(200).send("Welcome to our restful API!");
  });

  app.get("/job/welcome-users/:key", function(req, res) {
    if (req.params.key == config.key) {
      const query = {
        tag: "introduceyourself",
        limit: 28
      };
      const chromeExtensionWebstoreURL =
        "https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en";
      getJSON(
        "http://www.whateverorigin.org/get?url=" +
          encodeURIComponent(chromeExtensionWebstoreURL),
        function(e, response) {
          //console.log(response);
          const numUsers = (
            "" +
            response.contents.match(
              /<Attribute name=\"user_count\">([\d]*?)<\/Attribute>/
            )
          ).split(",")[1];
          console.log(numUsers);

          steem.api
            .getDiscussionsByAuthorBeforeDateAsync(
              "steem-plus",
              null,
              new Date().toISOString().split(".")[0],
              1
            )
            .then(function(r, e) {
              //console.log(e,r);
              steem.api.getDiscussionsByCreated(query, function(err, results) {
                console.log(results);
                let break_point = -1;
                if (err == null && results.length != 0) {
                  results.forEach((result, i) => {
                    if (result.permlink == lastPermlink) {
                      break_point = i;
                      return;
                    } else if (break_point != -1) return;
                    console.log(i);
                    setTimeout(function() {
                      //console.log(result.author, result.permlink);
                      if (
                        !JSON.parse(result.json_metadata).tags.includes(
                          "polish"
                        )
                      )
                        steem.broadcast.comment(
                          config.wif,
                          result.author,
                          result.permlink,
                          config.bot,
                          result.permlink + "-re-welcome-to-steemplus",
                          "Welcome to SteemPlus",
                          utils.commentNewUser(result, r[0], numUsers),
                          {},
                          function(err, result) {
                            console.log(err, result);
                          }
                        );
                    }, i * 21 * 1000);
                  });
                } else if (err !== null) console.log(err);

                console.log("------------");
                console.log("---DONE-----");
                console.log("------------");
                res
                  .status(200)
                  .send(
                    (break_point == -1 ? results.length : break_point) +
                      " results treated!"
                  );
                lastPermlink = results[0].permlink;
              });
            });
        }
      );
    } else {
      res.status(403).send("Permission denied");
    }
  });
};

module.exports = appRouter;
