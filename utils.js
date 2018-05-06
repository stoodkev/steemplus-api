exports.commentNewUser=function(post,lastUpdate,numUsers) {
  let commentBody = `#### Welcome to Steem, @${post.author}!\n`;
  commentBody += `I am a bot coded by the SteemPlus team to help you make the best of your experience on Steem!\n`;
  commentBody += `SteemPlus is a Chrome, Opera and Firefox extension that adds tons of features on Steemit.\n`;
  commentBody += `To see why **${numUsers} Steemians** use SteemPlus, [install our extension](https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en), read the [documentation](https://github.com/stoodkev/SteemPlus/blob/master/README.md) or the latest release : [${lastUpdate.title}](${lastUpdate.url})\n`;
  return commentBody;
}
