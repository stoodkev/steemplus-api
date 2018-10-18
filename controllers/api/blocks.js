const config = require("../../config");
const sql = require("mssql");

exports.getLastBlockId = () => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .query("select top 1 block_num from Blocks ORDER BY timestamp DESC");
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
