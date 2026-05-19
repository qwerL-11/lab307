/** 磁盘用量查询 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const router = express.Router();
const uploadsDir = path.resolve('./uploads');

/** 根据扩展名分类 */
function classify(ext) {
  var img = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  var vid = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  if (img.indexOf(ext) !== -1) return '图片';
  if (vid.indexOf(ext) !== -1) return '视频';
  return '文档';
}

/** 递归计算目录大小 + 分类 */
function scanDir(dir) {
  var result = { total: 0, '图片': 0, '视频': 0, '文档': 0 };
  if (!fs.existsSync(dir)) return result;
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.isDirectory()) {
      var sub = scanDir(path.join(dir, entry.name));
      result.total += sub.total;
      result['图片'] += sub['图片'];
      result['视频'] += sub['视频'];
      result['文档'] += sub['文档'];
    } else {
      var ext = path.extname(entry.name).toLowerCase();
      var cat = classify(ext);
      var size = fs.statSync(path.join(dir, entry.name)).size;
      result.total += size;
      result[cat] += size;
    }
  }
  return result;
}

router.get('/', function(req, res) {
  try {
    // 磁盘总量和可用
    var stdout = execSync('df -B1 / | tail -1', { encoding: 'utf8' });
    var parts = stdout.trim().split(/\s+/);
    var total = parseInt(parts[1], 10);
    var free = parseInt(parts[3], 10); // available

    // 上传文件占用
    var uploads = scanDir(uploadsDir);

    res.json({
      total: total || 0,
      free: free || 0,
      uploads: {
        total: uploads.total,
        images: uploads['图片'],
        videos: uploads['视频'],
        docs: uploads['文档']
      }
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

module.exports = router;
