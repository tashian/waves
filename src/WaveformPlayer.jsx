import React, { useState, useEffect, useRef } from 'react';
import WaveformDisplay from './WaveformDisplay';
import waveforms from './waveforms.js';
import Switch from './components/Switch';
import Slider from './components/Slider';
import Select from './components/Select';

// Utility functions for exponential scaling
const expScale = (value, min, max) => {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return Math.exp(minLog + (value * (maxLog - minLog)));
};

const invExpScale = (value, min, max) => {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return (Math.log(value) - minLog) / (maxLog - minLog);
};

const WaveformPlayer = () => {
  // State for bank and wave selection
  const [selectedSuperBank, setSelectedSuperBank] = useState(Object.keys(waveforms)[0]);
  const [bankIndex, setBankIndex] = useState(0);
  const [waveIndex, setWaveIndex] = useState(0);

  // Morphing toggles
  const [bankMorphEnabled, setBankMorphEnabled] = useState(true);
  const [waveMorphEnabled, setWaveMorphEnabled] = useState(true);

  // Audio parameters
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequencyNorm, setFrequencyNorm] = useState(invExpScale(440, 20, 2000));
  const [filterFreqNorm, setFilterFreqNorm] = useState(invExpScale(22050, 20, 22050));

  // Drone mode and envelope
  const [droneMode, setDroneMode] = useState(true); // true = continuous drone, false = triggered notes
  const [attack, setAttack] = useState(0.01); // Attack time in seconds
  const [decay, setDecay] = useState(0.1); // Decay time in seconds
  const [sustain, setSustain] = useState(0.7); // Sustain level (0-1)
  const [release, setRelease] = useState(0.3); // Release time in seconds
  const [noteActive, setNoteActive] = useState(false); // Whether a note is currently triggered

  // Envelope modulation amounts (bipolar: -1 to 1)
  const [envToBankMod, setEnvToBankMod] = useState(0);
  const [envToWaveMod, setEnvToWaveMod] = useState(0);
  const [envToFreqMod, setEnvToFreqMod] = useState(0); // In octaves
  const [envToFilterMod, setEnvToFilterMod] = useState(0); // In octaves

  // Delay parameters
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayTime, setDelayTime] = useState(0.25); // Delay time in seconds
  const [delayFeedback, setDelayFeedback] = useState(0.3); // Feedback amount (0-1)
  const [delayMix, setDelayMix] = useState(0.3); // Delay wet/dry mix (0-1)

  // Reverb parameters
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.3); // 0 = dry, 1 = wet

  // Actual frequency values
  const frequency = expScale(frequencyNorm, 20, 2000);
  const filterFrequency = expScale(filterFreqNorm, 20, 22050);

  // Audio refs
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const filterRef = useRef(null);
  const convolverRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const envelopeGainRef = useRef(null);
  const delayNodeRef = useRef(null);
  const delayFeedbackRef = useRef(null);
  const delayDryGainRef = useRef(null);
  const delayWetGainRef = useRef(null);
  const noteTimeoutRef = useRef(null);
  const modAnimationRef = useRef(null);
  const baseValuesRef = useRef({ bank: 0, wave: 0, freq: 440, filter: 22050 });

  // Get waveform names for current position
  const getWaveformNames = (superBank, bankPos, wavePos) => {
    const waveformsInBank = Object.keys(waveforms[superBank]);
    const waveCount = waveformsInBank.length;
    const wavesPerBank = 10;

    // Calculate indices for current bank and next bank
    const bankStart1 = Math.floor(bankPos) * wavesPerBank;
    const bankStart2 = Math.min((Math.floor(bankPos) + 1) * wavesPerBank, waveCount - wavesPerBank);

    // Calculate indices for current waves and next waves
    const wave1Index = Math.min(bankStart1 + Math.floor(wavePos), waveCount - 1);
    const wave2Index = Math.min(bankStart1 + Math.min(Math.floor(wavePos) + 1, wavesPerBank - 1), waveCount - 1);
    const wave3Index = Math.min(bankStart2 + Math.floor(wavePos), waveCount - 1);
    const wave4Index = Math.min(bankStart2 + Math.min(Math.floor(wavePos) + 1, wavesPerBank - 1), waveCount - 1);

    return {
      wave11: waveformsInBank[wave1Index],
      wave12: waveformsInBank[wave2Index],
      wave21: waveformsInBank[wave3Index],
      wave22: waveformsInBank[wave4Index]
    };
  };

  // Get morphed waveform data for display
  const getMorphedWaveform = () => {
    const currentBank = waveforms[selectedSuperBank];
    const waveformNames = getWaveformNames(selectedSuperBank, bankIndex, waveIndex);

    if (bankMorphEnabled || waveMorphEnabled) {
      // Get the four waveforms we might need
      const wave11 = currentBank[waveformNames.wave11];
      const wave12 = currentBank[waveformNames.wave12];
      const wave21 = currentBank[waveformNames.wave21];
      const wave22 = currentBank[waveformNames.wave22];

      // Calculate morph amounts
      const bankMorphAmount = bankMorphEnabled ? bankIndex % 1 : 0;
      const waveMorphAmount = waveMorphEnabled ? waveIndex % 1 : 0;

      // Perform bilinear interpolation
      return wave11.map((sample, i) => {
        const morphed1 = sample * (1 - waveMorphAmount) + wave12[i] * waveMorphAmount;
        const morphed2 = wave21[i] * (1 - waveMorphAmount) + wave22[i] * waveMorphAmount;
        return morphed1 * (1 - bankMorphAmount) + morphed2 * bankMorphAmount;
      });
    } else {
      // No morphing - just return the selected waveform
      return currentBank[waveformNames.wave11];
    }
  };

  // Audio cleanup
  const cleanup = () => {
    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current);
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (filterRef.current) {
      filterRef.current.disconnect();
      filterRef.current = null;
    }
    if (envelopeGainRef.current) {
      envelopeGainRef.current.disconnect();
      envelopeGainRef.current = null;
    }
    if (delayNodeRef.current) {
      delayNodeRef.current.disconnect();
      delayNodeRef.current = null;
    }
    if (delayFeedbackRef.current) {
      delayFeedbackRef.current.disconnect();
      delayFeedbackRef.current = null;
    }
    if (delayDryGainRef.current) {
      delayDryGainRef.current.disconnect();
      delayDryGainRef.current = null;
    }
    if (delayWetGainRef.current) {
      delayWetGainRef.current.disconnect();
      delayWetGainRef.current = null;
    }
    if (convolverRef.current) {
      convolverRef.current.disconnect();
      convolverRef.current = null;
    }
    if (dryGainRef.current) {
      dryGainRef.current.disconnect();
      dryGainRef.current = null;
    }
    if (wetGainRef.current) {
      wetGainRef.current.disconnect();
      wetGainRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
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
      // Equal power crossfade
      const wetGain = Math.sqrt(reverbMix);
      const dryGain = Math.sqrt(1 - reverbMix);

      dryGainRef.current.gain.value = dryGain;
      wetGainRef.current.gain.value = wetGain;
    } else {
      // Reverb disabled: full dry, no wet
      dryGainRef.current.gain.value = 1;
      wetGainRef.current.gain.value = 0;
    }
  };

  const updateDelayMix = () => {
    if (!delayDryGainRef.current || !delayWetGainRef.current) return;

    if (delayEnabled) {
      // Equal power crossfade for delay
      const wetGain = Math.sqrt(delayMix);
      const dryGain = Math.sqrt(1 - delayMix);

      delayDryGainRef.current.gain.value = dryGain;
      delayWetGainRef.current.gain.value = wetGain;
    } else {
      // Delay disabled: full dry, no wet
      delayDryGainRef.current.gain.value = 1;
      delayWetGainRef.current.gain.value = 0;
    }
  };

  useEffect(() => {
    updateWorkletWaveforms();
  }, [selectedSuperBank, bankIndex, waveIndex, bankMorphEnabled, waveMorphEnabled]);

  useEffect(() => {
    updateReverbMix();
  }, [reverbEnabled, reverbMix]);

  useEffect(() => {
    updateDelayMix();
  }, [delayEnabled, delayMix]);

  useEffect(() => {
    // Update delay parameters when they change
    if (delayNodeRef.current && audioContextRef.current) {
      delayNodeRef.current.delayTime.setValueAtTime(delayTime, audioContextRef.current.currentTime);
    }
    if (delayFeedbackRef.current && audioContextRef.current) {
      delayFeedbackRef.current.gain.setValueAtTime(delayFeedback, audioContextRef.current.currentTime);
    }
  }, [delayTime, delayFeedback]);

  const initAudio = async () => {
    cleanup();

    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

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

      // Create envelope gain node
      envelopeGainRef.current = audioContextRef.current.createGain();
      envelopeGainRef.current.gain.value = droneMode ? 1 : 0;

      // Create delay nodes
      delayNodeRef.current = audioContextRef.current.createDelay(2.0);
      delayNodeRef.current.delayTime.value = delayTime;
      delayFeedbackRef.current = audioContextRef.current.createGain();
      delayFeedbackRef.current.gain.value = delayFeedback;
      delayDryGainRef.current = audioContextRef.current.createGain();
      delayWetGainRef.current = audioContextRef.current.createGain();

      // Create reverb nodes
      convolverRef.current = audioContextRef.current.createConvolver();
      dryGainRef.current = audioContextRef.current.createGain();
      wetGainRef.current = audioContextRef.current.createGain();

      // Load impulse response
      await loadImpulseResponse();

      // Set initial mixes
      updateReverbMix();
      updateDelayMix();

      // Set initial frequency on worklet
      if (workletNodeRef.current.parameters) {
        const freqParam = workletNodeRef.current.parameters.get('frequency');
        if (freqParam) {
          freqParam.setValueAtTime(frequency, audioContextRef.current.currentTime);
        }
      }

      // Connect audio graph: worklet -> filter -> envelope -> delay -> reverb -> destination
      workletNodeRef.current.connect(filterRef.current);
      filterRef.current.connect(envelopeGainRef.current);

      // Delay routing: envelope -> delay dry/wet split
      envelopeGainRef.current.connect(delayDryGainRef.current);
      envelopeGainRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayFeedbackRef.current);
      delayFeedbackRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayWetGainRef.current);

      // Merge delay dry/wet -> reverb dry/wet split
      // Dry path (no reverb)
      delayDryGainRef.current.connect(dryGainRef.current);
      delayWetGainRef.current.connect(dryGainRef.current);
      dryGainRef.current.connect(audioContextRef.current.destination);

      // Wet path (reverb)
      delayDryGainRef.current.connect(convolverRef.current);
      delayWetGainRef.current.connect(convolverRef.current);
      convolverRef.current.connect(wetGainRef.current);
      wetGainRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error('Error initializing audio worklet:', error);
      throw error;
    }
  };

  const updateWorkletWaveforms = () => {
    if (!workletNodeRef.current) return;

    const currentBank = waveforms[selectedSuperBank];
    const waveformNames = getWaveformNames(selectedSuperBank, bankIndex, waveIndex);

    workletNodeRef.current.port.postMessage({
      type: 'loadWaveforms',
      waveforms: {
        bank1wave1: currentBank[waveformNames.wave11],
        bank1wave2: currentBank[waveformNames.wave12],
        bank2wave1: currentBank[waveformNames.wave21],
        bank2wave2: currentBank[waveformNames.wave22]
      },
      bankMorphEnabled,
      waveMorphEnabled,
      bankMorphAmount: bankMorphEnabled ? bankIndex % 1 : 0,
      waveMorphAmount: waveMorphEnabled ? waveIndex % 1 : 0
    });
  };

  const playWaveform = async () => {
    try {
      if (!audioContextRef.current) {
        await initAudio();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Ensure envelope gain is set correctly for current drone mode
      if (envelopeGainRef.current) {
        envelopeGainRef.current.gain.setValueAtTime(
          droneMode ? 1 : 0,
          audioContextRef.current.currentTime
        );
      }

      setIsPlaying(true);
      updateWorkletWaveforms();
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

  // UI update handlers
  const handleSuperBankChange = (value) => {
    setSelectedSuperBank(value);
    setBankIndex(0);
    setWaveIndex(0);
  };

  const handleBankChange = (value) => {
    setBankIndex(value);
  };

  const handleWaveChange = (value) => {
    setWaveIndex(value);
  };

  const handleBankMorphToggle = (enabled) => {
    setBankMorphEnabled(enabled);
  };

  const handleWaveMorphToggle = (enabled) => {
    setWaveMorphEnabled(enabled);
  };

  const handleFrequencyChange = (normValue) => {
    setFrequencyNorm(normValue);
    const freqValue = expScale(normValue, 20, 2000);
    if (workletNodeRef.current?.parameters) {
      workletNodeRef.current.parameters.get('frequency')
        ?.setValueAtTime(freqValue, audioContextRef.current.currentTime);
    }
  };

  const handleFilterFrequencyChange = (normValue) => {
    setFilterFreqNorm(normValue);
    const freqValue = expScale(normValue, 20, 22050);
    if (filterRef.current) {
      filterRef.current.frequency.setValueAtTime(freqValue, audioContextRef.current.currentTime);
    }
  };

  const handleDroneModeToggle = (enabled) => {
    setDroneMode(enabled);
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

  // Modulation loop - applies envelope to modulation destinations
  const startModulationLoop = () => {
    const modLoop = () => {
      if (!envelopeGainRef.current || !audioContextRef.current) {
        modAnimationRef.current = null;
        return;
      }

      const envValue = envelopeGainRef.current.gain.value;
      const base = baseValuesRef.current;

      // Apply bank modulation (±5 banks range)
      if (envToBankMod !== 0) {
        const modAmount = envValue * envToBankMod * 5;
        const newBank = Math.max(0, Math.min(9, base.bank + modAmount));
        setBankIndex(newBank);
      }

      // Apply wave modulation (±5 waves range)
      if (envToWaveMod !== 0) {
        const modAmount = envValue * envToWaveMod * 5;
        const newWave = Math.max(0, Math.min(9, base.wave + modAmount));
        setWaveIndex(newWave);
      }

      // Apply frequency modulation (±2 octaves range)
      if (envToFreqMod !== 0) {
        const modOctaves = envValue * envToFreqMod * 2;
        const newFreq = base.freq * Math.pow(2, modOctaves);
        const clampedFreq = Math.max(20, Math.min(2000, newFreq));
        if (workletNodeRef.current?.parameters) {
          workletNodeRef.current.parameters.get('frequency')
            ?.setValueAtTime(clampedFreq, audioContextRef.current.currentTime);
        }
      }

      // Apply filter modulation (±4 octaves range)
      if (envToFilterMod !== 0) {
        const modOctaves = envValue * envToFilterMod * 4;
        const newFilter = base.filter * Math.pow(2, modOctaves);
        const clampedFilter = Math.max(20, Math.min(22050, newFilter));
        if (filterRef.current) {
          filterRef.current.frequency.setValueAtTime(clampedFilter, audioContextRef.current.currentTime);
        }
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

    // Reset to base values
    const base = baseValuesRef.current;
    if (envToBankMod !== 0) setBankIndex(base.bank);
    if (envToWaveMod !== 0) setWaveIndex(base.wave);
    if (envToFreqMod !== 0 && workletNodeRef.current?.parameters) {
      workletNodeRef.current.parameters.get('frequency')
        ?.setValueAtTime(base.freq, audioContextRef.current?.currentTime || 0);
    }
    if (envToFilterMod !== 0 && filterRef.current && audioContextRef.current) {
      filterRef.current.frequency.setValueAtTime(base.filter, audioContextRef.current.currentTime);
    }
  };

  const triggerNote = () => {
    if (!envelopeGainRef.current || !audioContextRef.current || droneMode) return;

    const now = audioContextRef.current.currentTime;
    const gain = envelopeGainRef.current.gain;

    // Store base values for modulation
    baseValuesRef.current = {
      bank: bankIndex,
      wave: waveIndex,
      freq: frequency,
      filter: filterFrequency
    };

    // Cancel any scheduled values
    gain.cancelScheduledValues(now);

    // Start from current value (could be in middle of release)
    gain.setValueAtTime(gain.value, now);

    // Attack: ramp to 1
    gain.linearRampToValueAtTime(1, now + attack);

    // Decay: ramp to sustain level
    gain.linearRampToValueAtTime(sustain, now + attack + decay);

    setNoteActive(true);

    // Start modulation loop
    stopModulationLoop();
    startModulationLoop();

    // Clear any existing timeout
    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current);
    }

    // Schedule release after a hold time (sustain phase)
    const holdTime = 0.5; // Hold sustain for 500ms
    noteTimeoutRef.current = setTimeout(() => {
      if (!envelopeGainRef.current || !audioContextRef.current) return;
      const releaseTime = audioContextRef.current.currentTime;
      gain.cancelScheduledValues(releaseTime);
      gain.setValueAtTime(gain.value, releaseTime);
      gain.linearRampToValueAtTime(0, releaseTime + release);
      setNoteActive(false);

      // Stop modulation after release completes
      setTimeout(() => {
        stopModulationLoop();
      }, release * 1000);
    }, (attack + decay + holdTime) * 1000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">AKWF Player</h1>
      <p>This app by <a href="https://tashian.com" className="text-sky-500 font-semibold dark:text-sky-400">Carl Tashian</a> allows you to preview single-cycle waveform sounds from the <a href="https://www.adventurekid.se/akrt/waveforms/adventure-kid-waveforms/" className="text-sky-500 font-semibold dark:text-sky-400">Adventure Kid Waveform</a> collection curated by <a href="https://www.adventurekid.se" className="text-sky-500 font-semibold dark:text-sky-400">Kristoffer Ekstrand</a>.</p>
      <p><a href="https://github.com/tashian/waves" className="text-sky-500 font-semibold dark:text-sky-400">GitHub pull requests are welcome</a>.</p>
      <div className="border rounded p-4 bg-white">
        <WaveformDisplay
          data={getMorphedWaveform()}
          width={600}
          height={200}
          color="#2563eb"
          showCenterLine={true}
        />
        <div className="mt-2 text-sm text-gray-600">
          {bankMorphEnabled || waveMorphEnabled ? (
            <div>
              Morphing between: {getWaveformNames(selectedSuperBank, bankIndex, waveIndex).wave11}
              {waveMorphEnabled && waveIndex % 1 !== 0 && ` → ${getWaveformNames(selectedSuperBank, bankIndex, waveIndex).wave12}`}
              {bankMorphEnabled && bankIndex % 1 !== 0 && ` → ${getWaveformNames(selectedSuperBank, bankIndex, waveIndex).wave21}`}
              {bankMorphEnabled && waveMorphEnabled && bankIndex % 1 !== 0 && waveIndex % 1 !== 0 && ` → ${getWaveformNames(selectedSuperBank, bankIndex, waveIndex).wave22}`}
            </div>
          ) : (
            <div>
              Current waveform: {getWaveformNames(selectedSuperBank, bankIndex, waveIndex).wave11}
            </div>
          )}
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <h2 className="text-lg font-bold mb-4">Controls</h2>
        <div className="space-y-4">
          <button
            onClick={isPlaying ? stopPlayback : playWaveform}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>

          <Select
            label="Super Bank"
            value={selectedSuperBank}
            onValueChange={handleSuperBankChange}
            options={Object.keys(waveforms).map(bank => ({ value: bank, label: bank }))}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Bank Select</span>
              <Switch
                checked={bankMorphEnabled}
                onCheckedChange={handleBankMorphToggle}
                label="Morph"
              />
            </div>
            <Slider
              value={bankIndex}
              onValueChange={handleBankChange}
              min={0}
              max={9}
              step={bankMorphEnabled ? 0.01 : 1}
              valueDisplay={`Bank ${Math.floor(bankIndex) + 1}${bankMorphEnabled && bankIndex % 1 !== 0 ? ` → ${Math.floor(bankIndex) + 2} (${Math.round((bankIndex % 1) * 100)}%)` : ''}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Wave Select</span>
              <Switch
                checked={waveMorphEnabled}
                onCheckedChange={handleWaveMorphToggle}
                label="Morph"
              />
            </div>
            <Slider
              value={waveIndex}
              onValueChange={handleWaveChange}
              min={0}
              max={9}
              step={waveMorphEnabled ? 0.01 : 1}
              valueDisplay={`Wave ${Math.floor(waveIndex) + 1}${waveMorphEnabled && waveIndex % 1 !== 0 ? ` → ${Math.floor(waveIndex) + 2} (${Math.round((waveIndex % 1) * 100)}%)` : ''}`}
            />
          </div>

          <Slider
            label="Frequency"
            value={frequencyNorm}
            onValueChange={handleFrequencyChange}
            min={0}
            max={1}
            step={0.001}
            valueDisplay={`${Math.round(frequency)} Hz`}
          />

          <Slider
            label="Filter Frequency"
            value={filterFreqNorm}
            onValueChange={handleFilterFrequencyChange}
            min={0}
            max={1}
            step={0.001}
            valueDisplay={`${Math.round(filterFrequency)} Hz`}
          />

          <div className="space-y-2 border-t pt-4">
            <Switch
              checked={droneMode}
              onCheckedChange={handleDroneModeToggle}
              label="Drone Mode"
            />
            <p className="text-xs text-gray-500">
              {droneMode ? 'Continuous tone' : 'Triggered notes with envelope'}
            </p>
          </div>

          {!droneMode && (
            <div className="space-y-4 p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-4">
                <button
                  onClick={triggerNote}
                  disabled={!isPlaying}
                  className={`px-4 py-2 rounded font-semibold ${
                    isPlaying
                      ? noteActive
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {noteActive ? 'Playing...' : 'Trigger Note'}
                </button>
                <span className="text-sm text-gray-500">
                  {!isPlaying && '(Press Play first)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Slider
                  label="Attack"
                  value={attack}
                  onValueChange={setAttack}
                  min={0.001}
                  max={2}
                  step={0.001}
                  valueDisplay={`${attack.toFixed(3)}s`}
                />

                <Slider
                  label="Decay"
                  value={decay}
                  onValueChange={setDecay}
                  min={0.001}
                  max={2}
                  step={0.001}
                  valueDisplay={`${decay.toFixed(3)}s`}
                />

                <Slider
                  label="Sustain"
                  value={sustain}
                  onValueChange={setSustain}
                  min={0}
                  max={1}
                  step={0.01}
                  valueDisplay={`${Math.round(sustain * 100)}%`}
                />

                <Slider
                  label="Release"
                  value={release}
                  onValueChange={setRelease}
                  min={0.001}
                  max={5}
                  step={0.001}
                  valueDisplay={`${release.toFixed(3)}s`}
                />
              </div>

              <div className="border-t pt-3 mt-3">
                <h4 className="text-sm font-semibold mb-2">Envelope Modulation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Slider
                    label="Bank"
                    subtitle="±5 banks"
                    value={envToBankMod}
                    onValueChange={setEnvToBankMod}
                    min={-1}
                    max={1}
                    step={0.01}
                    bipolar
                    valueDisplay={`${envToBankMod > 0 ? '+' : ''}${Math.round(envToBankMod * 100)}%`}
                  />

                  <Slider
                    label="Wave"
                    subtitle="±5 waves"
                    value={envToWaveMod}
                    onValueChange={setEnvToWaveMod}
                    min={-1}
                    max={1}
                    step={0.01}
                    bipolar
                    valueDisplay={`${envToWaveMod > 0 ? '+' : ''}${Math.round(envToWaveMod * 100)}%`}
                  />

                  <Slider
                    label="Frequency"
                    subtitle="±2 oct"
                    value={envToFreqMod}
                    onValueChange={setEnvToFreqMod}
                    min={-1}
                    max={1}
                    step={0.01}
                    bipolar
                    valueDisplay={`${envToFreqMod > 0 ? '+' : ''}${Math.round(envToFreqMod * 100)}%`}
                  />

                  <Slider
                    label="Filter"
                    subtitle="±4 oct"
                    value={envToFilterMod}
                    onValueChange={setEnvToFilterMod}
                    min={-1}
                    max={1}
                    step={0.01}
                    bipolar
                    valueDisplay={`${envToFilterMod > 0 ? '+' : ''}${Math.round(envToFilterMod * 100)}%`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Switch
              checked={delayEnabled}
              onCheckedChange={setDelayEnabled}
              label="Delay"
            />
            {delayEnabled && (
              <div className="space-y-3 pl-4">
                <Slider
                  label="Delay Time"
                  value={delayTime}
                  onValueChange={setDelayTime}
                  min={0.01}
                  max={2}
                  step={0.01}
                  valueDisplay={`${delayTime.toFixed(2)}s`}
                />

                <Slider
                  label="Feedback"
                  value={delayFeedback}
                  onValueChange={setDelayFeedback}
                  min={0}
                  max={0.95}
                  step={0.01}
                  valueDisplay={`${Math.round(delayFeedback * 100)}%`}
                />

                <Slider
                  label="Delay Mix"
                  value={delayMix}
                  onValueChange={setDelayMix}
                  min={0}
                  max={1}
                  step={0.01}
                  valueDisplay={`${Math.round(delayMix * 100)}% wet`}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Switch
              checked={reverbEnabled}
              onCheckedChange={setReverbEnabled}
              label="Reverb (York Minster)"
            />
            {reverbEnabled && (
              <div className="pl-4">
                <Slider
                  label="Reverb Mix"
                  value={reverbMix}
                  onValueChange={setReverbMix}
                  min={0}
                  max={1}
                  step={0.01}
                  valueDisplay={`${Math.round(reverbMix * 100)}% wet`}
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              Impulse response from <a href="https://www.openair.hosted.york.ac.uk/" className="text-sky-500 hover:underline" target="_blank" rel="noopener noreferrer">OpenAIR</a> (CC BY 4.0)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformPlayer;
