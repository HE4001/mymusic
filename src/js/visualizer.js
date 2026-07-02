// ═══════════════════════════════════════════════════════
// Visualizer — Audio frequency visualization (Web Audio API)
// ═══════════════════════════════════════════════════════

export class Visualizer {
  #audioContext = null;
  #analyser = null;
  #source = null;
  #canvas = null;
  #ctx = null;
  #animationId = null;
  #bars = [];
  #barCount = 64;

  init(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    if (!this.#ctx) return;

    this.#bars = new Array(this.#barCount).fill(0);
    this.resize();
  }

  connect(audio) {
    try {
      if (!this.#audioContext) {
        this.#audioContext = new AudioContext();
        this.#analyser = this.#audioContext.createAnalyser();
        this.#analyser.fftSize = 256;
        this.#analyser.smoothingTimeConstant = 0.8;

        this.#source = this.#audioContext.createMediaElementSource(audio);
        this.#source.connect(this.#analyser);
        this.#analyser.connect(this.#audioContext.destination);
      }
    } catch (e) {
      console.warn('Visualizer init failed:', e);
    }
  }

  start() {
    if (this.#animationId) return;
    this.animate();
  }

  stop() {
    if (this.#animationId) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
  }

  resize() {
    if (!this.#canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.#canvas.getBoundingClientRect();
    this.#canvas.width = rect.width * dpr;
    this.#canvas.height = rect.height * dpr;
    if (this.#ctx) {
      this.#ctx.scale(dpr, dpr);
    }
  }

  animate() {
    if (!this.#analyser || !this.#ctx || !this.#canvas) return;

    const dataArray = new Uint8Array(this.#analyser.frequencyBinCount);
    this.#analyser.getByteFrequencyData(dataArray);

    const rect = this.#canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const barWidth = width / this.#barCount;
    const gap = 2;

    this.#ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.#barCount; i++) {
      const dataIndex = Math.floor(i * dataArray.length / this.#barCount);
      const value = dataArray[dataIndex] / 255;

      // Smooth interpolation
      this.#bars[i] += (value - this.#bars[i]) * 0.3;

      const barHeight = this.#bars[i] * height * 0.9;
      const x = i * barWidth;
      const y = height - barHeight;

      // Gradient color from accent to lighter
      const alpha = 0.3 + this.#bars[i] * 0.5;
      this.#ctx.fillStyle = `rgba(29, 185, 84, ${alpha})`;

      this.#ctx.beginPath();
      this.#ctx.roundRect(x + gap / 2, y, barWidth - gap, barHeight, 2);
      this.#ctx.fill();
    }

    this.#animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    this.stop();
    this.#source?.disconnect();
    this.#analyser?.disconnect();
    this.#audioContext?.close();
  }
}
