const { PassThrough } = require('stream');

function createListeningStream(receiver, userId, user) {
    const opusStream = receiver.subscribe(userId);

    const input = new AudioMixer.Input({
        channels: 2,
        sampleRate: 48000,
        bitDepth: 16,
        volume: 1,
        callback: (buffer) => {
            // do something with the mixed audio buffer
        },
    });

    audioMixer.addInput(input);

    const silenceDuration = 10; // duration of silence frames in milliseconds
    let silenceCount = 0;
    let lastFrameIsSilent = false;
    const silenceFrame = Buffer.alloc(48); // a 48-byte buffer containing all zeroes (silent frame)
    const passThrough = new PassThrough(); // a stream to pass silence frames

    // When a user starts speaking, pipe the opus stream to the audio-mixer input
    receiver.speaking.on('start', () => {
        opusStream.pipe(input);
    });

    // When a user stops speaking, unpipe the opus stream from the audio-mixer input
    receiver.speaking.on('stop', () => {
        opusStream.unpipe(input);
    });

    // When the opus stream sends data, check for silence frames and pass them through if necessary
    opusStream.on('data', (data) => {
        const isSilent = isSilenceFrame(data);
        if (isSilent) {
            silenceCount++;
            if (lastFrameIsSilent) {
                // If the last frame was silent, pass the silence frame through again
                passThrough.write(silenceFrame);
            } else {
                // If this is the first silent frame, add a delay to the audio-mixer input
                input.addDelay(silenceDuration);
                passThrough.write(silenceFrame);
                lastFrameIsSilent = true;
            }
        } else {
            if (silenceCount > 0) {
                // If there were one or more silent frames, remove the delay from the audio-mixer input
                input.removeDelay(silenceCount * silenceDuration);
                silenceCount = 0;
            }
            lastFrameIsSilent = false;
        }
    });

    // Pass silence frames through the passThrough stream
    function isSilenceFrame(data) {
        // Check if the opus frame contains all zeroes
        for (let i = 0; i < data.length; i++) {
            if (data[i] !== 0) {
                return false;
            }
        }
        return true;
    }
}
