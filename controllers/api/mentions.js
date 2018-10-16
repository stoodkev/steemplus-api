const config = require("../../config");
const sql = require("mssql");

exports.getMentions = function(username) {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", "@" + username)
        .input("username2", "%@" + username + " %")
        .input("username3", "%@" + username + "<%")
        .input("username4", "%@" + username + "[%")
        .input("username5", "%@" + username + "]%")
        .input("username6", "%@" + username + ".%")
        .input("username7", "%@" + username + "!%")
        .input("username8", "%@" + username + "?%")
        .input("username9", "%@" + username + ",%")
        .input("username10", "%@" + username + ";%")
        .query(
          "SELECT TOP 100 url,created, permlink, root_title, title, author, REPLACE(LEFT(body,250),'\"','''') AS body,category, parent_author, total_payout_value, pending_payout_value, net_votes, json_metadata\
			FROM (SELECT  TOP 500 url,created, permlink, root_title, title, author,body,category, parent_author, total_payout_value, pending_payout_value, net_votes, json_metadata\
			FROM Comments\
			WHERE CONTAINS(body, @username) ORDER BY created DESC ) AS subtable  \
			WHERE body LIKE @username2 OR body LIKE @username3 OR body LIKE @username4 OR body LIKE @username5 OR body LIKE @username6 OR body LIKE @username7 OR body LIKE @username8 OR body LIKE @username9 OR body LIKE @username10 ORDER BY created DESC \
			"
        );
    })
    .then(result => {
      sql.close();
      console.log(result.recordsets[0]);
      return result.recordsets[0];
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};
