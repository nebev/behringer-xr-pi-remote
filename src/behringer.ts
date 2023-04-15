import { logger } from "./log";
import { set } from "lodash";
import * as osc from "osc";
import { EventEmitter } from "events";

export const mixerMap = {
    XR12: {
        channels: 8,
        buses: 2,
    },
    XR16: {
        channels: 16,
        buses: 4,
    },
    XR18: {
        channels: 16,
        buses: 6,
    },
    X32: {
        channels: 32,
        buses: 8,
    },
};

export class BehingerMixer {
    public mixerIP: string;
    public decibels: boolean; // Display things in decibels or percentages
    public udpRemotePort: number;
    public udpLocalPort: number;
    public udpPort: any;
    public mixerKey: MixerModel;
    public mixerState: IMixerState = {
        model: null,
        channels: {},
        buses: {},
    }
    public eventEmitter = new EventEmitter();


    constructor(config) {
        this.mixerIP = config.mixerIP;
        this.decibels = false;
        this.udpRemotePort = config.udpRemotePort || 10024;
        this.udpLocalPort = config.udpLocalPort || 57121;
        this.connectToMixer();
    }

    /**
     * Connect to the mixer
     */
    public connectToMixer() {
        logger.info(`Connecting to Mixer at ${this.mixerIP} (Port ${this.udpRemotePort})...`);
        logger.info('Update config.json to change the mixer IP');
        this.udpPort = new osc.UDPPort({
            localAddress: "0.0.0.0",
            localPort: this.udpLocalPort,
            remotePort: this.udpRemotePort,
            remoteAddress: this.mixerIP,
        });
        this.udpPort.on("ready", () => {
            logger.info(`UDP Socket open and listening at 0.0.0.0:${this.udpLocalPort}`);
            this.requestInfo();
        });
        this.udpPort.on('message', this.processUdpMessage.bind(this));
        this.udpPort.on("error", function (err) {
            logger.error(err);
        });
        this.udpPort.open();

        // Exit if we can't connect to the mixer
        setTimeout(() => {
            if (!this.mixerKey) {
                logger.error(`Mixer not found at ${this.mixerIP} (Port ${this.udpRemotePort})`);
                logger.error(`Exiting in 5 seconds...`);
                setTimeout(() => {
                    process.exit(1);
                }, 5000);
            }
        }, 20000);
    }

    /**
     * Request model from the mixer
     */
    public requestInfo() {
        logger.debug('Requesting Mixer Info');
        this.udpPort.send({
            address: "/info",
            args: [],
        });
    }

    /**
     * Request channel names & colors from the mixer
     */
    public async requestChannelNames() {
        logger.debug('Requesting Channel Names');
        if (!this.mixerKey) { return; }
        for (let i = 1; i <= mixerMap[this.mixerKey].channels; i++) {
            const channel = i.toString().padStart(2, '0');
            if (this.mixerKey === 'X32') {
                this.udpPort.send({ address: `/ch/${channel}/config/name` });
                this.udpPort.send({ address: `/ch/${channel}/config/color` });
            } else {
                this.udpPort.send({ address: `/ch/${channel}/config` });
            }
            
            this.udpPort.send({ address: `/ch/${channel}/mix/on` });
            await this.pause(100);
        }
    }

    /**
     * Requests bus names & colors from the mixer
     */
    public async requestBusNames() {
        logger.debug('Requesting Bus Names');
        for (let i = 1; i <= mixerMap[this.mixerKey].buses; i++) {
            if (this.mixerKey === 'X32') {
                const bus = i.toString().padStart(2, '0');
                this.udpPort.send({ address: `/bus/${bus}/config/name` });
                this.udpPort.send({ address: `/bus/${bus}/config/color` });
            } else {
                this.udpPort.send({ address: `/bus/${i}/config` }); // XR18 only responds to this, and the bus doesn't have a 0 prefix
            }

            // Set a default in case these never resolve
            if (!this.mixerState.buses[i]) {
                this.mixerState.buses[i] = {
                    name: null,
                    color: null,
                    channels: {},
                };
            }
            await this.pause(100);
        }
    }

    /**
     * Request bus levels from the mixer
     * @param buses Array of bus numbers to request. Leave NULL for All buses
     */
    public requestBusLevels(buses: number[]) {
        if (!this.mixerKey) { return; }
        if (!buses) { buses = Array.from(Array(mixerMap[this.mixerKey].buses).keys()).map(a => a + 1); }
        buses.forEach((bus: any) => {
            for (let i = 1; i <= mixerMap[this.mixerKey].channels; i++) {
                const channel = i.toString().padStart(2, '0');
                bus = bus.toString().padStart(2, '0');
                this.udpPort.send({ address: `/ch/${channel}/mix/${bus}/level` });
            }
        })
    }

    /**
     * Update a bus's channel volume 
     */
    public updateBusChannelVolume(bus: number, channel: number, volume: number) {
        const busStr = bus.toString().padStart(2, '0');
        const channelStr = channel.toString().padStart(2, '0');
        logger.info(`Updating bus ${busStr} channel ${channelStr} volume to ${volume}`);
        this.udpPort.send({
            address: `/ch/${channelStr}/mix/${busStr}/level`,
            args: [{ type: 'f', value: volume }],
        });
    }

    /**
     * Process a UDP message from the mixer
     */
    protected processUdpMessage(oscMessage) {
        const { address, args } = oscMessage;
        const aps = address.split('/');
        if (aps[1] !== 'meters') {
            logger.silly(`Received OSC Message:`, address, args);
        }

        if (aps[1] === 'info') {
            this.mixerKey = args[2] as MixerModel;
            this.mixerState.model = this.mixerKey;
            logger.info(`Connected to ${this.mixerKey} Mixer`);
            this.requestChannelNames();
            this.requestBusLevels(null);
            this.requestBusNames();
        } else if (aps[1] === 'ch' && aps[4] === 'name') {
            const channelName = parseInt(address.split('/')[2], 10);
            set(this.mixerState, `channels.${channelName}.name`, args[0]);
        } else if (aps[1] === 'bus' && aps[4] === 'name') {
            const busName = parseInt(address.split('/')[2], 10);
            set(this.mixerState, `buses.${busName}.name`, args[0]);
        } else if (aps[1] === 'bus' && aps[3] === 'config' && !aps[4]) {
            const busName = parseInt(address.split('/')[2], 10);
            set(this.mixerState, `buses.${busName}.name`, args[0]);
            set(this.mixerState, `buses.${busName}.color`, this.normaliseColor(args[1]));
        } else if (aps[1] === 'ch' && aps[3] === 'config' && !aps[4]) {
            const channelName = parseInt(address.split('/')[2], 10);
            set(this.mixerState, `channels.${channelName}.name`, args[0]);
            set(this.mixerState, `channels.${channelName}.color`, this.normaliseColor(args[1]));
        } else if (aps[1] === 'ch' && aps[4] == 'color') {
            const channelName = parseInt(aps[2], 10);
            set(this.mixerState, `channels.${channelName}.color`, this.normaliseColor(args[0]));
        } else if (aps[1] === 'bus' && aps[4] == 'color') {
            const busName = parseInt(aps[2], 10);
            set(this.mixerState, `buses.${busName}.color`, this.normaliseColor(args[0]));
            this.eventEmitter.emit('mixerState', this.mixerState);
        } else if (aps[1] === 'ch' && aps[3] == 'mix' && aps[5] == 'level') {
            const channelName = parseInt(aps[2], 10);
            const busName = parseInt(aps[4], 10);
            set(this.mixerState, `buses.${busName}.channels.${channelName}.level`, Math.floor(args[0] * 100) / 100);
            this.eventEmitter.emit('mixerState', this.mixerState);
        } else if (aps[1] === 'meters' && aps[2] === '1') {
            this.eventEmitter.emit('meters', this.processMeter1Packet(args[0]));
        } else if (aps[1] === 'ch' && aps[4] === 'on') {
            const channelName = parseInt(aps[2], 10);
            set(this.mixerState, `channels.${channelName}.on`, args[0] === 1);
        } else {
            logger.debug(aps);
        }
    }

    protected processGenericPacket(inBuffer) {
        let thisBuffer = Buffer.from(inBuffer);
        let i = 4;
        const levels = [];
        for (let lvlIdx = 0; lvlIdx < 40; lvlIdx++) {
            try {
                let value = thisBuffer.readIntLE(i, 2); //Convert the two bytes into a signed int
                value = value / 256; //Convert to float as decibels
                if (!this.decibels) value = this.dbToPercentage(value) * 100;
                levels.push(value);
                i = i + 2; //Increment by two bytes for the next one
            } catch (err) {
                // Out of range
            }
        }
        return levels;
    }

    protected dbToPercentage(d: number) {
        /*
            Function courtesy of Patrick‐Gilles Maillot (see their X32 Documentation)
            “d” represents the dB float data. d:[-90, +10]
            “f” represents OSC float data. f: [0.0, 1.0]
         */
        let f = 0.0;
        if (d <= -90) f = 0.0;
        else if (d < -60) f = (d + 90) / 480;
        else if (d < -30) f = (d + 70) / 160;
        else if (d < -10) f = (d + 50) / 80;
        else if (d <= 10) f = (d + 30) / 40;
        /*
            f is now a fudged linear value between 0.0 and 1.0 for decibel values from -90 to 10.
            0.75 = 0dB, so given our highest values are 0 we want to scale it again slightly to give us a 0.0 to 1.0 value for -90dB to +0 dB
            0.375 should now be 0.5 for example
        */
        return f / 0.75;
    }

    public subscribeToMeters() {
        logger.debug('Subscribing to Meters');
        this.udpPort.send({
            address: "/meters",
            args: [{ type: "s", value: "/meters/1" }]
        });
    }

    protected processMeter1Packet(inBuffer) {
        let thisBuffer = Buffer.from(inBuffer);
        let levels = { //Output structure
            '1': 0.0, //channel 1 - prefade
            '2': 0.0, //channel 2 - prefade
            '3': 0.0, //channel 3 - prefade
            '4': 0.0, //channel 4 - prefade
            '5': 0.0, //channel 5 - prefade
            '6': 0.0, //channel 6 - prefade
            '7': 0.0, //channel 7 - prefade
            '8': 0.0, //channel 8 - prefade
            '9': 0.0, //channel 9 - prefade
            '10': 0.0, //channel 10 - prefade
            '11': 0.0, //channel 11 - prefade
            '12': 0.0, //channel 12 - prefade
            '13': 0.0, //channel 13 - prefade
            '14': 0.0, //channel 14 - prefade
            '15': 0.0, //channel 15 - prefade
            '16': 0.0, //channel 16 - prefade
            'auxL': 0.0, //aux in channel - prefade (left)
            'auxR': 0.0, //aux in channel - prefade (right)
            'fx1PreL': 0.0, //Effect prefade
            'fx1PreR': 0.0,
            'fx2PreL': 0.0,
            'fx2PreR': 0.0,
            'fx3PreL': 0.0,
            'fx3PreR': 0.0,
            'fx4PreL': 0.0,
            'fx4PreR': 0.0,
            'bus1Pre': 0.0, //Bus prefade
            'bus2Pre': 0.0,
            'bus3Pre': 0.0,
            'bus4Pre': 0.0,
            'bus5Pre': 0.0,
            'bus6Pre': 0.0,
            'fx1SendPre': 0.0, //Effect send prefade
            'fx2SendPre': 0.0,
            'fx3SendPre': 0.0,
            'fx4SendPre': 0.0,
            'mainPostL': 0.0, //Main mix out postfade (left)
            'mainPostR': 0.0, //Main mix out postfade (right)
            'monL': 0.0, //Monitor out (left)
            'monR': 0.0, //Monitor out (right)
        }
        let i = 4;
        Object.keys(levels).forEach((key) => {
            let value = thisBuffer.readIntLE(i, 2); //Convert the two bytes into a signed int
            value = value / 256; //Convert to float as decibels
            if (!this.decibels) value = this.dbToPercentage(value);
            levels[key] = value;
            i = i + 2; //Increment by two bytes for the next one
        });
        return levels;
    }

    protected async pause(pauseMs: number) {
        return new Promise(resolve => setTimeout(resolve, pauseMs));
    }

    protected normaliseColor(sourceColor: number) {
        // The X32 colors are offset by 8
        if (this.mixerKey === 'X32') {
            if (sourceColor > 7) {
                return sourceColor - 8;
            }
            return sourceColor + 8;
        }
        return sourceColor;
    }

}


export type MixerModel = 'XR12' | 'XR16' | 'XR18' | 'X32';

export interface IMixerState {
    model: MixerModel;
    channels: {
        [key: number]: {
            name?: string;
            color?: string;
            on?: boolean;
        };
    };
    buses: {
        [key: number]: {
            name?: string;
            color?: string;
            channels: {
                [key: number]: {
                    level: number;
                };
            };
        };
    };
}
