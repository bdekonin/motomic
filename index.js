/* Required Modules */
const { entersState, joinVoiceChannel, VoiceConnectionStatus, EndBehaviorType, VoiceReceiver } = require('@discordjs/voice');
const { createWriteStream } = require('node:fs');
const prism = require('prism-media');
const { pipeline } = require('node:stream');
const { Client, Intents, MessageAttachment, Collection } = require('discord.js');
const ffmpeg = require('ffmpeg');
const sleep = require('util').promisify(setTimeout);
const fs = require('fs');
const AudioMixer = require('audio-mixer');
const NanoTimer = require('nanotimer'); // node
const Readable = require('stream');

/* Initialize Discord Client */
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
})


/* Audio-Mixer */
let mixer = new AudioMixer.Mixer({
    sampleRate: 48000,
});

let input = mixer.input({
    channels: 1,
    volume: 75
});

/* Collection to store voice state */
client.voiceManager = new Collection()

/* Ready event */
client.on("ready", () => {
    console.log("Connected as", client.user.tag, "to discord!");
})

var recording = false

/* When message is sent*/
client.on('messageCreate', async (message) => {
    /* If content starts with `!record` */
    if (message.content.startsWith('!record') || message.content.startsWith('!r')) {
        /* If member do not have admin perms */
        if (!message.member.permissions.has('ADMINISTRATOR'))
            return message.channel.send('You do not have permission to use this command.'); 
        /* Get the voice channel the user is in */
        const voiceChannel = message.member.voice.channel
        /* Check if the bot is in voice channel */
        let connection = client.voiceManager.get(message.channel.guild.id)

        /* If the bot is not in voice channel */
        if (!connection) {
            /* if user is not in any voice channel then return the error message */
            if(!voiceChannel)
                return message.channel.send("You must be in a voice channel to use this command!")

            /* Join voice channel*/
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                selfDeaf: false,
                selfMute: true,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            /* Add voice state to collection */
            client.voiceManager.set(message.channel.guild.id, connection);
            await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
            const receiver = connection.receiver;

            const voiceChannelMemberIds = voiceChannel.members
                .map(member => member.user.id)
                .filter(id => id !== client.user.id);
            console.log(voiceChannelMemberIds);


            recording = true;

            /* When user speaks in vc*/
            // receiver.speaking.on('start', (userId) => {
            //     if(userId !== message.author.id) return;
            //     /* create live stream to save audio */
            //     createListeningStream(receiver, userId, client.users.cache.get(userId));
            // });

            // for (const userId of voiceChannelMemberIds) {
                await createListeningStream(receiver, message.author.id);
            // }

            /* Return success message */
            return message.channel.send(`🎙️ I am now recording ${voiceChannel.name}`);
        
            /* If the bot is in voice channel */
        } else if (connection) {
            /* Send waiting message */
            const msg = await message.channel.send("Please wait while I am preparing your recording...")
            /* wait for 10 seconds */
            await sleep(10000)
            console.log('buffer.length');
            console.log(buffer.length);

            /* disconnect the bot from voice channel */
            connection.destroy();

            /* Remove voice state from collection */
            client.voiceManager.delete(message.channel.guild.id)
            
            const filename = `./recordings/${message.author.id}`;
            recording = false;

            /* Create ffmpeg command to convert pcm to mp3 */
            const process = new ffmpeg(`${filename}.pcm`);
            process.then(function (audio) {
                audio.fnExtractSoundToMP3(`${filename}.mp3`, async function (error, file) {
                    //edit message with recording as attachment
                    await msg.edit({
                        content: `🔉 Here is your recording!`,
                        files: [new MessageAttachment(`./recordings/${message.author.id}.mp3`, 'recording.mp3')]
                    });

                    //delete both files
                    fs.unlinkSync(`${filename}.pcm`)
                    fs.unlinkSync(`${filename}.mp3`)
                });
            }, function (err) {
                /* handle error by sending error message to discord */
                return msg.edit(`❌ An error occurred while processing your recording: ${err.message}`);
            });
        }
    }
})

client.login("TOKEN")
// ffmpeg -f s16le -ar 48k -ac 2 -i 233891719832272896.pcm file.wav

//------------------------- F U N C T I O N S ----------------------//
const SILENCE = Buffer.from([0xf8, 0xff, 0xfe]);

/* Function to write audio to file (from discord.js example) */
async function createListeningStream(receiver, userId) {
    // Accumulates very, very slowly, but only when user is speaking: reduces buffer size otherwise
    let buffer = [];

    // Interpolating silence into user audio stream
    let userStream = new Readable({
        read() {
            if (recording) {
                // Pushing audio at the same rate of the receiver
                // (Could probably be replaced with standard, l ess precise timer)
                let delay = new NanoTimer();
                delay.setTimeout(() => {
                    if (buffer.length > 0) {
                        this.push(buffer.shift());
                    }
                    else {
                        this.push(SILENCE);
                    }
                    // delay.clearTimeout();
                }, '', '20m'); // A 20.833ms period makes for a 48kHz frequency
            }
            else if (buffer.length > 0) {
                // Sending buffered audio ASAP
                this.push(buffer.shift());
            }
            else {
                // Ending stream
                this.push(null);
            }
        }
    });
    
    // Redirecting user audio to userStream to have silence interpolated
    let receiverStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.Manual, // Manually closed elsewhere
        },
        // mode: 'pcm',
    });
    receiverStream.on('data', (chunk) => {
        buffer.push(chunk);
        console.log(buffer.length);
    });

    const oggStream = new prism.opus.OggLogicalBitstream({
		opusHead: new prism.opus.OpusHead({
			channelCount: 2,
			sampleRate: 48000,
		}),
		pageSizeControl: {
			maxPackets: 10,
		},
	});

    const filename = `./recordings/${userId}.pcm`;

    const out = createWriteStream(filename, { flags: 'a' });

	pipeline(userStream, oggStream, out, (err) => {
		if (err) {
			console.warn(`❌ Error recording file ${filename} - ${err.message}`);
		} else {
			console.log(`✅ Recorded ${filename}`);
		}
	});
}
