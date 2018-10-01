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
  return `${string.getUTCFullYear()}-${string.getUTCMonth() +
    1}-${string.getUTCDate()} ${string.getUTCHours()}:${string.getUTCMinutes()}:${string.getUTCSeconds()}.${string.getUTCMilliseconds()}`;
};

exports.commentVotingBot = function(post) {
  return (commentBody = `
	<div>
		<p>Hi, ${post.author}!</p>
		<p>You just got a <b>${post.percentage}%</b> upvote from SteemPlus!</p>
		<p>To get higher upvotes, earn more SteemPlus Points (SPP). On your Steemit wallet, check your SPP balance and click on "How to earn SPP?" to find out all the ways to earn.</p>
    <p>If you're not using SteemPlus yet, please check our last posts in <a href="https://steemit.com/@steem-plus">here</a> to see the many ways in which SteemPlus can improve your Steem experience on Steemit and Busy.</p>
	</div>`;
}

exports.commentVotingBotTest=function(post)
{
	return commentBody = 'Test';
}
