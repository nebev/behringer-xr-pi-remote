const _ = require("lodash");
import { logger } from './log';
import { BehingerMixer } from './behringer';
const fs = require('fs');
const prompt = require('prompt-sync')();
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const qrcode = require('qrcode-terminal');

let config;

logger.info(`Behringer Mixer Websocket Server`);

const httpPort = process.env.PORT || 3000;
let udpRemotePort = process.env.UDP_REMOTE_PORT || 10024;
const udpLocalPort = process.env.UDP_LOCAL_PORT || 57121;

// Search for some config files
['../config.json', `${os.homedir()}/behringer-remote.json`, `${os.homedir()}/.behringer-remote.json`].forEach((path) => {
    logger.debug(`Checking for config file at ${path}`);
    if (fs.existsSync(path)) {
        logger.info(`Found config file at ${path}`);
        config = require(path);
        if (config.udpRemotePort) {
            udpRemotePort = config.udpRemotePort;
        }
    }
});

if (!config) {
  // We need to prompt for an IP address
  logger.info('No config.json found. Please enter the IP address of your Behringer X12/X16/XR18/X32 mixer');
  const ipToValidate = prompt('Enter the IP address of your mixer: ');
  const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipRegex.test(ipToValidate)) {
    logger.error('Invalid IP address');
    process.exit(1);
  }

  udpRemotePort = prompt('Enter the port of your mixer (10024): ', 10024);
  config = {
    mixerIP: ipToValidate,
  };
}

const mixerIP = config.mixerIP;

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const mixer = new BehingerMixer({
    mixerIP,
    udpRemotePort,
    udpLocalPort,
});


const sendMixerState = async () => {
    logger.debug('Mixer state updated');
    const sockets = await io.fetchSockets();
    sockets.forEach(socket => {
        socket.emit('mixerState', mixer.mixerState);
    });
};

const sendMeters = async (meters) => {
    const sockets = await io.fetchSockets();
    sockets.forEach(socket => {
        socket.emit('meters', meters);
    });
};


mixer.eventEmitter.on('mixerState', _.debounce(sendMixerState, 250, { 'maxWait': 1000 }));
mixer.eventEmitter.on('meters', _.debounce(sendMeters, 50));

app.use(express.static('public'))

// Websocket listeners
io.on('connection', (socket) => {
  logger.debug('WebSocket user connected');
  socket.emit('mixerState', mixer.mixerState);

  socket.on('getBusVolumes', (busNo) => {
    // TODO: Debounce
    mixer.requestBusLevels([busNo]);
  });

  socket.on('updateBusVolume', ({bus, channel, volume}) => {
    mixer.updateBusChannelVolume(bus, channel, volume);
  });
});

io.on('disconnect', (socket) => {
    logger.debug('WebSocket user disconnected');
});

// Every 10 seconds, check if there are any sockets connected. If so, we want to show meter levels
setInterval(async () => {
    const sockets = await io.fetchSockets();
    if (sockets.length > 0) {
        mixer.subscribeToMeters();
        mixer.requestChannelNames(); // Channel names and mute status change every so often
    }
}, 10000);

// Every 125 seconds, check if there are any sockets connected. If so, we want to refresh bus information
setInterval(async () => {
    const sockets = await io.fetchSockets();
    if (sockets.length > 0) {
        mixer.requestBusNames();
    }
}, 125000);


server.listen(httpPort, () => {
  logger.info(`Spawned HTTP server on port ${httpPort}`);
  const availableUris = Object.values(networkInterfaces)
    .flat()
    .filter((iface: any) => iface.family === 'IPv4')
    .filter((iface: any) => iface.address !== '127.0.0.1')
    .map((iface: any) => `http://${iface.address}:3000`);
  logger.warn(`Access this application via browser at: \n${availableUris.join(' OR \n')}`);
  if (process.env.IS_DOCKER === '1') {
    logger.warn('This application is running in a Docker container. You will need to forward the port to your host machine.');
  } else {
    qrcode.generate(availableUris[0]);
  }

});

process.on('uncaughtException', (err) => {
  logger.error('Unhandled Exception. This application cannot recover and will exit in 5 seconds:', err);
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection. This application cannot recover and will exit in 5 seconds:', err);
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});
