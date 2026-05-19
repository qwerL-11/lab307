/** 管理员密码（可改为环境变量 ADMIN_PASSWORD） */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin307';
module.exports = { ADMIN_PASSWORD };
