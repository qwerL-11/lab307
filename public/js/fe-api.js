// ========== API 通信层（服务端） ==========

/** 通用 fetch 封装，自动解析 JSON */
function api(path, options) {
  return fetch(path, options).then(function(res) {
    if (!res.ok) throw new Error('请求失败: ' + res.status);
    return res.json();
  });
}

// ========== 动态 ==========

/** 上传单个图片/视频到服务端，返回 URL */
function uploadMedia(file) {
  var form = new FormData();
  form.append('file', file);
  return api('/api/upload', { method: 'POST', body: form }).then(function(r) { return r.url; });
}

/** 创建一条动态 */
function createPost(text, media) {
  var images = media.map(function(m) { return m.url; });
  return api('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, images: images })
  }).then(function(p) {
    // 转换服务端 images 字符串数组为前端 media 格式
    p.media = (p.images || []).map(function(url) {
      return { url: url, type: /\.(mp4|mov|webm|avi)$/i.test(url) ? 'video' : 'image' };
    });
    return p;
  });
}

/** 获取动态列表，支持分页 */
function listPosts(page, pageSize) {
  page = page || 1;
  pageSize = pageSize || 20;
  return api('/api/posts?page=' + page + '&pageSize=' + pageSize).then(function(r) {
    return {
      list: (r.list || []).map(function(p) {
        p.media = (p.images || []).map(function(url) {
          return { url: url, type: /\.(mp4|mov|webm|avi)$/i.test(url) ? 'video' : 'image' };
        });
        return p;
      }),
      total: r.total || 0,
      page: r.page || page,
      pageSize: r.pageSize || pageSize
    };
  });
}

/** 删除一条动态（携带管理员密码） */
function removePost(id) {
  return api('/api/posts/' + id, {
    method: 'DELETE',
    headers: { 'x-admin-password': sessionStorage.getItem('admin_pw') || '' }
  });
}

// ========== 文件 ==========

/** 上传文档文件到服务端 */
function uploadFile(file) {
  var form = new FormData();
  form.append('file', file);
  return api('/api/files', { method: 'POST', body: form });
}

/** 获取文件列表 */
function listFiles() {
  return api('/api/files');
}

/** 删除一个文件（携带管理员密码） */
function removeFile(id) {
  return api('/api/files/' + id, {
    method: 'DELETE',
    headers: { 'x-admin-password': sessionStorage.getItem('admin_pw') || '' }
  });
}

// ========== 预览专用：File → blob URL（不上传） ==========

function fileToBlobUrl(file) {
  return URL.createObjectURL(file);
}
