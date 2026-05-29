// ========== 动态模块 ==========

/** 最多上传文件数 */
var MAX_MEDIA = 9;
/** 图片最大 20MB */
var MAX_IMAGE_SIZE = 20 * 1024 * 1024;
/** 视频最大 1GB */
var MAX_VIDEO_SIZE = 1 * 1024 * 1024 * 1024;

/** 待发布的媒体队列 [{ file: File, type: 'image'|'video' }] */
var pendingMedia = [];

var imageInput = document.getElementById('imageInput');
var videoInput = document.getElementById('videoInput');
var postText = document.getElementById('postText');
var submitBtn = document.getElementById('submitBtn');
var previewArea = document.getElementById('previewArea');
var timeline = document.getElementById('timeline');
var uploadProgress = document.getElementById('uploadProgress');
var progressText = document.getElementById('progressText');

function showProgress(msg) {
  progressText.textContent = msg;
  uploadProgress.classList.add('active');
}
function hideProgress() {
  uploadProgress.classList.remove('active');
}

/** 自定义弹窗：询问视频压缩方式，返回 Promise<boolean> */
function askCompress(fileName) {
  return new Promise(function(resolve) {
    document.getElementById('modalFileName').textContent = fileName;
    document.getElementById('compressModal').classList.add('active');
    document.getElementById('modalCompress').onclick = function() {
      document.getElementById('compressModal').classList.remove('active');
      resolve(true);
    };
    document.getElementById('modalOriginal').onclick = function() {
      document.getElementById('compressModal').classList.remove('active');
      resolve(false);
    };
  });
}

/** 将选中的文件加入待发布队列，校验数量和大小 · 视频弹窗选压缩/原画 */
async function addFiles(files, type) {
  for (var i = 0; i < files.length; i++) {
    if (pendingMedia.length >= MAX_MEDIA) {
      alert('最多上传 ' + MAX_MEDIA + ' 个文件'); break;
    }
    var limit = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    var label = type === 'video' ? '视频' : '图片';
    if (files[i].size > limit) {
      alert(label + ' ' + files[i].name + ' 超过大小限制'); continue;
    }
    var compress = true;
    if (type === 'video') {
      compress = await askCompress(files[i].name);
    }
    pendingMedia.push({ file: files[i], type: type, compress: compress });
  }
  renderPreviews();
}

imageInput.addEventListener('change', function(e) {
  addFiles(Array.from(e.target.files || []), 'image');
  imageInput.value = '';
});

videoInput.addEventListener('change', function(e) {
  addFiles(Array.from(e.target.files || []), 'video');
  videoInput.value = '';
});

/** 渲染待发布媒体预览区（图片缩略图 / 视频带播放图标） */
function renderPreviews() {
  previewArea.innerHTML = '';
  pendingMedia.forEach(function(item, i) {
    var url = URL.createObjectURL(item.file);
    var div = document.createElement('div');
    div.className = 'preview-item';
    if (item.type === 'video') {
      div.innerHTML =
        '<video src="' + url + '" muted></video>' +
        '<div class="video-badge">&#9654;</div>' +
        '<button class="remove-preview" data-i="' + i + '">&times;</button>';
    } else {
      div.innerHTML =
        '<img src="' + url + '" alt="预览">' +
        '<button class="remove-preview" data-i="' + i + '">&times;</button>';
    }
    div.querySelector('.remove-preview').onclick = function() {
      pendingMedia.splice(i, 1);
      renderPreviews();
    };
    previewArea.appendChild(div);
  });
}

submitBtn.addEventListener('click', async function() {
  var text = postText.value.trim();
  if (!text && pendingMedia.length === 0) return;

  submitBtn.disabled = true;
  showProgress('准备中...');

  try {
    var media = [];
    for (var i = 0; i < pendingMedia.length; i++) {
      var item = pendingMedia[i];
      var file = item.file;

      if (item.type === 'image') {
        showProgress('压缩图片中...');
        try {
          var imgFile = await compressImage(item.file);
          // 只有压缩后比原图小才采用，防止 PNG 转 JPEG 反而变大
          if (imgFile.size > 1024 && imgFile.size < item.file.size) file = imgFile;
        } catch(e) {
          console.warn('图片压缩失败，使用原文件:', e.message);
        }
      }

      if (item.type === 'video') {
        if (item.compress) {
          showProgress('压缩视频中...');
          try {
            var vidFile = await compressVideo(item.file, function(pct) {
              showProgress('压缩视频 ' + pct + '%');
            });
            if (vidFile.size > 10240) {
              file = vidFile;
            } else {
              showProgress('压缩异常，转原画...');
            }
          } catch(e) {
            console.warn('视频压缩失败，上传原画:', e.message);
            showProgress('原画上传中...');
          }
        } else {
          showProgress('原画上传中...');
        }
      }

      showProgress('上传 ' + (i + 1) + '/' + pendingMedia.length + '...');
      var url = await uploadMedia(file);
      media.push({ url: url, type: item.type });
    }

    showProgress('发布中...');
    await createPost(text, media);

    postText.value = '';
    pendingMedia = [];
    renderPreviews();
    loadPosts();
  } catch (err) {
    alert('发布失败: ' + err.message);
  }

  hideProgress();
  submitBtn.disabled = false;
});

/** 删除一条动态（带确认弹窗） */
async function handleDelete(id) {
  if (!confirm('确定删除这条记录吗？')) return;
  await removePost(id);
  loadPosts();
}

/** 加载并渲染所有动态到时间线 */
async function loadPosts() {
  var posts;
  try {
    posts = await listPosts();
  } catch (err) {
    timeline.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    return;
  }

  if (posts.length === 0) {
    timeline.innerHTML =
      '<div class="empty-state">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' +
      '</svg><p>还没有记录，写下第一条吧</p></div>';
    return;
  }

  timeline.innerHTML = posts.map(function(p) {
    var mediaHtml = '';
    if (p.media && p.media.length) {
      mediaHtml += '<div class="post-gallery">';
      p.media.forEach(function(m) {
        if (m.type === 'video') {
          mediaHtml += '<div class="media-item">' +
            '<video src="' + m.url + '" controls preload="metadata" class="post-video"></video>' +
            '</div>';
        } else {
          var src = m.url || m;
          mediaHtml +=
            '<div class="media-item">' +
            '<img src="' + src + '" alt="图片" onclick="openLightbox(\'' + src + '\')">' +
            '</div>';
        }
      });
      mediaHtml += '</div>';
    }
    var deleteBtn = isAdmin()
      ? '<button class="post-delete" onclick="handleDelete(' + p.id + ')">&times;</button>'
      : '';
    return '<div class="post">' +
      '<div class="post-header">' +
      '<span class="post-date">' + formatDate(p.createdAt) + '</span>' +
      deleteBtn +
      '</div>' +
      (p.text ? '<div class="post-text">' + escapeHtml(p.text) + '</div>' : '') +
      mediaHtml +
      '</div>';
  }).join('');
}

loadPosts();
