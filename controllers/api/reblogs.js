const config = require("../../config");
const sql = require("mssql");

exports.getReblogs = (author, permlink) => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("author", author)
        .input("permlink", permlink)
        .query(
          `SELECT account, author, permlink FROM Reblogs WHERE author=@author AND permlink=@permlink`
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
