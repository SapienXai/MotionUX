# Studio assets

- `studio/assets/quiet-hills.webp` uses Zetong Li’s [Silent Hills in the Olympic NP](https://unsplash.com/pt-br/fotografias/arvores-durante-o-dia-nublado-kdkQo_X_jDc) under the [Unsplash License](https://unsplash.com/license). MotionUX serves a resized WebP copy locally for Studio's image specimens. The registry component accepts images from its consumer, and installation does not include this photograph.

- `studio/assets/field-tones.wav` is an original 10-second mono tone sample synthesized for MotionUX Studio. It is used by Glass Player and Music Toggle and excluded from installed components. The studio starts it only on explicit activation.

## V5 Gallery

The room roof, fictional Emma Carter portrait and Aegean imagery are original ImageGen fixtures. They were generated for the Studio gallery and exported as local WebP crops. They contain no customer data and ship only with their V6 Gallery presets as text-encoded WebP fixtures. The supplied design-reference PNG is documentation only.

## Installable recipe assets

The input and gesture recipes embed the original `quiet-hills.webp` bytes in a shared lazy module. The signal recipes embed an AAC conversion of the 10-second, synthetic `field-tones.wav`. The resulting M4A is 11,610 bytes. The source WAV remains available for the original base consumer examples. Both recipe assets load with their respective story families.

The AAC asset was encoded with `afconvert -f m4af -d aac -b 24000 studio/assets/field-tones.wav field-tones.m4a`.
