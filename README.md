# Motomic

## Requirements
- Node.js version 16.x or higher.
- Discord.js v13.x.
- FFMPEG needs to be installed on your system.

## Installation
1. Clone this repository using git clone https://github.com/bdekonin/motomic.git
2. Run npm install to install the required dependencies.
3. Create a new application on the Discord Developer Portal.
4. Add a bot to your Discord application.
5. Copy the bot token.
6. Create a .env file in the root directory of the project and add the following in the .env file:
```
TOKEN = "....." 
```
7. Run the bot using node index.js.

## Usage
- The bot listens for a message starting with !record or !r.
- The user must have admin permissions to use the !record command.
- The bot will automatically join the voice channel that the user is currently in.
- When the !record command is executed, the bot will start recording the audio of all the members in the voice channel (excluding itself).
- The bot will send a message confirming that it is recording.
- To stop recording, send another !record or !r command.
- The bot will send a message with an attached MP3 file for each user who was recorded.
- The bot will automatically leave the voice channel after the recording is completed.

## Code Overview
The index.js file contains the main code for the bot.

- The bot listens for the messageCreate event and checks if the message starts with !record or !r.
- If the user does not have admin permissions, the bot will send a message saying that they do not have permission to use the command.
- If the bot is not already in a voice channel, it will join the voice channel that the user is currently in.
- If the bot is already in a voice channel, it will stop recording and send a message with the MP3 file.
- The bot uses the discord.js library to interact with the Discord API.
- The prism-media library is used to encode and decode audio data.
- The ffmpeg library is used to convert the audio data to MP3 format.

## Source
https://stackoverflow.com/questions/74693643/interpolate-silence-in-discord-js-stream
