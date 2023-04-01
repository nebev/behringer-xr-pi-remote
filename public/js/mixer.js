let socket;
let MixerState = {
    channels: {},
    buses: {},
};
const UserState = {
    selectedBus: null,
};



document.addEventListener('alpine:init', () => {
    Alpine.store('mixerState', MixerState);
    Alpine.store('userState', UserState);

    socket = io();
    console.log('Enabling sockets');
    socket.on('mixerState', (mixerState) => {
        console.log('Mixer State: ', mixerState);
        MixerState = mixerState;
        Alpine.store('mixerState', MixerState);
    });
    socket.on('meters', (meters) => {
        Alpine.store('meters', meters);
    });

});


/* Generic functions */
function debounce(func, timeout = 300) {
    console.log('DB');
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const elem = document.documentElement;
function openFullscreen() {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}

function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
}


/* Update Volume functions */
let updateBusVolumeValue;
const sendBusVolumeChange = debounce(() => {
    const { bus, channel, volume } = updateBusVolumeValue;
    console.log(`Updating bus ${bus} channel ${channel} volume to ${volume}`);
    socket.emit('updateBusVolume', updateBusVolumeValue);
    updateBusVolumeValue = null;
}, 250);


/**
 * Debounce the updateBusVolume function to prevent spamming the server
 */
function updateBusVolumeDB(bus, channel, volume) {
    updateBusVolumeValue = { bus, channel, volume };
    sendBusVolumeChange(); // Debounced
}

setInterval(() => {
    if (!document.hidden && socket && UserState.selectedBus && !updateBusVolumeValue) {
        console.log(`Requesting Bus Volumes`);
        socket.emit('getBusVolumes', UserState.selectedBus);
    }
}, 10000);
