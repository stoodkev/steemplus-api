const steem = require("steem");
const config = require("../../config.js");
const utils = require("../../utils.js");

exports.grow = async function() {
  try {
    let steemPlusPay = await steem.api.getAccountsAsync(["steemplus-pay"]);
    if (
      steemPlusPay[0].reward_steem_balance != "0.000 STEEM" ||
      steemPlusPay[0].reward_sbd_balance != "0.000 SBD" ||
      steemPlusPay[0].reward_vesting_balance != "0.000000 VESTS"
    ) {
      await steem.broadcast.claimRewardBalanceAsync(
        config.payPostKey,
        "steemplus-pay",
        steemPlusPay[0].reward_steem_balance,
        steemPlusPay[0].reward_sbd_balance,
        steemPlusPay[0].reward_vesting_balance
      );
      console.log(
        "Claimed " +
          steemPlusPay[0].reward_steem_balance +
          ", " +
          steemPlusPay[0].reward_sbd_balance +
          ", " +
          steemPlusPay[0].reward_vesting_balance
      );
    } else console.log("Nothing to claim!");
    if (
      (
        parseFloat(steemPlusPay[0].reward_steem_balance.split(" ")[0]) +
        parseFloat(steemPlusPay[0].balance.split(" ")[0])
      ).toFixed(3) +
        " STEEM" !=
      "0.000 STEEM"
    ) {
      await steem.broadcast.transferToVestingAsync(
        config.payActKey,
        "steemplus-pay",
        "steemplus-pay",
        (
          parseFloat(steemPlusPay[0].reward_steem_balance.split(" ")[0]) +
          parseFloat(steemPlusPay[0].balance.split(" ")[0])
        ).toFixed(3) + " STEEM"
      );
      console.log(
        "Powered up " +
          (
            parseFloat(steemPlusPay[0].reward_steem_balance.split(" ")[0]) +
            parseFloat(steemPlusPay[0].balance.split(" ")[0])
          ).toFixed(3) +
          " STEEM"
      );
    } else console.log("Nothing to Power Up!");
    // steemPlusPay = await steem.api.getAccountsAsync(["steemplus-pay"]);
    // let priceSBDUSB = await utils.getSBDPriceUSD();
    // if (
    //   parseFloat(steemPlusPay[0].sbd_balance.split(" ")[0]) >= 10 &&
    //   priceSBDUSB <= 0.99
    // ) {
    //   await steem.broadcast.convertAsync(
    //     config.payActKey,
    //     "steemplus-pay",
    //     parseInt(utils.generateRandomString(7)),
    //     steemPlusPay[0].sbd_balance
    //   );
    //   console.log("Starting conversion of " + steemPlusPay[0].sbd_balance);
    // } else
    //   console.log(
    //     "Not enough SBD to convert! (" + steemPlusPay[0].sbd_balance + ")"
    //   );


    const globalProperties = await steem.api.getDynamicGlobalPropertiesAsync();
    const totalSteem = Number(
      globalProperties.total_vesting_fund_steem.split(" ")[0]
    );
    const totalVests = Number(
      globalProperties.total_vesting_shares.split(" ")[0]
    );
    let delegated_SP = steem.formatter.vestToSteem(
      parseFloat(steemPlusPay[0].vesting_shares.split(" ")[0]),
      totalVests,
      totalSteem
    );
    const delegated_vest =
      ((delegated_SP * totalVests) / totalSteem).toFixed(6) + " VESTS";
    await steem.broadcast.delegateVestingSharesAsync(
      config.payActKey,
      "steemplus-pay",
      "steem-plus",
      delegated_vest
    );
    console.log("Increased delegation to " + delegated_SP + " SP!");
  }
  catch(err){
    console.log(err);
    return;
  }
  
};
