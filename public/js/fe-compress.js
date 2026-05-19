// ========== 浏览器端图片/视频压缩 ==========

/**
 * 压缩图片文件（canvas 重编码为 JPEG · 最大 2048px · 质量 0.85）
 * @param {File} file 原始图片文件
 * @returns {Promise<File>} 压缩后的文件
 */
function compressImage(file) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var w = img.width, h = img.height;
      var maxSide = 2048;
      if (w > maxSide || h > maxSide) {
        var scale = Math.min(maxSide / w, maxSide / h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片'));
    };
    img.src = url;
  });
}

/**
 * 压缩视频文件（canvas 绘帧 + video 采音频 + MediaRecorder）
 *   保持原始分辨率 · 码率自适应：1080p=15Mbps, 2K=27Mbps, 4K=60Mbps
 * @param {File} file 原始视频文件
 * @param {Function} onProgress 进度回调 (0-100)
 * @returns {Promise<File>} 压缩后的文件
 */
function compressVideo(file, onProgress) {
  return new Promise(function(resolve, reject) {
    var video = document.createElement('video');
    var url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = function() {
      var w = video.videoWidth;
      var h = video.videoHeight;

      /*
        码率自适应：以 1080p=15Mbps 为基准
        ┌──────────────┬───────────────┬─────────────────────────┐
        │ 参数           │ 当前值          │ 改大 → 更清晰 / 文件更大    │
        ├──────────────┼───────────────┼─────────────────────────┤
        │ 基准码率      │ 15000000(15M) │ 1080p 输出码率 = 这个值      │
        │ 最低码率      │ 5000000(5M)   │ 小视频不会过于模糊            │
        │ 最高码率      │ 60000000(60M) │ 4K 不会超过这个值            │
        └──────────────┴───────────────┴─────────────────────────┘
      */
      var basePixels = 1920 * 1080;
      var bitrate = Math.round((w * h / basePixels) * 15000000);
      bitrate = Math.max(5000000, Math.min(60000000, bitrate));

      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      var canvasStream = canvas.captureStream(30);

      try {
        var vidStream = video.captureStream();
        vidStream.getAudioTracks().forEach(function(t) {
          canvasStream.addTrack(t);
        });
      } catch(e) {}

      var mime = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';

      var chunks = [];
      var recorder = new MediaRecorder(canvasStream, {
        mimeType: mime,
        videoBitsPerSecond: bitrate
      });

      recorder.ondataavailable = function(e) {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = function() {
        URL.revokeObjectURL(url);
        var blob = new Blob(chunks, { type: mime });
        var newName = file.name.replace(/\.\w+$/, '.webm');
        resolve(new File([blob], newName, { type: mime }));
      };

      function drawFrame() {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, w, h);
        requestAnimationFrame(drawFrame);
      }

      video.addEventListener('play', drawFrame);

      video.ontimeupdate = function() {
        if (onProgress && video.duration) {
          onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
        }
      };

      video.onended = function() {
        if (onProgress) onProgress(100);
        try { recorder.stop(); } catch(e) {}
      };

      video.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('无法读取视频'));
      };

      recorder.start();
      video.play().catch(function(e) {
        URL.revokeObjectURL(url);
        reject(new Error('无法播放: ' + e.message));
      });
    };

    video.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('无法加载视频'));
    };
  });
}
