// 獨立於語音辨識之外，用 Web Audio API 直接量測麥克風收到的音量，
// 讓使用者能實際看到「多遠/多大聲」手機才有反應，用來診斷收音靈敏度問題。
export function createMicMeter({ onLevel, onError }) {
  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let rafId = null;

  function loop() {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (const v of data) {
      const centered = (v - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    onLevel(Math.min(1, rms * 4)); // 放大倍數純粹方便肉眼判讀，非精確音量單位
    rafId = requestAnimationFrame(loop);
  }

  return {
    async start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        onError?.(err);
        return false;
      }
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      loop();
      return true;
    },
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
      stream = null;
      audioCtx = null;
      analyser = null;
    },
  };
}
