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
 * 压缩视频文件（video.captureStream + MediaRecorder · 2x 加速 · 24fps）
 *   保持原始分辨率 · 码率自适应：1080p=15Mbps, 2K=27Mbps, 4K=60Mbps
 *
 *   调优参考（在浏览器控制台可动态调整）：
 *   - rate = 2    压缩倍速（1-4，越大越快但越容易掉帧）
 *   - fps  = 24   采集帧率（15-30，越低越快文件越小）
 *
 * @param {File} file 原始视频文件
 * @param {Function} onProgress 进度回调 (0-100)
 * @returns {Promise<File>} 压缩后的文件
 */
function compressVideo(file, onProgress) {
  return new Promise(function(resolve, reject) {
    var video = document.createElement('video');
    var url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = function() {
      var w = video.videoWidth;
      var h = video.videoHeight;
      var duration = video.duration;

      // 码率自适应：1080p=15Mbps 基准
      var basePixels = 1920 * 1080;
      var bitrate = Math.round((w * h / basePixels) * 15000000);
      bitrate = Math.max(5000000, Math.min(60000000, bitrate));

      // 采集帧率：长视频用 24fps 加速，短视频用 30fps 保画质
      var fps = duration > 30 ? 24 : 30;
      var stream = video.captureStream(fps);

      var mime = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';

      var chunks = [];
      var recorder = new MediaRecorder(stream, {
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

      // 2x 加速编码：视频播多快 MediaRecorder 就收多快
      video.playbackRate = 2.0;

      video.ontimeupdate = function() {
        if (onProgress && duration) {
          onProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
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
