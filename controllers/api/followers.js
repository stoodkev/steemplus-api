const config = require("../../config");
const sql = require("mssql");

exports.getDetail = username => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          "select * from Followers where follower = @username or following = @username"
        );
    })
    .then(result => {
      sql.close();
      return result.recordsets[0];
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};
