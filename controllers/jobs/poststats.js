
const statsController = require("../api/stats.js");
const utils = require("../../utils.js");

var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;
var jsdom = new JSDOM('<body><div id="container" style="width: 100%;height: 100%;margin: 50px;padding: 50px;"></div></body>', {runScripts: 'dangerously'});
require('dotenv').config();
var window = jsdom.window;

var anychart = require('anychart')(window);
var anychartExport = require('anychart-nodejs')(anychart);

exports.getPostStats = async function () {
  const stats=await statsController.getSppStats();
  const title="Daily SteemPlus Stats - "+(new Date(Date.now()).toLocaleString().split(" ")[0]).replace("-","/").replace("-","/");
  let body = "<div>https://cdn.steemitimages.com/DQmdUeahavHxrpFve3xXjTLNxkTuNeNiHxKwhBjciANZwNk/image.png <br><br>\
  <p>Welcome to this daily edition of the SteemPlus Stats. This post aims to give you all the information you need about the current distribution of the SteemPlus Points.<br>\
  You will find the Top 20 users and their SPPs, the distribution per category and total SPPs distributed. If you'd like to see more information, please let us know on <a href='https://discord.gg/96JkJSy'>Discord</a>.</p> \
  <p>The integrality of the payout of this post will be powered up to give you bigger upvotes.</p>\
  <h3>Total</h3><br>\
  <p>A total of <strong>"+utils.numberWithCommas(stats.total_points)+"</strong> SPP has been distributed to <strong>"+utils.numberWithCommas(stats.points_per_user.length)+"</strong> users.</p>\
  <h3>Top 20 users</h3><br><table>\
  <tr><th>#</th><th>Name</th><th>SPP</th><th>#</th><th>Name</th><th>SPP</th></tr>";
  for(let i=0;i<10;i++){
    body+="<tr><th>"+(i+1)+"</th><th>"+stats.points_per_user[i].name+"</th><th>"+utils.numberWithCommas(stats.points_per_user[i].points)+"</th><th>"+(i+11)+"</th><th>"+stats.points_per_user[10+i].name+"</th><th>"+utils.numberWithCommas(stats.points_per_user[10+i].points)+"</th></tr>";
  }
  body+="</table>\
  <br>\
  <h3>Distribution per type</h3>";
  // create a chart and set the data
  let data=stats.points_per_transaction.map(function(a){return {x:a.type,value:a.points};});
  let chart = anychart.pie(data);
  chart.title("Distribution of SPP per type");
  console.log("test1");
  chart.bounds(0, 0, 800, 600);
  console.log("test2");
  // set the container id
  chart.container("container");
  console.log("test3");
  chart.labels().position("outside");
  console.log("test4");
  chart.legend().paginator(false);
  console.log("test5");
  chart.legend().itemsLayout('horizontal-expandable');
  console.log("test6");
  chart.legend().maxWidth("600");
  console.log("test7");
  // initiate drawing the chart
  chart.draw();
  console.log("test8");
  // generate JPG image and save it to a file
  const image= await anychartExport.exportTo(chart, 'jpg');
  console.log("test9");
  const fs_error=await fs.writeFile('public/distribution_per_type.jpg',image);
  console.log("test10");
  body+="<br><img src='"+config.serverURL+"/distribution_per_type.jpg'/>";
  body+="<br><h3>How to earn SPP?</h3><br>\
  <p>If you are already using SteemPlus, youcan find detailed explanations about how to earn SPP from your wallet, by clicking on the arrow near your\
  SteemPlus Points balance and clicking on \'How to earn SPP?\'</p>\
  https://steemitimages.com/0x0/https://cdn.steemitimages.com/DQmVFgYEKvhEwqZ4TRvARA7bCTxia2U3ALciPzDENMT5yJV/image.png\
  <h3>Not on SteemPlus yet?</h3><br>\
  <p>SteemPlus is a Chrome, Opera and Firefox extension used by "+await getDailyUsers().chrome+" users daily.<br>It brings over 30 novel features to your Steem experience on Steemit and Busy.\
  As you can see above, you can also earn SPP by performing certain actions. This will allow you to redeem your SPP for premium features or hold them against @steem-plus upvotes.</p>\
  <p>You can download and install SteemPlus directly from the Chrome Store if you are using Chrome or Firefox(follow <a href='https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en'>this link</a> for Chrome, <a href='https://addons.mozilla.org/en-US/firefox/addon/steem-plus/'>this one</a> for Firefox ).<br>\
  For installation procedures on Opera, please check our <a href='https://github.com/stoodkev/SteemPlus/blob/master/README.md'>documentation</a>.</p>";
/*  steem.broadcast.comment(KEY, "", "steemplus", "lecaillon", "spp-stats-"+Date.now(), title, body, {}, function(err, result) {
    console.log(err, result);
  });*/
  return(title+body);
};
