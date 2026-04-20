class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.offset++] = input[i];
      if (this.offset >= 4096) {
        this.flush();
        this.offset = 0;
      }
    }
    return true;
  }

  flush() {
    const ratio = sampleRate / 16000;
    const newLength = Math.round(4096 / ratio);
    const downsampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.round(i * ratio);
      const nextIndex = Math.round((i + 1) * ratio);
      let sum = 0, count = 0;
      for (let j = srcIndex; j < nextIndex && j < 4096; j++) {
        sum += this.buffer[j];
        count++;
      }
      downsampled[i] = sum / count;
    }

    const int16 = new Int16Array(newLength);
    for (let i = 0; i < newLength; i++) {
      int16[i] = Math.min(1, downsampled[i]) * 0x7FFF;
    }
    this.port.postMessage(int16.buffer, [int16.buffer]);
  }
}

registerProcessor("mic-processor", MicProcessor);
