/** 307实验室 API 服务入口 */

const express = require('express');
const fs = require('fs');
const uploadRoutes = require('./routes/route-upload');
const postRoutes = require('./routes/route-posts');
const fileRoutes = require('./routes/route-files');
const diskRoutes = require('./routes/route-disk');
const adminRoutes = require('./routes/route-admin');

const app = express();

// 解析 JSON 请求体
app.use(express.json());
// 静态文件：上传的图片/视频
app.use('/uploads', express.static('uploads'));
// 静态文件：前端页面
app.use(express.static('../public'));

// 确保上传目录存在
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// 路由注册
app.use('/api/upload', uploadRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/disk', diskRoutes);
app.use('/api/admin', adminRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log('307实验室 API 已启动: http://localhost:' + PORT));
