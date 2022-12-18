== ABOUT SAA1099TRACKER =======================================================
===============================================================================

~ SAA1099Tracker is a progressive web application of chiptune music tracker.
  It emulates soundchip Philips SAA 1099, programmable sound generator produced
  in 80s of 20th century and which was used in/with these 8bit micro-computers:
  - integrated in Sam Coupé
  - in sound interface "MIF 85" for Tesla PMD 85
    (an 8-bit personal micro-computer produced in former Czechoslovakia)
  - currently also in few sound interfaces for ZX-Spectrum

~ SAA1099Tracker is a channel-pattern oriented music tracker.
  Every channel-pattern could have any length from 1 to 128 tracklines
  and could be assigned to any of six channel into any position of any length.

~ Sample defines amplitude of both stereo channels separately with optional
  noise generator (and its frequency) mixed into chosen amplitude for every
  interrupt of the processor - or so called "tick". Every tick of the sample
  can be also fine-tuned with precise pitch-shift.
  Sample can be looped in any of its waveform and optionaly marked with
  releasable flag which leads to play the rest of sample data after the loop
  section if note was released in the tracklist.

~ Ornaments can transpose every tick of the sample by exact number of halftones
  up or down. It could be used for false-chords and special trill effects.


== BASIC HARDWARE SPECIFICATIONS AND LIMITATIONS FOR MUSICIANS ================
===============================================================================

~ Philips SAA 1099 has some rules for envelope or noise control, that you need
  to set by parameters in specific channels. We have two envelope generators,
  two noise generators and there is basic rule that every env/noise generator
  belongs for channel-triplets:
  - channel 1 / 4: noise generator frequency control    (tracker command E23)
  - channel 2 / 5: envelope generator frequency control (tracker command EXY)
  - channel 3 / 6: envelope generator amplitude control (tracker command E1Y)

~ Envelope control value consist of two parts. First value specifies mode:
  - E0Y: enable envelope and disable amplitude generator
  - E1Y: enable envelope and leave enabled amplitude generator as it was set
  - E2N: enable and overwrite noise generator with custom value (0-3)
  - E24: disable noise generator
  - ED0: disable envelope generator

~ Second value Y of envelope generator specifies shape and false-stereo effect
  controlled by every odd value after selected shape. Here were chosen every
  meaningful and repetitive shape that was available in two resolutions
  (4-bit vs. 3-bit) that affect the final sound character:
  - 0 - full amplitude   (bass 4-bit resolution)   ----
  - 2 - decay saw        (bass 4-bit resolution)   \\\\
  - 4 - triangular saw   (bass 4-bit resolution)   /\/\
  - 6 - attack saw       (bass 4-bit resolution)   ////
  - 8 - full amplitude   (std. 3-bit resolution)   ----
  - A - decay saw        (std. 3-bit resolution)   \\\\
  - C - triangular saw   (std. 3-bit resolution)   /\/\
  - E - attack saw       (std. 3-bit resolution)   ////
