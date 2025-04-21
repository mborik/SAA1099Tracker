/**
 * SAA1099Tracker: CLI tool entry point.
 * Copyright (c) 2025 Martin Borik <martin@borik.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/// <reference path="../src/global.d.ts" />

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import commandLineArgs from 'command-line-args';
import { devLog } from '../src/commons/dev';
import { mp3, vgm, wave } from '../src/commons/export';
import { SAASound } from '../src/libs/SAASound';
import Player from '../src/player/Player';
import { cliCmdLineArgs } from './args';
import { calculateDuration, parseJSON } from './utils';

const VERSION = 'v0.1.0';

const showMOTD = () => {
  // eslint-disable-next-line no-console
  console.log(`
SAA1099Tracker CLI tool ${VERSION}`);
};

const showHelp = (errorCode: number) => {
  showMOTD();
  // eslint-disable-next-line no-console
  console.log(`
  Usage
    $ stcli [options] <input>

  Input file should be STMF native format or binary compilation of SAA1099Tracker.
  Options:
    -o  --output       Output path (default: input with extension appended)
    -t  --format       Output format (vgm, vgz, wav, mp3; default: mp3)
    -s  --sample-rate  Sample rate (default: 44100)
    -b  --bit-depth    Bit depth of wav (default: 16)
    -q  --quality      MP3 bitrate in kbps (default: 256)
    -m  --mono         Mono output (default is stereo)
    -f  --force        Force overwrite output file
    -h  --help         Show this help message
    -v  --version      Show version number`);

  process.exit(errorCode);
};

const argv = process.argv.slice(2);
if (!argv.length) {
  showHelp(0);
}

const cli = commandLineArgs(cliCmdLineArgs, {
  argv,
  camelCase: true,
  partial: true,
});

let { help, version, format } = cli.general ?? {};
if (version) {
  // eslint-disable-next-line
  console.log(VERSION);
  process.exit(0);
}
if (help) {
  showHelp(0);
}

showMOTD();

let { input, output, force } = cli.file ?? {};

input = input ?? cli._unknown?.[0];
if (!(input && existsSync(input))) {
  console.error(`Input file not exists: '${input}'`);
  process.exit(1);
}
format = (format || '').toLowerCase();
if (!['vgm', 'vgz', 'wav', 'mp3'].includes(format)) {
  console.error(`Invalid format: ${format}!`);
  showHelp(1);
}
let { sampleRate, bitDepth, quality, mono } = cli.audio ?? {};
if (![22050, 44100, 48000, 96000].includes(sampleRate)) {
  console.error(`Invalid sample rate ${sampleRate}, expected 22050, 44100, 48000 or 96000!`);
  showHelp(1);
}
if (![8, 16, 24, 32].includes(bitDepth)) {
  console.error(`Invalid bit depth ${bitDepth}, expected 8, 16, 24 or 32!`);
  showHelp(1);
}
const encoderBitrates = [96, 112, 128, 192, 224, 256, 320];
if (!encoderBitrates.includes(quality)) {
  console.error(`Invalid quality ${quality}, expected\n\t${JSON.stringify(encoderBitrates)}!`);
  showHelp(1);
}

if (!output) {
  output = input;
}
output = join(dirname(output), `${basename(output, extname(output))}.${format}`);

if (existsSync(output) && !force) {
  console.error(`Output file already exists: '${output}'`);
  process.exit(1);
}

const isMP3 = format === 'mp3';
if (isMP3 && !(sampleRate === 44100 && bitDepth === 16)) {
  sampleRate = 44100;
  bitDepth = 16;
  devLog('CLI', 'MP3 encoder requires 44100 Hz / 16 bit');
}

devLog('CLI', `Selected format ${format.toUpperCase()} to output path: '${output}'`);

const SAA1099 = new SAASound(sampleRate);
const player = new Player(SAA1099);
const settings = { audioInterrupt: 50 };
const Tracker: { [key: string]: any } = { player, settings };

Object.defineProperty(globalThis, 'window', {
  value: { Tracker, isDev: true },
  enumerable: true,
  configurable: true,
  writable: true,
});

const inputData = readFileSync(input);
if (inputData[0] === 0x7B) { // '{' character
  // STMF native file format
  if (!parseJSON(inputData.toString('utf8'), player, Tracker)) {
    console.error(`Error parsing input file: '${input}'`);
    process.exit(1);
  }
}

const durationInFrames = calculateDuration(player);
const [isVGM, compressed] = /^vg(?:m|(z))$/.exec(format)?.map(Boolean) ?? [false, false];

let outputData: Uint8Array;
if (isVGM) {
  outputData = vgm({
    player,
    audioInterrupt: settings.audioInterrupt,
    durationInFrames,
    songTitle: Tracker.songTitle,
    songAuthor: Tracker.songAuthor,
    uncompressed: !compressed,
  });
}
else {
  const channels = mono ? 1 : 2;
  if (isMP3) {
    outputData = mp3({
      player,
      SAA1099,
      bitrate: quality,
      channels,
      repeatCount: 0,
      audioInterrupt: settings.audioInterrupt,
      durationInFrames,
    });
  }
  else {
    outputData = wave({
      player,
      SAA1099,
      frequency: sampleRate,
      bitDepth,
      channels: mono ? 1 : 2,
      repeatCount: 0,
      audioInterrupt: settings.audioInterrupt,
      durationInFrames,
    });
  }
}

writeFileSync(output, outputData);
