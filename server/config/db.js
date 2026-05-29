/** MySQL 连接池配置 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Lky@307307',
  database: 'lab307',
  charset: 'utf8mb4'
});

module.exports = pool;
