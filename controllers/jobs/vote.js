const User = require("../models/user");
const LastVote = require("../models/lastVote");
const votingAccount = "steem-plus";
const MAX_VOTING_PERCENTAGE = 10000;
const MAX_PERCENTAGE = 11000;

// Function used to recalculate the percentages if there is at least one > 100
// @parameter posts : list of the post that will be upvoted
function updatePercentages(posts) {
  // total of excess percentage
  let additionnalPercentage = 0.0;
  // total SPP for the posts that will be given additional percentage
  let totalSPPnew = 0.0;
  for (let post of posts) {
    if (post.percentage >= MAX_VOTING_PERCENTAGE) {
      // If percentage > 100 we put it back to 100.00 and add the difference with 100 to additionnalPercentage
      additionnalPercentage += post.percentage - MAX_VOTING_PERCENTAGE;
      post.percentage = MAX_VOTING_PERCENTAGE;
    } else totalSPPnew += post.nbPoints; // If not, counts the 'new Points'
  }

  let totalNewPercentage = 0.0;
  for (let post of posts) {
    let percentage = MAX_VOTING_PERCENTAGE;
    if (post.percentage !== MAX_VOTING_PERCENTAGE) {
      // For each post that has a percentage different than 100.00, add some more percentage.
      percentage = Math.floor(
        (post.nbPoints / totalSPPnew) * additionnalPercentage
      );
      post.percentage = Math.floor(post.percentage + percentage);
    }
    totalNewPercentage += percentage;
  }
}

// Function used to check if there is still percentage > 100 in the list
// @parameter posts : list of the post that will be upvoted
function hasUncorrectPercent(posts) {
  for (let post of posts) {
    if (post.percentage > MAX_VOTING_PERCENTAGE) return true;
  }
  return false;
}

// Function used to process the voting routine
// @parameter spAccount : SteemPlus account
// @parameter posts : posts that have to be voted for
async function votingRoutine(spAccount, postsBeforeProcess) {
  if (postsBeforeProcess.length === 0) {
    console.log("No new post to vote! End!");
    return;
  }
  var posts = [];
  for (let i = 0; i < postsBeforeProcess.length; i++) {
    let votesList = await steem.api.getActiveVotesAsync(
      postsBeforeProcess[i].author,
      postsBeforeProcess[i].permlink
    );
    var alreadyVoted = false;
    for (let vote of votesList) {
      if (vote.voter === votingAccount && vote.weight !== 0) {
        console.log("Already voted : ", postsBeforeProcess[i]);
        alreadyVoted = true;
        break;
      }
    }
    if (!alreadyVoted) posts.push(postsBeforeProcess[i]);
  }

  let totalSPP = 0;
  for (let post of posts) {
    let user = await User.findOne({ accountName: post.author });
    post.nbPoints = user.nbPoints;
    totalSPP += user.nbPoints;
  }

  let totalPercentage = 0;
  for (let post of posts) {
    let percentage = Math.floor(
      (post.nbPoints / totalSPP) * MAX_PERCENTAGE * 10
    );
    post.percentage = percentage;
    totalPercentage += percentage;
  }
  posts.sort(function(a, b) {
    return b.nbPoints - a.nbPoints;
  });

  // Updated percentages until every post has percentage under 100
  while (hasUncorrectPercent(posts)) {
    updatePercentages(posts);
  }
  // Sort the list to make sure first votes are going to the one with maximum SPP
  posts.sort(function(a, b) {
    return b.nbPoints - a.nbPoints;
  });

  var nbPostsSent = -1;
  // Start voting
  console.log(`Will try to vote for ${posts.length} post(s)`);

  // Delete post with percent equals 0
  let postsToVote = posts.filter(p => p.percentage > 0);

  var vm = 1;
  for (let post of postsToVote) {
    console.log(post);
    vm = vm - (vm * 0.02 * post.percentage) / 10000.0;
  }
  console.log("Theorical mana after vote : " + vm);

  for (let post of postsToVote) {
    nbPostsSent++;
    (function(indexPost) {
      setTimeout(function() {
        console.log(`Post #${indexPost}/${postsToVote.length}`);
        if (post.percentage === 0) {
          console.log(
            `Vote too low : Not voting for ${post.permlink} written by ${
              post.author
            }`
          );
          if (indexPost === postsToVote.length) {
            console.log("Saving last date...");
            posts.sort(function(a, b) {
              return new Date(b.created) - new Date(a.created);
            });
            LastVote.findOne({}, function(err, lastVote) {
              if (lastVote === null)
                var lastVote = new LastVote({
                  date: utils.formatDate(posts[0].created)
                });
              else lastVote.date = utils.formatDate(posts[0].created);
              lastVote.save();
              console.log("Last date saved...");
            });
          }
        } else {
          console.log(
            `Trying to vote for ${post.permlink} written by ${
              post.author
            }, value : ${post.percentage}`
          );
          steem.broadcast.vote(
            config.wif,
            votingAccount,
            post.author,
            post.permlink,
            post.percentage,
            function(err, result) {
              if (err) {
                let errorString = err.toString();
                if (/Voting weight is too small/.test(errorString))
                  console.log(
                    `Vote too low : Not voting for ${
                      post.permlink
                    } written by ${post.author}`
                  );
                else console.log(err);
              } else {
                console.log(
                  `Succeed voting for ${post.permlink} written by ${
                    post.author
                  }, value : ${post.percentage}`
                );
                console.log(
                  `Trying to comment for ${post.permlink} written by ${
                    post.author
                  }`
                );
                steem.broadcast.comment(
                  config.wif,
                  post.author,
                  post.permlink,
                  votingAccount,
                  post.permlink + "---vote-steemplus",
                  "SteemPlus upvote",
                  utils.commentVotingBot(post),
                  {},
                  function(err, result) {
                    if (err) console.log(err);
                    else {
                      console.log(
                        `Succeed commenting for ${post.permlink} written by ${
                          post.author
                        }`
                      );
                      if (indexPost === postsToVote.length) {
                        console.log("Saving last date...");
                        posts.sort(function(a, b) {
                          return new Date(b.created) - new Date(a.created);
                        });
                        LastVote.findOne({}, function(err, lastVote) {
                          if (lastVote === null)
                            var lastVote = new LastVote({
                              date: utils.formatDate(posts[0].created)
                            });
                          else
                            lastVote.date = utils.formatDate(posts[0].created);

                          lastVote.save();
                          console.log("Last date saved...");
                        });
                      }
                    }
                  }
                );
              }
            }
          );
        }
      }, 30 * 1000 * nbPostsSent); // Can't comment more than once every 20 second so we decided to use 30sec in case blockchain is slow
    })(nbPostsSent + 1);
  }
}

exports.startBotVote = function(spAccount) {
  LastVote.findOne({}, function(err, lastVote) {
    let dateVote =
      lastVote === null
        ? "DATEADD(hour,-24, GETUTCDATE())"
        : `'${lastVote.date}'`;
    // Get a list with those names
    let usernameList = [];
    users.map(user => usernameList.push(`'${user.accountName}'`));
    // Execute a SQL query that get the last article from all those users if their last article has been posted
    // less than 24h ago
    new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool.request().query(`
      SELECT permlink, title, Comments.author, url, created
      FROM Comments
      INNER JOIN
      (
        SELECT author, max(created) as maxDate
        FROM Comments
        WHERE depth = 0
        AND author IN (${usernameList.join(",")})
        AND created > ${dateVote}
        GROUP BY author
      ) t
      ON Comments.author = t.author
      AND created = t.maxDate;
      `);
      })
      .then(result => {
        var posts = result.recordsets[0];
        votingRoutine(spAccount, posts);
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });
  });
};
