/** 动态媒体上传路由（图片 / 视频） */

const express = require('express');
const upload = require('../middleware/mw-upload');

const router = express.Router();

router.post('/', upload.single('file'), function(req, res) {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  var url = '/' + req.file.destination.replace(/\\/g, '/') + '/' + req.file.filename;
  res.json({ url: url });
});

module.exports = router;
