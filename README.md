# AKWF Player

This app allows you to preview waveform sounds from the popular, public domain 
[Adventure Kid Waveform](https://www.adventurekid.se/akrt/waveforms/adventure-kid-waveforms/)
collection curated by
[Kristoffer Ekstrand](https://www.adventurekid.se).

It features a waveform display and optional 2D morphing between waveforms.

## Features I'd like to see

### AD envelope
An AD envelope for amplitude.
The AD envelope should be triggerable by a button click in the UI, or by pressing the spacebar.
We'll need sliders for adjusting the Attack and Decay times.
We can then remove the Play/Stop buttons.

### Envelope modulation
Modulation that can apply to any of the following:
the amplitude,
the filter,
and the bank and waveform select sliders.

The user should be able to independently adjust the modulation depth
that the envelope applies to each slider.
Add these modulation depth sliders to the right of each item being modulated in the UI.
The modulations should be bipolar,
and when negative modulation is applied,
the modulation envelope should be inverted and applied to the parameter.
By default, when the page loads,
only the filter should be modulated by the envelope.
Other modulation depths should default to zero.
Because the control is bipolar,
zero will be in the center of the slider.

The low-pass filter control should default to silence,
but its modulation depth should default to 100%. 
