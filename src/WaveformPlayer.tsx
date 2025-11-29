import { useState, useEffect, useRef, useMemo } from 'react';
import WaveformDisplay from './components/WaveformDisplay';
import { useWaveformLoader, BankData } from './hooks/useWaveformLoader';
import { Switch } from './components/Switch';
import { Select } from './components/Select';
import { RotaryKnob, ModKnob, SynthSlider, ParameterGroup } from './synth-controls';
import { formatFrequency, formatTime, formatPercent } from './synth-controls/utils/formatting';

// Utility functions for exponential scaling
const expScale = (value: number, min: number, max: number): number => {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return Math.exp(minLog + (value * (maxLog - minLog)));
};

const invExpScale = (value: number, min: number, max: number): number => {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return (Math.log(value) - minLog) / (maxLog - minLog);
};

const WAVES_PER_BANK = 10;

const WaveformPlayer = () => {
  // Lazy-load waveforms
  const { banks, currentBank, currentBankName, isLoading, error, loadBank } = useWaveformLoader();

  // State for bank and wave selection
  const [bankIndex, setBankIndex] = useState(0);
  const [waveIndex, setWaveIndex] = useState(0);

  // Calculate dynamic bank limits based on current super bank
  const { numBanks, maxBankIndex } = useMemo(() => {
    if (!currentBank) {
      return { numBanks: 1, maxBankIndex: 0 };
    }
    const waveCount = Object.keys(currentBank).length;
    const banks = Math.ceil(waveCount / WAVES_PER_BANK);
    return {
      numBanks: banks,
      maxBankIndex: Math.max(0, banks - 1),
    };
  }, [currentBank]);

  // Clamp bank index when super bank changes and has fewer banks
  useEffect(() => {
    if (bankIndex > maxBankIndex) {
      setBankIndex(maxBankIndex);
    }
  }, [maxBankIndex]);

  // Morphing toggles
  const [bankMorphEnabled, setBankMorphEnabled] = useState(true);
  const [waveMorphEnabled, setWaveMorphEnabled] = useState(true);

  // Audio parameters
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequencyNorm, setFrequencyNorm] = useState(invExpScale(440, 20, 2000));
  const [filterFreqNorm, setFilterFreqNorm] = useState(invExpScale(22050, 20, 22050));

  // Drone mode and envelope
  const [droneMode, setDroneMode] = useState(false);
  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.1);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.3);
  const [noteActive, setNoteActive] = useState(false);

  // Envelope modulation amounts (bipolar: -1 to 1)
  const [envToBankMod, setEnvToBankMod] = useState(0);
  const [envToWaveMod, setEnvToWaveMod] = useState(0);
  const [envToFreqMod, setEnvToFreqMod] = useState(0);
  const [envToFilterMod, setEnvToFilterMod] = useState(0);

  // Current envelope value for visual feedback (0-1)
  const [currentEnvValue, setCurrentEnvValue] = useState(0);

  // Reverb parameters
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.05);

  // Actual frequency values
  const frequency = expScale(frequencyNorm, 20, 2000);
  const filterFrequency = expScale(filterFreqNorm, 20, 22050);

  // Compute modulation offsets for visual feedback (in normalized space)
  const freqModOffset = envToFreqMod !== 0
    ? invExpScale(
        Math.max(20, Math.min(2000, frequency * Math.pow(2, currentEnvValue * envToFreqMod * 2))),
        20, 2000
      ) - frequencyNorm
    : undefined;

  const filterModOffset = envToFilterMod !== 0
    ? invExpScale(
        Math.max(20, Math.min(22050, filterFrequency * Math.pow(2, currentEnvValue * envToFilterMod * 4))),
        20, 22050
      ) - filterFreqNorm
    : undefined;

  // Bank/wave modulation offsets (these wrap around Pac-Man style in the slider)
  const bankModOffset = envToBankMod !== 0
    ? currentEnvValue * envToBankMod * (maxBankIndex / 2)
    : undefined;

  const waveModOffset = envToWaveMod !== 0
    ? currentEnvValue * envToWaveMod * ((WAVES_PER_BANK - 1) / 2)
    : undefined;

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const envelopeGainRef = useRef<GainNode | null>(null);
  const noteTimeoutRef = useRef<number | null>(null);
  const modAnimationRef = useRef<number | null>(null);
  const baseValuesRef = useRef({ bank: 0, wave: 0, freq: 440, filter: 22050 });
  const envelopeTimingRef = useRef<{ startTime: number; releaseStartTime: number | null; startValue: number }>({
    startTime: 0,
    releaseStartTime: null,
    startValue: 0
  });

  // Get waveform names for current position
  const getWaveformNames = (bankData: BankData | null, bankPos: number, wavePos: number) => {
    if (!bankData) {
      return { wave11: '', wave12: '', wave21: '', wave22: '' };
    }
    const waveformsInBank = Object.keys(bankData);
    const waveCount = waveformsInBank.length;

    const bankStart1 = Math.floor(bankPos) * WAVES_PER_BANK;
    const bankStart2 = Math.min((Math.floor(bankPos) + 1) * WAVES_PER_BANK, Math.max(0, waveCount - WAVES_PER_BANK));

    const wave1Index = Math.min(bankStart1 + Math.floor(wavePos), waveCount - 1);
    const wave2Index = Math.min(bankStart1 + Math.min(Math.floor(wavePos) + 1, WAVES_PER_BANK - 1), waveCount - 1);
    const wave3Index = Math.min(bankStart2 + Math.floor(wavePos), waveCount - 1);
    const wave4Index = Math.min(bankStart2 + Math.min(Math.floor(wavePos) + 1, WAVES_PER_BANK - 1), waveCount - 1);

    return {
      wave11: waveformsInBank[wave1Index],
      wave12: waveformsInBank[wave2Index],
      wave21: waveformsInBank[wave3Index],
      wave22: waveformsInBank[wave4Index]
    };
  };

  // Get morph label showing blend percentages
  const getMorphLabel = () => {
    if (!currentBank) return '';
    const waveformNames = getWaveformNames(currentBank, bankIndex, waveIndex);

    const bankMorphAmount = bankMorphEnabled ? bankIndex % 1 : 0;
    const waveMorphAmount = waveMorphEnabled ? waveIndex % 1 : 0;

    // Calculate contribution percentages for each waveform
    const w11 = (1 - waveMorphAmount) * (1 - bankMorphAmount);
    const w12 = waveMorphAmount * (1 - bankMorphAmount);
    const w21 = (1 - waveMorphAmount) * bankMorphAmount;
    const w22 = waveMorphAmount * bankMorphAmount;

    // If single waveform at 100%, just show the name
    if (w11 > 0.999) return waveformNames.wave11;

    // Build label showing only waveforms with > 0% contribution
    const parts: string[] = [];
    if (w11 > 0.001) parts.push(`${waveformNames.wave11} ${Math.round(w11 * 100)}%`);
    if (w12 > 0.001) parts.push(`${waveformNames.wave12} ${Math.round(w12 * 100)}%`);
    if (w21 > 0.001) parts.push(`${waveformNames.wave21} ${Math.round(w21 * 100)}%`);
    if (w22 > 0.001) parts.push(`${waveformNames.wave22} ${Math.round(w22 * 100)}%`);

    return parts.join(' + ');
  };

  // Helper to wrap a value within a range (Pac-Man style) - used for display
  const wrapValueForDisplay = (val: number, minVal: number, maxVal: number): number => {
    const range = maxVal - minVal;
    if (range <= 0) return minVal;
    let wrapped = ((val - minVal) % range);
    if (wrapped < 0) wrapped += range;
    return minVal + wrapped;
  };

  // Get morphed waveform data for display (includes modulation when active)
  const getMorphedWaveform = () => {
    if (!currentBank) return [];

    // Calculate display positions including modulation
    const displayBankPos = bankModOffset !== undefined
      ? wrapValueForDisplay(bankIndex + bankModOffset, 0, maxBankIndex + 1)
      : bankIndex;
    const displayWavePos = waveModOffset !== undefined
      ? wrapValueForDisplay(waveIndex + waveModOffset, 0, WAVES_PER_BANK)
      : waveIndex;

    const waveformNames = getWaveformNames(currentBank, displayBankPos, displayWavePos);

    if (bankMorphEnabled || waveMorphEnabled) {
      const wave11 = currentBank[waveformNames.wave11];
      const wave12 = currentBank[waveformNames.wave12];
      const wave21 = currentBank[waveformNames.wave21];
      const wave22 = currentBank[waveformNames.wave22];

      if (!wave11 || !wave12 || !wave21 || !wave22) return [];

      const bankMorphAmount = bankMorphEnabled ? displayBankPos % 1 : 0;
      const waveMorphAmount = waveMorphEnabled ? displayWavePos % 1 : 0;

      return wave11.map((sample: number, i: number) => {
        const morphed1 = sample * (1 - waveMorphAmount) + wave12[i] * waveMorphAmount;
        const morphed2 = wave21[i] * (1 - waveMorphAmount) + wave22[i] * waveMorphAmount;
        return morphed1 * (1 - bankMorphAmount) + morphed2 * bankMorphAmount;
      });
    } else {
      return currentBank[waveformNames.wave11] || [];
    }
  };

  // Generate WAV file from waveform data
  const generateWavFile = (samples: number[]): Blob => {
    const sampleRate = 44100;
    const numSamples = samples.length;
    const bytesPerSample = 2; // 16-bit
    const dataSize = numSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
    view.setUint16(32, bytesPerSample, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples (convert float -1 to 1 to 16-bit int)
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Get base waveform (without modulation) for download
  const getBaseWaveform = () => {
    if (!currentBank) return [];
    const waveformNames = getWaveformNames(currentBank, bankIndex, waveIndex);

    if (bankMorphEnabled || waveMorphEnabled) {
      const wave11 = currentBank[waveformNames.wave11];
      const wave12 = currentBank[waveformNames.wave12];
      const wave21 = currentBank[waveformNames.wave21];
      const wave22 = currentBank[waveformNames.wave22];

      if (!wave11 || !wave12 || !wave21 || !wave22) return [];

      const bankMorphAmount = bankMorphEnabled ? bankIndex % 1 : 0;
      const waveMorphAmount = waveMorphEnabled ? waveIndex % 1 : 0;

      return wave11.map((sample: number, i: number) => {
        const morphed1 = sample * (1 - waveMorphAmount) + wave12[i] * waveMorphAmount;
        const morphed2 = wave21[i] * (1 - waveMorphAmount) + wave22[i] * waveMorphAmount;
        return morphed1 * (1 - bankMorphAmount) + morphed2 * bankMorphAmount;
      });
    } else {
      return currentBank[waveformNames.wave11] || [];
    }
  };

  // Download current waveform as WAV (uses base position, not modulated)
  const downloadWaveform = () => {
    const waveform = getBaseWaveform();
    if (waveform.length === 0) return;

    const blob = generateWavFile(waveform);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveform-${currentBankName}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Audio cleanup
  const cleanup = () => {
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    if (modAnimationRef.current) cancelAnimationFrame(modAnimationRef.current);

    [workletNodeRef, filterRef, envelopeGainRef, convolverRef, dryGainRef, wetGainRef].forEach(ref => {
      if (ref.current) {
        ref.current.disconnect();
        ref.current = null;
      }
    });

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  useEffect(() => cleanup, []);

  const loadImpulseResponse = async () => {
    if (!audioContextRef.current || !convolverRef.current) return;
    try {
      const response = await fetch('/impulse-responses/york-minster.wav');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      convolverRef.current.buffer = audioBuffer;
    } catch (error) {
      console.error('Error loading impulse response:', error);
    }
  };

  const updateReverbMix = () => {
    if (!dryGainRef.current || !wetGainRef.current) return;
    if (reverbEnabled) {
      dryGainRef.current.gain.value = Math.sqrt(1 - reverbMix);
      wetGainRef.current.gain.value = Math.sqrt(reverbMix);
    } else {
      dryGainRef.current.gain.value = 1;
      wetGainRef.current.gain.value = 0;
    }
  };

  // Track which waveforms are currently loaded to avoid redundant transfers
  const loadedWaveformsRef = useRef<string | null>(null);

  // Determine if we need to load new waveforms or just update morph amounts
  useEffect(() => {
    if (!workletNodeRef.current || !currentBank) return;

    const waveformNames = getWaveformNames(currentBank, bankIndex, waveIndex);
    const waveformKey = `${currentBankName}-${waveformNames.wave11}-${waveformNames.wave12}-${waveformNames.wave21}-${waveformNames.wave22}`;

    if (waveformKey !== loadedWaveformsRef.current) {
      // Waveform selection changed - need to load new waveform data
      loadedWaveformsRef.current = waveformKey;
      updateWorkletWaveforms();
    } else {
      // Same waveforms, just update morph amounts (lightweight)
      updateWorkletMorph();
    }
  }, [currentBank, currentBankName, bankIndex, waveIndex, bankMorphEnabled, waveMorphEnabled]);
  useEffect(() => { updateReverbMix(); }, [reverbEnabled, reverbMix]);


  const initAudio = async () => {
    cleanup();
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      await audioContextRef.current.audioWorklet.addModule('/waveform-processor.worklet.js');

      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'waveform-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });

      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = filterFrequency;
      filterRef.current.Q.value = 0.707; // Butterworth (flat response)

      envelopeGainRef.current = audioContextRef.current.createGain();
      envelopeGainRef.current.gain.value = 0; // Start muted, will unmute in playWaveform

      convolverRef.current = audioContextRef.current.createConvolver();
      dryGainRef.current = audioContextRef.current.createGain();
      wetGainRef.current = audioContextRef.current.createGain();

      await loadImpulseResponse();
      updateReverbMix();

      if (workletNodeRef.current.parameters) {
        const freqParam = workletNodeRef.current.parameters.get('frequency');
        if (freqParam) freqParam.setValueAtTime(frequency, audioContextRef.current.currentTime);
      }

      // Connect audio graph: Worklet → Filter → Envelope → Dry/Wet Reverb → Output
      workletNodeRef.current.connect(filterRef.current);
      filterRef.current.connect(envelopeGainRef.current);
      envelopeGainRef.current.connect(dryGainRef.current);
      envelopeGainRef.current.connect(convolverRef.current);
      convolverRef.current.connect(wetGainRef.current);
      dryGainRef.current.connect(audioContextRef.current.destination);
      wetGainRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error('Error initializing audio worklet:', error);
      throw error;
    }
  };

  // Lightweight morph update - only sends morph parameters, not waveform data
  const updateWorkletMorph = () => {
    if (!workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({
      type: 'updateMorph',
      bankMorphEnabled,
      waveMorphEnabled,
      bankMorphAmount: bankMorphEnabled ? bankIndex % 1 : 0,
      waveMorphAmount: waveMorphEnabled ? waveIndex % 1 : 0
    });
  };

  // Full waveform update - sends waveform data and morph parameters
  const updateWorkletWaveforms = () => {
    if (!workletNodeRef.current || !currentBank) return;
    const waveformNames = getWaveformNames(currentBank, bankIndex, waveIndex);

    const wave11 = currentBank[waveformNames.wave11];
    const wave12 = currentBank[waveformNames.wave12];
    const wave21 = currentBank[waveformNames.wave21];
    const wave22 = currentBank[waveformNames.wave22];

    if (!wave11 || !wave12 || !wave21 || !wave22) return;

    workletNodeRef.current.port.postMessage({
      type: 'loadWaveforms',
      waveforms: {
        bank1wave1: wave11,
        bank1wave2: wave12,
        bank2wave1: wave21,
        bank2wave2: wave22
      },
      bankMorphEnabled,
      waveMorphEnabled,
      bankMorphAmount: bankMorphEnabled ? bankIndex % 1 : 0,
      waveMorphAmount: waveMorphEnabled ? waveIndex % 1 : 0
    });
  };

  // Reset worklet to silence (clears old waveform data)
  const resetWorklet = () => {
    if (!workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({ type: 'reset' });
  };

  const playWaveform = async () => {
    try {
      if (!audioContextRef.current) await initAudio();
      // Reset worklet to silence, then load current waveforms
      resetWorklet();
      loadedWaveformsRef.current = null; // Force waveform reload
      updateWorkletWaveforms();
      if (audioContextRef.current!.state === 'suspended') await audioContextRef.current!.resume();
      if (envelopeGainRef.current && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        // Small fade-in to avoid clicks
        envelopeGainRef.current.gain.setValueAtTime(0, now);
        envelopeGainRef.current.gain.linearRampToValueAtTime(droneMode ? 1 : 0, now + 0.02);
      }
      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  };

  const stopPlayback = async () => {
    if (!audioContextRef.current) return;
    try {
      await audioContextRef.current.suspend();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const handleFrequencyChange = (normValue: number) => {
    setFrequencyNorm(normValue);
    const freqValue = expScale(normValue, 20, 2000);
    if (workletNodeRef.current?.parameters) {
      workletNodeRef.current.parameters.get('frequency')?.setValueAtTime(freqValue, audioContextRef.current!.currentTime);
    }
  };

  const handleFilterFrequencyChange = (normValue: number) => {
    setFilterFreqNorm(normValue);
    const freqValue = expScale(normValue, 20, 22050);
    if (filterRef.current) {
      filterRef.current.frequency.setValueAtTime(freqValue, audioContextRef.current!.currentTime);
    }
  };

  const handleDroneModeToggle = async (enabled: boolean) => {
    setDroneMode(enabled);

    if (enabled) {
      // Initialize audio if needed when turning drone on
      if (!audioContextRef.current) {
        await initAudio();
        if (audioContextRef.current!.state === 'suspended') await audioContextRef.current!.resume();
        // Load waveforms into the worklet
        resetWorklet();
        loadedWaveformsRef.current = null;
        updateWorkletWaveforms();
        setIsPlaying(true);
      }
    }

    if (envelopeGainRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      envelopeGainRef.current.gain.cancelScheduledValues(now);
      envelopeGainRef.current.gain.setValueAtTime(enabled ? 1 : 0, now);
    }
    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current);
      noteTimeoutRef.current = null;
    }
    setNoteActive(false);
  };

  // Helper to wrap a value within a range (Pac-Man style)
  const wrapValue = (val: number, min: number, max: number): number => {
    const range = max - min;
    if (range <= 0) return min;
    let wrapped = ((val - min) % range);
    if (wrapped < 0) wrapped += range;
    return min + wrapped;
  };

  // Calculate envelope value from timing (same calculation as Web Audio uses)
  const calculateEnvelopeValue = () => {
    const timing = envelopeTimingRef.current;
    const now = performance.now() / 1000; // Convert to seconds
    const elapsed = now - timing.startTime;

    if (timing.releaseStartTime !== null) {
      // In release phase
      const releaseElapsed = now - timing.releaseStartTime;
      if (releaseElapsed >= release) return 0;
      // Linear ramp from sustain to 0
      const releaseProgress = releaseElapsed / release;
      return sustain * (1 - releaseProgress);
    }

    if (elapsed < attack) {
      // Attack phase: ramp from startValue to 1
      const attackProgress = elapsed / attack;
      return timing.startValue + (1 - timing.startValue) * attackProgress;
    } else if (elapsed < attack + decay) {
      // Decay phase: ramp from 1 to sustain
      const decayElapsed = elapsed - attack;
      const decayProgress = decayElapsed / decay;
      return 1 - (1 - sustain) * decayProgress;
    } else {
      // Sustain phase
      return sustain;
    }
  };

  const startModulationLoop = () => {
    const modLoop = () => {
      if (!audioContextRef.current || !workletNodeRef.current) {
        modAnimationRef.current = null;
        return;
      }
      const envValue = calculateEnvelopeValue();
      const base = baseValuesRef.current;

      // Update envelope value for visual feedback
      setCurrentEnvValue(envValue);

      // Calculate modulated bank/wave values and send to worklet (wrap around Pac-Man style)
      if (envToBankMod !== 0 || envToWaveMod !== 0) {
        const modBank = wrapValue(
          base.bank + envValue * envToBankMod * (maxBankIndex / 2),
          0,
          maxBankIndex + 1
        );
        const modWave = wrapValue(
          base.wave + envValue * envToWaveMod * ((WAVES_PER_BANK - 1) / 2),
          0,
          WAVES_PER_BANK
        );

        // Send modulated morph amounts to worklet
        workletNodeRef.current.port.postMessage({
          type: 'updateMorph',
          bankMorphEnabled,
          waveMorphEnabled,
          bankMorphAmount: bankMorphEnabled ? modBank % 1 : 0,
          waveMorphAmount: waveMorphEnabled ? modWave % 1 : 0
        });
      }

      if (envToFreqMod !== 0) {
        const newFreq = base.freq * Math.pow(2, envValue * envToFreqMod * 2);
        workletNodeRef.current?.parameters.get('frequency')?.setValueAtTime(Math.max(20, Math.min(2000, newFreq)), audioContextRef.current.currentTime);
      }
      if (envToFilterMod !== 0) {
        const newFilter = base.filter * Math.pow(2, envValue * envToFilterMod * 4);
        filterRef.current?.frequency.setValueAtTime(Math.max(20, Math.min(22050, newFilter)), audioContextRef.current.currentTime);
      }
      modAnimationRef.current = requestAnimationFrame(modLoop);
    };
    modAnimationRef.current = requestAnimationFrame(modLoop);
  };

  const stopModulationLoop = () => {
    if (modAnimationRef.current) {
      cancelAnimationFrame(modAnimationRef.current);
      modAnimationRef.current = null;
    }
    // Reset envelope value for visual feedback
    setCurrentEnvValue(0);
    const base = baseValuesRef.current;
    // Reset freq/filter to base values
    if (envToFreqMod !== 0) workletNodeRef.current?.parameters.get('frequency')?.setValueAtTime(base.freq, audioContextRef.current?.currentTime || 0);
    if (envToFilterMod !== 0) filterRef.current?.frequency.setValueAtTime(base.filter, audioContextRef.current?.currentTime || 0);
    // Reset morph amounts to base values
    if ((envToBankMod !== 0 || envToWaveMod !== 0) && workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: 'updateMorph',
        bankMorphEnabled,
        waveMorphEnabled,
        bankMorphAmount: bankMorphEnabled ? base.bank % 1 : 0,
        waveMorphAmount: waveMorphEnabled ? base.wave % 1 : 0
      });
    }
  };

  const triggerNote = async () => {
    if (droneMode) return;

    // Initialize audio if needed
    if (!audioContextRef.current) {
      await initAudio();
      if (audioContextRef.current!.state === 'suspended') await audioContextRef.current!.resume();
      // Load waveforms into the worklet
      resetWorklet();
      loadedWaveformsRef.current = null;
      updateWorkletWaveforms();
      setIsPlaying(true);
    }

    if (!envelopeGainRef.current || !audioContextRef.current) return;
    const now = audioContextRef.current.currentTime;
    const gain = envelopeGainRef.current.gain;

    baseValuesRef.current = { bank: bankIndex, wave: waveIndex, freq: frequency, filter: filterFrequency };

    // Record timing for visual envelope calculation
    const currentEnvVal = calculateEnvelopeValue();
    envelopeTimingRef.current = {
      startTime: performance.now() / 1000,
      releaseStartTime: null,
      startValue: currentEnvVal
    };

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(1, now + attack);
    gain.linearRampToValueAtTime(sustain, now + attack + decay);
    setNoteActive(true);
    stopModulationLoop();
    startModulationLoop();

    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    const holdTime = 0.5;
    noteTimeoutRef.current = window.setTimeout(() => {
      if (!envelopeGainRef.current || !audioContextRef.current) return;
      const releaseTime = audioContextRef.current.currentTime;

      // Record release start time for visual envelope
      envelopeTimingRef.current.releaseStartTime = performance.now() / 1000;

      gain.cancelScheduledValues(releaseTime);
      gain.setValueAtTime(gain.value, releaseTime);
      gain.linearRampToValueAtTime(0, releaseTime + release);
      setNoteActive(false);
      setTimeout(() => stopModulationLoop(), release * 1000);
    }, (attack + decay + holdTime) * 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-zinc-900 min-h-screen">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-200">AKWF Player</h1>
          <p className="text-sm text-stone-400">
            Preview single-cycle waveforms from the{' '}
            <a href="https://www.adventurekid.se/akrt/waveforms/adventure-kid-waveforms/" className="text-stone-300 hover:text-stone-100 hover:underline">Adventure Kid Waveform</a> collection.
          </p>
        </div>
        <a
          href="https://github.com/tashian/waves"
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-400 hover:text-stone-200 transition-colors"
          aria-label="View source on GitHub"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </header>

      {/* Waveform Display */}
      <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800 flex flex-col items-center">
        <WaveformDisplay data={getMorphedWaveform()} height={150} color="#d6d3d1" backgroundColor="#27272a" centerLineColor="#52525b" showCenterLine={true} />
        <div className="mt-2 flex items-center gap-3 min-h-[2.5rem]">
          <p className="text-xs text-stone-500 font-mono">
            {isLoading ? 'Loading...' : getMorphLabel()}
          </p>
          <button
            onClick={downloadWaveform}
            disabled={isLoading || !currentBank}
            className="px-2 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Main Controls */}
      <div className="space-y-4">
        {/* Trigger Button, Drone Switch & Super Bank */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={triggerNote}
              disabled={isLoading || !currentBank || droneMode}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isLoading || !currentBank || droneMode
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : noteActive
                    ? 'bg-stone-200 text-zinc-900'
                    : 'bg-stone-300 hover:bg-stone-200 text-zinc-900'
              }`}
            >
              Trigger
            </button>
            <Switch checked={droneMode} onCheckedChange={handleDroneModeToggle} label="Drone" />
          </div>
          <div className="flex-1">
            <Select
              label="Super Bank"
              value={currentBankName || ''}
              onValueChange={(v) => { loadBank(v); setBankIndex(0); setWaveIndex(0); }}
              options={banks.map(b => ({ value: b, label: b }))}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Bank & Wave Sliders with Mod Knobs */}
        <ParameterGroup title="Wavetable">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-stone-300">Bank</span>
                  <Switch checked={bankMorphEnabled} onCheckedChange={setBankMorphEnabled} label="Morph" />
                </div>
                <SynthSlider
                  value={bankIndex}
                  onChange={setBankIndex}
                  min={0}
                  max={maxBankIndex}
                  step={bankMorphEnabled ? 0.01 : 1}
                  valueDisplay={`Bank ${Math.floor(bankIndex) + 1}/${numBanks}`}
                  modulationValue={bankModOffset}
                />
              </div>
              <ModKnob value={envToBankMod} onChange={setEnvToBankMod} label="env" disabled={droneMode} />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-stone-300">Wave</span>
                  <Switch checked={waveMorphEnabled} onCheckedChange={setWaveMorphEnabled} label="Morph" />
                </div>
                <SynthSlider
                  value={waveIndex}
                  onChange={setWaveIndex}
                  min={0}
                  max={WAVES_PER_BANK - 1}
                  step={waveMorphEnabled ? 0.01 : 1}
                  valueDisplay={`Wave ${Math.floor(waveIndex) + 1}`}
                  modulationValue={waveModOffset}
                />
              </div>
              <ModKnob value={envToWaveMod} onChange={setEnvToWaveMod} label="env" disabled={droneMode} />
            </div>
          </div>
        </ParameterGroup>

        {/* Oscillator & Filter Knobs */}
        <ParameterGroup title="Oscillator & Filter">
          <div className="flex items-start justify-around">
            <div className="flex items-start gap-2">
              <RotaryKnob
                value={frequencyNorm}
                onChange={handleFrequencyChange}
                min={0} max={1} step={0.001}
                label="Freq"
                formatValue={() => formatFrequency(frequency)}
                size={72}
                modulationValue={freqModOffset}
              />
              <ModKnob value={envToFreqMod} onChange={setEnvToFreqMod} label="env" disabled={droneMode} />
            </div>

            <div className="flex items-start gap-2">
              <RotaryKnob
                value={filterFreqNorm}
                onChange={handleFilterFrequencyChange}
                min={0} max={1} step={0.001}
                label="Filter"
                formatValue={() => formatFrequency(filterFrequency)}
                size={72}
                modulationValue={filterModOffset}
              />
              <ModKnob value={envToFilterMod} onChange={setEnvToFilterMod} label="env" disabled={droneMode} />
            </div>

          </div>
        </ParameterGroup>

        {/* Envelope */}
        <ParameterGroup title="Envelope">
          <div className="flex items-center justify-around">
            <RotaryKnob value={attack} onChange={setAttack} min={0.001} max={2} step={0.001} label="A" formatValue={formatTime} size={56} disabled={droneMode} />
            <RotaryKnob value={decay} onChange={setDecay} min={0.001} max={2} step={0.001} label="D" formatValue={formatTime} size={56} disabled={droneMode} />
            <RotaryKnob value={sustain} onChange={setSustain} min={0} max={1} step={0.01} label="S" formatValue={(v) => formatPercent(v)} size={56} disabled={droneMode} />
            <RotaryKnob value={release} onChange={setRelease} min={0.001} max={5} step={0.001} label="R" formatValue={formatTime} size={56} disabled={droneMode} />
          </div>
        </ParameterGroup>

        {/* Reverb */}
        <ParameterGroup title="Reverb">
          <div className="flex items-center gap-4">
            <Switch checked={reverbEnabled} onCheckedChange={setReverbEnabled} label="Enable" />
            <RotaryKnob value={reverbMix} onChange={setReverbMix} min={0} max={1} step={0.01} label="Mix" formatValue={(v) => formatPercent(v)} size={56} disabled={!reverbEnabled} />
            <p className="text-xs text-stone-500">York Minster IR</p>
          </div>
        </ParameterGroup>
      </div>
    </div>
  );
};

export default WaveformPlayer;
