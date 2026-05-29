// ========== 文件管理模块 ==========

/** 最大文件 1GB */
var MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
/** 本地文件缓存 */
var _fileCache = [];

var fileDropArea = document.getElementById('fileDropArea');
var docFileInput = document.getElementById('docFileInput');
var fileList = document.getElementById('fileList');

/** 根据扩展名返回图标和颜色 */
function fileIcon(name) {
  var ext = name.split('.').pop().toLowerCase();
  var map = {
    doc:  { icon: '&#x1F4C4;', color: '#2b579a', label: 'Word' },
    docx: { icon: '&#x1F4C4;', color: '#2b579a', label: 'Word' },
    xls:  { icon: '&#x1F4C8;', color: '#217346', label: 'Excel' },
    xlsx: { icon: '&#x1F4C8;', color: '#217346', label: 'Excel' },
    ppt:  { icon: '&#x1F4CA;', color: '#d24726', label: 'PPT' },
    pptx: { icon: '&#x1F4CA;', color: '#d24726', label: 'PPT' },
    pdf:  { icon: '&#x1F4D5;', color: '#e74c3c', label: 'PDF' },
    txt:  { icon: '&#x1F4C4;', color: '#666',    label: 'TXT' },
    zip:  { icon: '&#x1F4E6;', color: '#8e7c4b', label: 'ZIP' },
    rar:  { icon: '&#x1F4E6;', color: '#8e7c4b', label: 'RAR' },
    csv:  { icon: '&#x1F4C8;', color: '#217346', label: 'CSV' }
  };
  return map[ext] || { icon: '&#x1F4CE;', color: '#999', label: ext.toUpperCase() || 'FILE' };
}

/** 格式化文件大小 */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** 渲染单个文件行 HTML */
function renderFileRow(f) {
  var info = fileIcon(f.name);
  var name = escapeHtml(f.name);
  var url = f.url || '';
  return '<div class="file-item" id="filerow-' + f.id + '">' +
    '<span class="file-icon" style="background:' + info.color + '">' + info.icon + '</span>' +
    '<div class="file-info">' +
      '<span class="file-name">' + name + '</span>' +
      '<span class="file-meta">' + formatSize(f.size) + ' · ' + info.label + ' · ' + formatDate(f.createdAt) + '</span>' +
    '</div>' +
    '<div class="file-actions">' +
      '<button class="file-dl-btn" data-url="' + url + '" data-name="' + name + '" title="下载">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
          '<polyline points="7 10 12 15 17 10"/>' +
          '<line x1="12" y1="15" x2="12" y2="3"/>' +
        '</svg>' +
      '</button>' +
      (isAdmin() ? '<button class="file-del-btn" data-id="' + f.id + '" title="删除">&times;</button>' : '') +
    '</div>' +
  '</div>';
}

/** 渲染全部文件 */
function renderFileList() {
  if (_fileCache.length === 0) {
    fileList.innerHTML = '<div class="empty-state"><p>还没有上传文件</p></div>';
    return;
  }
  fileList.innerHTML = _fileCache.map(renderFileRow).join('');
  bindFileActions();
}

/** 绑定下载和删除事件（避免 onclick 中引号问题） */
function bindFileActions() {
  fileList.querySelectorAll('.file-dl-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var a = document.createElement('a');
      a.href = btn.dataset.url;
      a.download = btn.dataset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  });
  fileList.querySelectorAll('.file-del-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('确定删除这个文件吗？')) return;
      var id = parseInt(btn.dataset.id);
      removeFile(id).then(function() {
        _fileCache = _fileCache.filter(function(f) { return f.id !== id; });
        renderFileList();
      });
    });
  });
}

/** 从服务端拉取文件列表，写入缓存并渲染 */
function loadFileList() {
  listFiles().then(function(files) {
    _fileCache = files || [];
    renderFileList();
  }).catch(function(err) {
    fileList.innerHTML = '<div class="empty-state"><p>加载失败: ' + err.message + '</p></div>';
  });
}

/** 上传文件：成功后直接插入缓存，不重新拉取 */
function handleFileUpload(files) {
  for (var i = 0; i < files.length; i++) {
    if (files[i].size > MAX_FILE_SIZE) {
      alert('文件 ' + files[i].name + ' 超过大小限制'); continue;
    }
    fileList.innerHTML = '<div class="empty-state"><p>上传中...</p></div>';
    uploadFile(files[i]).then(function(doc) {
      // 收到的 doc 已经是 camelCase（id, name, size, type, url, createdAt）
      _fileCache.unshift(doc);
      renderFileList();
    }).catch(function(err) {
      fileList.innerHTML = '<div class="empty-state"><p>上传失败: ' + err.message + '</p></div>';
    });
  }
}

fileDropArea.addEventListener('click', function() { docFileInput.click(); });

docFileInput.addEventListener('change', function(e) {
  handleFileUpload(Array.from(e.target.files || []));
  docFileInput.value = '';
});

fileDropArea.addEventListener('dragover', function(e) {
  e.preventDefault();
  fileDropArea.classList.add('dragover');
});
fileDropArea.addEventListener('dragleave', function() {
  fileDropArea.classList.remove('dragover');
});
fileDropArea.addEventListener('drop', function(e) {
  e.preventDefault();
  fileDropArea.classList.remove('dragover');
  handleFileUpload(Array.from(e.dataTransfer.files || []));
});
