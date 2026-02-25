// Audio processing utilities

export function createAudioBuffer(audioContext, data, sampleRate = 24000) {
  const audioDataView = new Int16Array(data);
  if (audioDataView.length === 0) {
    console.error("Received audio data is empty.");
    return;
  }

  const buffer = audioContext.createBuffer(1, audioDataView.length, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Convert linear16 PCM to float [-1, 1]
  for (let i = 0; i < audioDataView.length; i++) {
    channelData[i] = audioDataView[i] / 32768;
  }

  return buffer;
}

export function playAudioBuffer(audioContext, buffer, startTimeRef, analyzer) {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyzer); // Connect to the analyzer
  analyzer.connect(audioContext.destination); // Connect the analyzer to the destination

  const currentTime = audioContext.currentTime;
  if (startTimeRef.current < currentTime) {
    startTimeRef.current = currentTime + 0.02;
  }

  source.start(startTimeRef.current);
  startTimeRef.current += buffer.duration;

  return source; // Return the source if you need to further manipulate it (stop, pause, etc.)
}

export function downsample(buffer, fromSampleRate, toSampleRate) {
  if (fromSampleRate === toSampleRate) {
    return buffer;
  }
  const sampleRateRatio = fromSampleRate / toSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0,
      count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff;
  }
  return buf.buffer;
}

export const normalizeVolume = (analyzer, dataArray, normalizationFactor) => {
  analyzer.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((acc, val) => acc + val, 0);
  const average = sum / dataArray.length;
  return Math.min(average / normalizationFactor, 1);
};

export class AudioStreamPlayer {
  constructor(audioContext, analyser, sampleRate = 24000) {
    this.audioContext = audioContext;
    this.analyser = analyser;
    this.sampleRate = sampleRate;
    this.pendingChunks = [];
    this.pendingSamples = 0;
    this.scheduledSources = [];
    this.nextStartTime = 0;
    this.isFirstFlush = true;
    this.flushTimer = null;
    this.minBufferSamples = Math.floor(sampleRate * 0.2);
    this.analyser.connect(this.audioContext.destination);
  }

  addChunk(arrayBuffer) {
    const int16 = new Int16Array(arrayBuffer);
    if (int16.length === 0) return;
    this.pendingChunks.push(int16);
    this.pendingSamples += int16.length;
    if (this.pendingSamples >= this.minBufferSamples) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 100);
    }
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingChunks.length === 0) return;

    const merged = new Int16Array(this.pendingSamples);
    let offset = 0;
    for (const chunk of this.pendingChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.pendingChunks = [];
    this.pendingSamples = 0;

    const buffer = this.audioContext.createBuffer(1, merged.length, this.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < merged.length; i++) {
      channelData[i] = merged[i] / 32768;
    }

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + (this.isFirstFlush ? 0.2 : 0.1);
    }
    this.isFirstFlush = false;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.scheduledSources.push(source);

    if (this.scheduledSources.length > 20) {
      this.scheduledSources = this.scheduledSources.slice(-10);
    }
  }

  clear() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingChunks = [];
    this.pendingSamples = 0;
    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.scheduledSources = [];
    this.isFirstFlush = true;
    this.nextStartTime = 0;
  }
}
