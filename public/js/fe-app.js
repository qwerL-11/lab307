// ========== 公共工具函数 ==========

var lightbox = document.getElementById('lightbox');
var lightboxImg = document.getElementById('lightboxImg');

/** 将 ISO 日期字符串格式化为 YYYY/MM/DD HH:mm */
function formatDate(iso) {
  var d = new Date(iso);
  return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/** 数字补零到 2 位 */
function pad(n) { return String(n).padStart(2, '0'); }

/** HTML 特殊字符转义，防止 XSS */
function escapeHtml(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/** 打开图片灯箱预览 */
function openLightbox(src) {
  lightbox.classList.add('active');
  lightboxImg.src = src;
}

/** 关闭灯箱 */
function closeLightbox() {
  lightbox.classList.remove('active');
}

/** 切换侧边栏页面（动态 / 文件） */
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page-section').forEach(function(el) {
    el.classList.toggle('active', el.id === page + '-section');
  });
  if (page === 'files') loadFileList();
}

/** 是否处于管理员模式 */
function isAdmin() {
  return !!sessionStorage.getItem('admin_pw');
}

/** 管理员登录 */
function adminLogin() {
  var pw = prompt('请输入管理员密码：');
  if (!pw) return;
  sessionStorage.setItem('admin_pw', pw);
  location.reload();
}

/** 退出管理员 */
function adminLogout() {
  sessionStorage.removeItem('admin_pw');
  location.reload();
}

/** 刷新管理状态 UI */
function updateAdminUI() {
  var bar = document.getElementById('adminBar');
  if (!bar) return;
  if (isAdmin()) {
    bar.innerHTML = '<span class="admin-dot"></span> 管理员模式 · <a href="javascript:adminLogout()">退出</a>';
    bar.className = 'admin-bar active';
  } else {
    bar.innerHTML = '<a href="javascript:adminLogin()">管理员</a>';
    bar.className = 'admin-bar';
  }
}

updateAdminUI();

/** 格式化字节为可读大小 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

/** 加载磁盘使用信息 */
function loadDiskInfo() {
  fetch('/api/disk').then(function(r) { return r.json(); }).then(function(d) {
    if (d.error) {
      document.getElementById('diskDetail').textContent = d.error;
      return;
    }
    var used = d.total - d.free;
    var pct = d.total > 0 ? Math.round((used / d.total) * 100) : 0;
    document.getElementById('diskFill').style.width = pct + '%';
    document.getElementById('diskDetail').innerHTML =
      '剩余 ' + formatBytes(d.free) + ' / ' + formatBytes(d.total) +
      '<br>图片 ' + formatBytes(d.uploads.images) +
      ' · 视频 ' + formatBytes(d.uploads.videos) +
      ' · 文档 ' + formatBytes(d.uploads.docs);
  }).catch(function() {
    document.getElementById('diskDetail').textContent = '无法获取';
  });
}

loadDiskInfo();

// 快捷键：Esc 关闭灯箱，Ctrl+Enter 发布动态（仅在动态页面生效）
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    var postsSection = document.getElementById('posts-section');
    if (postsSection && postsSection.classList.contains('active')) {
      var sb = document.getElementById('submitBtn');
      if (sb) sb.click();
    }
  }
});
