import React, { useState, useEffect, useRef } from 'react';
import WaveformDisplay from './WaveformDisplay';
import waveforms from './waveforms.js';

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
  const [frequency, setFrequency] = useState(440);
  const [filterFrequency, setFilterFrequency] = useState(22050);
  
  // Audio refs
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const filterRef = useRef(null);

  // Convert uint16_t arrays to normalized float arrays (-1 to 1)
  const normalizeWaveform = (data) => data.map(x => (x - 32768) / 32768);

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
      const wave11 = normalizeWaveform(currentBank[waveformNames.wave11]);
      const wave12 = normalizeWaveform(currentBank[waveformNames.wave12]);
      const wave21 = normalizeWaveform(currentBank[waveformNames.wave21]);
      const wave22 = normalizeWaveform(currentBank[waveformNames.wave22]);

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
      return normalizeWaveform(currentBank[waveformNames.wave11]);
    }
  };

  // Audio cleanup
  const cleanup = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (filterRef.current) {
      filterRef.current.disconnect();
      filterRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  useEffect(() => cleanup, []);

  useEffect(() => {
    updateWorkletWaveforms();
  }, [selectedSuperBank, bankIndex, waveIndex, bankMorphEnabled, waveMorphEnabled]);

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
      
      workletNodeRef.current.connect(filterRef.current);
      filterRef.current.connect(audioContextRef.current.destination);
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
        bank1wave1: normalizeWaveform(currentBank[waveformNames.wave11]),
        bank1wave2: normalizeWaveform(currentBank[waveformNames.wave12]),
        bank2wave1: normalizeWaveform(currentBank[waveformNames.wave21]),
        bank2wave2: normalizeWaveform(currentBank[waveformNames.wave22])
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

  const handleFrequencyChange = (value) => {
    setFrequency(value);
    if (workletNodeRef.current?.parameters) {
      workletNodeRef.current.parameters.get('frequency')
        ?.setValueAtTime(value, audioContextRef.current.currentTime);
    }
  };

  const handleFilterFrequencyChange = (value) => {
    setFilterFrequency(value);
    if (filterRef.current) {
      filterRef.current.frequency.setValueAtTime(value, audioContextRef.current.currentTime);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Waveform Morph Player</h1>
      
      <div className="border rounded p-4 bg-white">
        <h2 className="text-lg font-bold mb-4">Waveform Display</h2>
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

          <div className="space-y-2">
            <label className="block">
              Super Bank
              <select 
                value={selectedSuperBank}
                onChange={(e) => handleSuperBankChange(e.target.value)}
                className="w-full mt-1 rounded border-gray-300"
              >
                {Object.keys(waveforms).map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              Bank Select
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="9"
                  step={bankMorphEnabled ? "0.01" : "1"}
                  value={bankIndex}
                  onChange={(e) => handleBankChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={bankMorphEnabled}
                    onChange={(e) => handleBankMorphToggle(e.target.checked)}
                  />
                  Morph
                </label>
              </div>
              <span className="text-sm text-gray-600">
                Bank {Math.floor(bankIndex) + 1}
                {bankMorphEnabled && bankIndex % 1 !== 0 && 
                  ` → ${Math.floor(bankIndex) + 2} (${Math.round((bankIndex % 1) * 100)}%)`}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              Wave Select
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="9"
                  step={waveMorphEnabled ? "0.01" : "1"}
                  value={waveIndex}
                  onChange={(e) => handleWaveChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={waveMorphEnabled}
                    onChange={(e) => handleWaveMorphToggle(e.target.checked)}
                  />
                  Morph
                </label>
              </div>
              <span className="text-sm text-gray-600">
                Wave {Math.floor(waveIndex) + 1}
                {waveMorphEnabled && waveIndex % 1 !== 0 && 
                  ` → ${Math.floor(waveIndex) + 2} (${Math.round((waveIndex % 1) * 100)}%)`}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              Frequency
              <input
                type="range"
                min="20"
                max="2000"
                step="1"
                value={frequency}
                onChange={(e) => handleFrequencyChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{frequency} Hz</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block">
              Filter Frequency
              <input
                type="range"
                min="20"
                max="22050"
                step="1"
                value={filterFrequency}
                onChange={(e) => handleFilterFrequencyChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{filterFrequency} Hz</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformPlayer;
