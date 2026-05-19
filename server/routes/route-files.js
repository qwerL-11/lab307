/** 文件路由：上传 / 列表 / 下载 / 删除 */

const express = require('express');
const fs = require('fs');
const upload = require('../middleware/mw-upload');
const pool = require('../config/db');
const { ADMIN_PASSWORD } = require('../config/admin');

const router = express.Router();

function checkAdmin(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD;
}

/** 将 DB 行转为前端友好的 camelCase */
function toDoc(row) {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    type: row.type,
    url: row.url,
    createdAt: row.created_at
  };
}

/** 确保 files 表存在 */
pool.query('CREATE TABLE IF NOT EXISTS files (' +
  'id INT AUTO_INCREMENT PRIMARY KEY,' +
  'name VARCHAR(255) NOT NULL,' +
  'size BIGINT NOT NULL,' +
  'type VARCHAR(100),' +
  'url VARCHAR(500) NOT NULL,' +
  'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
')');

/** POST / — 上传文件到 uploads/docs/ */
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  var url = '/' + req.file.destination.replace(/\\/g, '/') + '/' + req.file.filename;
  const [result] = await pool.query(
    'INSERT INTO files (name, size, type, url) VALUES (?, ?, ?, ?)',
    [req.file.originalname, req.file.size, req.file.mimetype, url]
  );
  const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
  res.json(toDoc(rows[0]));
});

/** GET / — 文档列表 */
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM files ORDER BY created_at DESC');
  res.json(rows.map(toDoc));
});

/** DELETE /:id — 删除文档（需要管理员权限） */
router.delete('/:id', async (req, res) => {
  if (!checkAdmin(req)) return res.status(403).json({ error: '需要管理员权限' });
  const [rows] = await pool.query('SELECT * FROM files WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: '文件不存在' });
  var filePath = './' + rows[0].url;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await pool.query('DELETE FROM files WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
