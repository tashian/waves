// waveform-processor.worklet.js
class WaveformProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
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
    
    // Initialize waveform storage
    this.bank1wave1 = new Float32Array(256).fill(0);
    this.bank1wave2 = new Float32Array(256).fill(0);
    this.bank2wave1 = new Float32Array(256).fill(0);
    this.bank2wave2 = new Float32Array(256).fill(0);
    
    // Morphing settings
    this.bankMorphEnabled = true;
    this.waveMorphEnabled = true;
    this.bankMorphAmount = 0;
    this.waveMorphAmount = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'loadWaveforms') {
        // Update waveforms
        this.bank1wave1 = new Float32Array(event.data.waveforms.bank1wave1);
        this.bank1wave2 = new Float32Array(event.data.waveforms.bank1wave2);
        this.bank2wave1 = new Float32Array(event.data.waveforms.bank2wave1);
        this.bank2wave2 = new Float32Array(event.data.waveforms.bank2wave2);
        
        // Update morphing settings
        this.bankMorphEnabled = event.data.bankMorphEnabled;
        this.waveMorphEnabled = event.data.waveMorphEnabled;
        this.bankMorphAmount = event.data.bankMorphAmount;
        this.waveMorphAmount = event.data.waveMorphAmount;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const frequency = parameters.frequency[0];
    
    // Calculate phase increment based on frequency
    const phaseIncrement = (frequency * 256) / sampleRate;

    // Process each channel
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        // Get the current position in the waveform with interpolation
        const phaseFloat = this.phase % 256;
        const index1 = Math.floor(phaseFloat);
        const index2 = (index1 + 1) % 256;
        const fracPhase = phaseFloat - index1;
        
        // Get interpolated samples from each waveform
        const getSample = (waveform) => {
          return waveform[index1] * (1 - fracPhase) + 
                 waveform[index2] * fracPhase;
        };
        
        let finalSample;
        
        if (this.bankMorphEnabled && this.waveMorphEnabled) {
          // Bilinear interpolation between all four waveforms
          const bank1 = getSample(this.bank1wave1) * (1 - this.waveMorphAmount) + 
                       getSample(this.bank1wave2) * this.waveMorphAmount;
          const bank2 = getSample(this.bank2wave1) * (1 - this.waveMorphAmount) + 
                       getSample(this.bank2wave2) * this.waveMorphAmount;
          finalSample = bank1 * (1 - this.bankMorphAmount) + bank2 * this.bankMorphAmount;
        } else if (this.bankMorphEnabled) {
          // Linear interpolation between banks only
          const bank1 = getSample(this.bank1wave1);
          const bank2 = getSample(this.bank2wave1);
          finalSample = bank1 * (1 - this.bankMorphAmount) + bank2 * this.bankMorphAmount;
        } else if (this.waveMorphEnabled) {
          // Linear interpolation between waves only
          const wave1 = getSample(this.bank1wave1);
          const wave2 = getSample(this.bank1wave2);
          finalSample = wave1 * (1 - this.waveMorphAmount) + wave2 * this.waveMorphAmount;
        } else {
          // No morphing - just use the primary waveform
          finalSample = getSample(this.bank1wave1);
        }
        
        outputChannel[i] = finalSample;
        
        // Advance the phase
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
