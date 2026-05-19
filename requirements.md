# 307实验室生活记录 — 技术文档

## 依赖

| 软件 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥18 | 服务端运行时 |
| MySQL | ≥8.0 | 数据持久化 |

### 安装命令

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# MySQL
sudo apt install mysql-server -y
```

### npm 包

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.7.0",
  "multer": "^1.4.5-lts.1"
}
```

## 项目结构

```
lab307/
├── public/                    ← 前端（浏览器运行）
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── fe-api.js          API 通信
│       ├── fe-app.js          公共工具
│       ├── fe-compress.js     图片视频压缩
│       ├── fe-posts.js        动态模块
│       └── fe-files.js        文件模块
└── server/                    ← 后端（Node.js 运行）
    ├── server.js              入口
    ├── config/
    │   ├── db.js              MySQL 连接
    │   └── admin.js           管理员密码
    ├── middleware/
    │   └── mw-upload.js       Multer 上传
    ├── routes/
    │   ├── route-upload.js    媒体上传
    │   ├── route-posts.js     动态 CRUD
    │   ├── route-files.js     文件 CRUD
    │   └── route-disk.js      磁盘用量
```

## API 接口

### POST /api/upload — 上传图片/视频
```
请求: FormData { file }
响应: { url: "/uploads/videos/xxx.webm" }
说明: 图片视频统一存储，浏览器端压缩为 webm
```

### POST /api/posts — 发布动态
```
请求: { text: "...", images: ["/uploads/xxx.jpg", ...] }
响应: { id, text, images, createdAt }
```

### GET /api/posts — 动态列表
```
参数: ?page=1&pageSize=20
响应: { list: [...], total, page, pageSize }
```

### DELETE /api/posts/:id — 删除动态
```
请求头: x-admin-password
响应: { ok: true }
```

### POST /api/files — 上传文档
```
请求: FormData { file }
响应: { id, name, size, type, url, createdAt }
```

### GET /api/files — 文件列表
```
响应: [{ id, name, size, type, url, createdAt }, ...]
```

### DELETE /api/files/:id — 删除文件
```
请求头: x-admin-password
响应: { ok: true }
```

### GET /api/disk — 磁盘用量
```
响应: { total, free, uploads: { total, images, videos, docs } }
```

## 数据库

### 建库

```sql
CREATE DATABASE IF NOT EXISTS lab307;
```

### posts 表（动态）

```sql
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT,
  images JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### files 表（文档，自动创建）

```sql
CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  type VARCHAR(100),
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 启动

```bash
cd ~/lab307/server
npm install
node server.js
# → http://localhost:3000
```

## 上传文件存储结构

```
uploads/
├── images/    ← .jpg .png .gif .webp .bmp .svg
├── videos/    ← .webm .mp4 .mov
└── docs/      ← .doc .xls .ppt .pdf .zip .txt 等
```

## 管理功能

- 默认密码: `admin307`
- 环境变量 `ADMIN_PASSWORD` 可覆盖
- 页面底部「管理员」入口登录后可删除动态和文件
