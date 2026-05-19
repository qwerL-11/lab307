/** 动态路由：创建 / 列表 / 删除（含磁盘文件清理） */

const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { ADMIN_PASSWORD } = require('../config/admin');

const router = express.Router();

function checkAdmin(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD;
}

function format(row) {
  return {
    id: row.id,
    text: row.text,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
    createdAt: row.created_at
  };
}

/** 删除单个文件（静默失败） */
function unlink(url) {
  if (!url) return;
  var p = path.join('.', url);
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch(e) {}
}

router.post('/', async (req, res) => {
  const { text, images } = req.body;
  const [result] = await pool.query(
    'INSERT INTO posts (text, images) VALUES (?, ?)',
    [text || '', JSON.stringify(images || [])]
  );
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);
  res.json(format(rows[0]));
});

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const [totalRow] = await pool.query('SELECT COUNT(*) AS total FROM posts');
  const [rows] = await pool.query(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset]
  );

  res.json({ list: rows.map(format), total: totalRow[0].total, page, pageSize });
});

/** DELETE /:id — 删除动态 + 清理磁盘上的图片/视频（需要管理员密码） */
router.delete('/:id', async (req, res) => {
  if (!checkAdmin(req)) return res.status(403).json({ error: '需要管理员权限' });

  // 先查出 media URL 列表
  const [rows] = await pool.query('SELECT images FROM posts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: '动态不存在' });

  var images = rows[0].images;
  if (typeof images === 'string') images = JSON.parse(images);
  (images || []).forEach(function(url) {
    unlink(url);
    // 如果是 .mp4（ffmpeg 转码产物），同时删原始 .mov
    if (/\.mp4$/i.test(url)) unlink(url.replace(/\.mp4$/i, '.mov'));
  });

  await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
