// waveform-processor.worklet.js
class WaveformProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'morphAmount',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      },
      {
        name: 'frequency',
        defaultValue: 440,
        minValue: 20,
        maxValue: 20000,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.waveform1 = new Float32Array(256).fill(0);
    this.waveform2 = new Float32Array(256).fill(0);

    this.port.onmessage = (event) => {
      if (event.data.type === 'loadWaveforms') {
        this.waveform1 = new Float32Array(event.data.waveform1);
        this.waveform2 = new Float32Array(event.data.waveform2);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const morphAmount = parameters.morphAmount[0];
    const frequency = parameters.frequency[0];
    
    const phaseIncrement = (frequency * 256) / sampleRate;

    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        const phaseFloat = this.phase % 256;
        const index1 = Math.floor(phaseFloat);
        const index2 = (index1 + 1) % 256;
        const frac = phaseFloat - index1;
        
        const sample1 = this.waveform1[index1] * (1 - frac) + this.waveform1[index2] * frac;
        const sample2 = this.waveform2[index1] * (1 - frac) + this.waveform2[index2] * frac;
        
        outputChannel[i] = sample1 * (1 - morphAmount) + sample2 * morphAmount;
        
        this.phase += phaseIncrement;
        if (this.phase >= 256) {
          this.phase -= 256;
        }
      }
    }

    return true;
  }
}

registerProcessor('waveform-processor', WaveformProcessor);
