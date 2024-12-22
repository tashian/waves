import React, { useState, useEffect, useRef } from 'react';
import WaveformDisplay from './WaveformDisplay';
import waveforms from './waveforms.js';

const WaveformPlayer = () => {
  // Bank selection state
  const [selectedSuperBank, setSelectedSuperBank] = useState(Object.keys(waveforms)[0]);
  const [bankPosition, setBankPosition] = useState(0);
  const [wavePosition, setWavePosition] = useState(0);
  
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

  // Get morphed waveform data for display and audio
  const getMorphedWaveform = () => {
    const currentBank = waveforms[selectedSuperBank];
    
    if (bankMorphEnabled || waveMorphEnabled) {
      // Calculate bank indices and morphing amounts
      const bankIndex1 = Math.floor(bankPosition);
      const bankIndex2 = Math.min(bankIndex1 + 1, currentBank.length - 1);
      const bankMorphAmount = bankMorphEnabled ? bankPosition - bankIndex1 : 0;

      // Get the two banks we're morphing between
      const bank1 = currentBank[bankIndex1];
      const bank2 = currentBank[bankIndex2];

      // Calculate wave indices and morphing amounts within each bank
      const waveIndex1 = Math.floor(wavePosition);
      const waveIndex2 = Math.min(waveIndex1 + 1, bank1.length - 1);
      const waveMorphAmount = waveMorphEnabled ? wavePosition - waveIndex1 : 0;

      // Get all four potentially involved waveforms
      const wave11 = normalizeWaveform(bank1[waveIndex1]);
      const wave12 = normalizeWaveform(bank1[waveIndex2]);
      const wave21 = normalizeWaveform(bank2[waveIndex1]);
      const wave22 = normalizeWaveform(bank2[waveIndex2]);

      // Perform bilinear interpolation
      return wave11.map((sample, i) => {
        const morphed1 = sample * (1 - waveMorphAmount) + wave12[i] * waveMorphAmount;
        const morphed2 = wave21[i] * (1 - waveMorphAmount) + wave22[i] * waveMorphAmount;
        return morphed1 * (1 - bankMorphAmount) + morphed2 * bankMorphAmount;
      });
    } else {
      // No morphing - just return the selected waveform
      const bankIndex = Math.floor(bankPosition);
      const waveIndex = Math.floor(wavePosition);
      return normalizeWaveform(currentBank[bankIndex][waveIndex]);
    }
  };

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
      
      // Send initial waveform data and morphing parameters
      updateWorkletWaveforms();
    } catch (error) {
      console.error('Error initializing audio worklet:', error);
      throw error;
    }
  };

  const updateWorkletWaveforms = () => {
    if (!workletNodeRef.current) return;

    const currentBank = waveforms[selectedSuperBank];
    const bankIndex = Math.floor(bankPosition);
    const bankIndex2 = Math.min(bankIndex + 1, currentBank.length - 1);
    const waveIndex = Math.floor(wavePosition);
    const waveIndex2 = Math.min(waveIndex + 1, currentBank[bankIndex].length - 1);

    workletNodeRef.current.port.postMessage({
      type: 'loadWaveforms',
      bankMorphEnabled,
      waveMorphEnabled,
      waveforms: {
        bank1wave1: normalizeWaveform(currentBank[bankIndex][waveIndex]),
        bank1wave2: normalizeWaveform(currentBank[bankIndex][waveIndex2]),
        bank2wave1: normalizeWaveform(currentBank[bankIndex2][waveIndex]),
        bank2wave2: normalizeWaveform(currentBank[bankIndex2][waveIndex2])
      },
      bankMorphAmount: bankPosition - bankIndex,
      waveMorphAmount: wavePosition - waveIndex
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
    updateWorkletWaveforms();
  };

  const handleBankChange = (value) => {
    setBankPosition(value);
    updateWorkletWaveforms();
  };

  const handleWaveChange = (value) => {
    setWavePosition(value);
    updateWorkletWaveforms();
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
                  max={waveforms[selectedSuperBank].length - 1}
                  step={bankMorphEnabled ? "0.01" : "1"}
                  value={bankPosition}
                  onChange={(e) => handleBankChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={bankMorphEnabled}
                    onChange={(e) => setBankMorphEnabled(e.target.checked)}
                  />
                  Morph
                </label>
              </div>
              <span className="text-sm text-gray-600">
                Bank {Math.floor(bankPosition)}
                {bankMorphEnabled && bankPosition % 1 !== 0 && 
                  ` → ${Math.ceil(bankPosition)} (${Math.round((bankPosition % 1) * 100)}%)`}
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
                  max={waveforms[selectedSuperBank][Math.floor(bankPosition)].length - 1}
                  step={waveMorphEnabled ? "0.01" : "1"}
                  value={wavePosition}
                  onChange={(e) => handleWaveChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={waveMorphEnabled}
                    onChange={(e) => setWaveMorphEnabled(e.target.checked)}
                  />
                  Morph
                </label>
              </div>
              <span className="text-sm text-gray-600">
                Wave {Math.floor(wavePosition)}
                {waveMorphEnabled && wavePosition % 1 !== 0 && 
                  ` → ${Math.ceil(wavePosition)} (${Math.round((wavePosition % 1) * 100)}%)`}
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
