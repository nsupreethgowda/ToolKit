class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage({ type: 'data', buffer: input[0].slice(0) });
    }
    return true;
  }
}
registerProcessor('recorder', RecorderProcessor);
