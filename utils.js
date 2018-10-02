let utils=require("./utils");

exports.commentNewUser = function(post, lastUpdate, numUsers) {
  let commentBody = `#### Welcome to Steem, @${post.author}!\n\n`;
  commentBody += `I am a bot coded by the SteemPlus team to help you make the best of your experience on the Steem Blockchain!\n`;
  commentBody += `SteemPlus is a Chrome, Opera and Firefox extension that adds tons of features on Steemit.\n`;
  commentBody += `It helps you see the real value of your account, who mentionned you, the value of the votes received, a filtered and sorted feed and much more! All of this in a fast and secure way.\n`;
  commentBody += `To see why **${numUsers} Steemians** use SteemPlus, [install our extension](https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en), read the [documentation](https://github.com/stoodkev/SteemPlus/blob/master/README.md) or the latest release : [${
    lastUpdate.title
  }](${lastUpdate.url}).\n`;
  return commentBody;
};

exports.formatDate = function(string) {
  return `${string.getUTCFullYear()}-${string.getUTCMonth() + 1}-${string.getUTCDate()} ${string.getUTCHours()}:${string.getUTCMinutes()}:${string.getUTCSeconds()}.${string.getUTCMilliseconds()}`;
};

exports.commentVotingBot = function(post) {
  return (commentBody = `
	  Hi, ${post.author}!\n\n
    You just got a **${post.percentage}%** upvote from SteemPlus!\n
    To get higher upvotes, earn more SteemPlus Points (SPP). On your Steemit wallet, check your SPP balance and click on "How to earn SPP?" to find out all the ways to earn.\n
    If you're not using SteemPlus yet, please check our last posts in [here](https://steemit.com/@steem-plus) to see the many ways in which SteemPlus can improve your Steem experience on Steemit and Busy.\n`);
}

exports.commentVotingBotTest=function(post)
{
	return commentBody = 'Test';
}

exports.getVotingPowerPerAccount = function(account) {
  const mana = utils.getMana(account);
  return mana.estimated_pct.toFixed(2);
};

exports.getMana = function(account) {
  const STEEM_VOTING_MANA_REGENERATION_SECONDS = 432000;
  const estimated_max = utils.getEffectiveVestingSharesPerAccount(account) * 1000000;
  const current_mana = parseFloat(account.voting_manabar.current_mana);
  const last_update_time = account.voting_manabar.last_update_time;
  const diff_in_seconds = Math.round(Date.now() / 1000 - last_update_time);
  let estimated_mana =
    current_mana +
    (diff_in_seconds * estimated_max) / STEEM_VOTING_MANA_REGENERATION_SECONDS;
  if (estimated_mana > estimated_max) estimated_mana = estimated_max;
  const estimated_pct = (estimated_mana / estimated_max) * 100;
  return {
    current_mana: current_mana,
    last_update_time: last_update_time,
    estimated_mana: estimated_mana,
    estimated_max: estimated_max,
    estimated_pct: estimated_pct
  };
};

exports.getEffectiveVestingSharesPerAccount = function(account) {
  var effective_vesting_shares =
    parseFloat(account.vesting_shares.replace(" VESTS", "")) +
    parseFloat(account.received_vesting_shares.replace(" VESTS", "")) -
    parseFloat(account.delegated_vesting_shares.replace(" VESTS", ""));
  return effective_vesting_shares;
};
