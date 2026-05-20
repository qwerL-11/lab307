/** 管理员认证路由 */

const express = require('express');
const { ADMIN_PASSWORD } = require('../config/admin');

const router = express.Router();

router.post('/verify', function(req, res) {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(403).json({ error: '密码错误' });
  }
});

module.exports = router;
