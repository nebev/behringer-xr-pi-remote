const _ = require("lodash");
import { logger } from './log';
import { BehingerMixer } from './behringer';

const config = require("../config");
const mixerIP = config.mixerIP;

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const httpPort = process.env.PORT || 3000;
const udpRemotePort = process.env.UDP_REMOTE_PORT || 10024;
const udpLocalPort = process.env.UDP_LOCAL_PORT || 57121;

logger.info(`Behringer Mixer Websocket Server`);

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
    }
}, 10000);


server.listen(httpPort, () => {
  logger.info(`Spawned HTTP server on port ${httpPort}`);
});

