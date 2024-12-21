import React, { useState, useEffect, useRef } from 'react';
import WaveformDisplay from './WaveformDisplay';

// Define waveform data
/*
 * const PLACEHOLDER_WAVEFORM_1 = new Array(256).fill(0).map((_, i) => 
  Math.sin(2 * Math.PI * i / 256) * 32768 + 32768
);

const PLACEHOLDER_WAVEFORM_2 = new Array(256).fill(0).map((_, i) => 
  (Math.sin(2 * Math.PI * i / 256) > 0 ? 1 : -1) * 32768 + 32768
);
*/

const WAVEFORM_1 = [
    33225, 36438, 40314, 44467, 48363, 51177, 55274, 58991, 62003, 64226, 65302, 65518, 64856, 63641, 61891, 59853,
57491, 54890, 51757, 48180, 43984, 39456, 34577, 29904, 25461, 22102, 19451, 16305, 13912, 11949, 10609,  9875,
 9677, 10006, 10782, 11969, 13453, 15216, 17170, 19304, 21532, 23839, 26148, 28437, 30649, 32757, 34721, 36519,
38123, 39512, 40675, 41568, 42159, 42801, 43314, 43704, 44004, 44174, 44264, 44245, 44162, 43990, 43774, 43496,
43186, 42824, 42432, 41992, 41515, 40987, 40414, 39784, 39097, 38349, 37539, 36671, 35745, 34772, 33755, 32709,
31641, 30565, 29488, 28426, 27386, 26377, 25409, 24484, 23610, 22790, 22030, 21332, 20705, 20151, 19687, 19314,
19046, 18892, 18862, 18960, 19191, 19555, 20042, 20648, 21354, 22153, 23010, 23921, 24836, 25756, 26625, 27459,
28197, 28895, 29497, 30172, 30755, 31105, 31415, 31642, 31891, 32207, 32661, 33304, 34207, 35396, 36930, 38941,
41569, 43476, 45522, 48553, 51571, 54688, 57361, 59461, 60765, 61293, 61067, 60253, 59015, 57490, 55796, 53932,
51916, 49620, 47022, 43953, 40484, 36527, 32365, 28020, 23976, 20221, 17584, 15396, 12793, 10895,  9297,  8265,
 7716,  7636,  7990,  8728,  9797, 11112, 12656, 14349, 16194, 18119, 20130, 22156, 24209, 26234, 28239, 30178,
32061, 33848, 35549, 37133, 38609, 39955, 41180, 42274, 43246, 44093, 44824, 45449, 45970, 46397, 46735, 46992,
47164, 47263, 47275, 47211, 47053, 46805, 46457, 46010, 45457, 44804, 44049, 43205, 42275, 41272, 40211, 39100,
37953, 36776, 35586, 34381, 33179, 31980, 30796, 29625, 28481, 27359, 26273, 25217, 24208, 23241, 22337, 21493,
20739, 20072, 19519, 19082, 18779, 18610, 18581, 18689, 18918, 19268, 19692, 20196, 20706, 21244, 21693, 22107,
22191, 21910, 21822, 21661, 21317, 20984, 20651, 20525, 20542, 20904, 21474, 22452, 23641, 25288, 27156, 29785,
];

const WAVEFORM_2 = [
    33024, 35934, 39835, 43683, 47494, 50935, 54070, 56715, 58973, 60745, 62154, 63140, 63810, 64117, 64137, 63822,
63213, 62263, 61009, 59430, 57573, 55433, 53060, 50482, 47778, 45004, 42265, 39631, 37209, 35061, 33347, 32083,
30714, 29395, 28260, 27343, 26678, 26259, 26087, 26131, 26371, 26769, 27308, 27951, 28676, 29447, 30230, 30991,
31692, 32309, 32771, 33167, 33586, 33933, 34201, 34370, 34444, 34423, 34311, 34121, 33858, 33549, 33208, 32884,
32595, 32242, 31864, 31502, 31178, 30921, 30746, 30667, 30684, 30809, 31039, 31381, 31814, 32327, 32817, 33419,
34244, 35197, 36271, 37410, 38593, 39763, 40892, 41928, 42838, 43588, 44146, 44491, 44602, 44479, 44111, 43528,
42725, 41727, 40522, 39157, 37632, 36045, 34411, 33003, 31652, 29908, 28019, 26059, 24135, 22301, 20629, 19158,
17936, 16986, 16335, 15994, 15970, 16261, 16858, 17734, 18866, 20246, 21851, 23659, 25615, 27666, 29713, 31641,
33181, 34925, 36974, 39034, 41069, 42950, 44654, 46103, 47291, 48168, 48746, 48999, 48946, 48583, 47946, 47051,
45939, 44614, 43123, 41475, 39740, 37941, 36183, 34494, 33098, 31901, 30457, 28975, 27544, 26235, 25090, 24144,
23417, 22921, 22661, 22625, 22807, 23176, 23715, 24382, 25164, 26023, 26946, 27890, 28840, 29750, 30604, 31366,
32021, 32535, 32889, 33211, 33494, 33687, 33799, 33811, 33744, 33588, 33371, 33099, 32831, 32559, 32200, 31803,
31396, 31010, 30666, 30395, 30206, 30124, 30142, 30275, 30515, 30875, 31335, 31890, 32474, 33028, 33766, 34693,
35717, 36826, 37947, 39060, 40091, 41018, 41775, 42342, 42673, 42752, 42567, 42122, 41414, 40423, 39170, 37645,
35936, 34098, 32484, 30538, 27993, 25172, 22140, 19061, 16016, 13122, 10440,  8037,  5938,  4171,  2720,  1598,
  772,   254,     9,    79,   437,  1159,  2218,  3704,  5564,  7930, 10715, 14028, 17672, 21684, 25690, 29691,
];

const WaveformPlayer = () => {
  const [morphAmount, setMorphAmount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [filterFrequency, setFilterFrequency] = useState(22050);
  
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const filterRef = useRef(null);

  // Define cleanup function
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

  // Register cleanup on unmount
  useEffect(() => cleanup, []);

  const initAudio = async () => {
    // Clean up any existing audio context
    if (audioContextRef.current) {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.disconnect();
        filterRef.current = null;
      }
      await audioContextRef.current.close();
    }

    // Create new audio context and nodes
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
      // Load the AudioWorklet
      await audioContextRef.current.audioWorklet.addModule('/waveform-processor.worklet.js');
      
      // Create and connect nodes
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
      
      // Send initial waveform data
      workletNodeRef.current.port.postMessage({
        type: 'loadWaveforms',
        waveform1: normalizeWaveform(WAVEFORM_1),
        waveform2: normalizeWaveform(WAVEFORM_2)
      });

      // Set initial parameter values
      workletNodeRef.current.parameters.get('morphAmount').setValueAtTime(morphAmount, audioContextRef.current.currentTime);
      workletNodeRef.current.parameters.get('frequency').setValueAtTime(frequency, audioContextRef.current.currentTime);
      filterRef.current.frequency.setValueAtTime(filterFrequency, audioContextRef.current.currentTime);
      
    } catch (error) {
      console.error('Error initializing audio worklet:', error);
      throw error;
    }
  };

  // Convert uint16_t arrays to normalized float arrays (-1 to 1)
  const normalizeWaveform = (data) => data.map(x => (x - 32768) / 32768);

  // Get morphed waveform data for display
  const getMorphedWaveform = () => {
    const waveform1 = normalizeWaveform(WAVEFORM_1);
    const waveform2 = normalizeWaveform(WAVEFORM_2);
    return waveform1.map((sample, i) => 
      sample * (1 - morphAmount) + waveform2[i] * morphAmount
    );
  };

  const playWaveform = async () => {
    try {
      // Initialize audio context if it doesn't exist
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

  const handleMorphChange = (value) => {
    setMorphAmount(value);
    if (workletNodeRef.current?.parameters) {
      workletNodeRef.current.parameters.get('morphAmount')
        ?.setValueAtTime(value, audioContextRef.current.currentTime);
    }
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
              Morph Amount
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={morphAmount}
                onChange={(e) => handleMorphChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-600">
                {morphAmount === 0 ? "Waveform 1" : 
                 morphAmount === 1 ? "Waveform 2" : 
                 `${Math.round(morphAmount * 100)}% Mix`}
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
