== INFORMATION FOR MUSICIANS ==================================================
===============================================================================

~ Philips SAA 1099 has some rules for envelope or noise control, that you need
  to set by parameters in specific channels. We have two envelope generators,
  two noise generators and there is basic rule, that every env/noise generator
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
