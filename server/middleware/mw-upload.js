/** Multer 上传中间件：按扩展名分 images / videos / docs 子目录 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const IMG_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg'];
const VID_EXT = ['.mp4','.mov','.webm','.avi','.mkv'];

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var ext = path.extname(file.originalname).toLowerCase();
    var sub;
    if (IMG_EXT.includes(ext)) sub = 'images';
    else if (VID_EXT.includes(ext)) sub = 'videos';
    else sub = 'docs';
    var dir = path.join('uploads', sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext);
  }
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

module.exports = upload;
