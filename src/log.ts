if (!process.env.LOGGER_LEVEL) {
    process.env.LOGGER_LEVEL = 'debug';
}

export const logger = {
    info: (...text) => {
        console.log(`\x1b[36m${(new Date().toISOString())}\x1b[0m`, ...text);
    },
    log: (...text) => {
        console.log(`\x1b[36m${(new Date().toISOString())}\x1b[0m`, ...text);
    },
    warn: (...text) => {
        console.warn(`\x1b[33m${(new Date().toISOString())}\x1b[0m WARN:`, ...text);
    },
    error: (...text) => {
        console.error(`\x1b[31m${(new Date().toISOString())}\x1b[0m ERROR:`, ...text);
    },
    debug: (...text) => {
        if (['debug', 'silly'].includes(process.env.LOGGER_LEVEL)) {
            console.log(`\x1b[34m${(new Date().toISOString())}\x1b[0m`, ...text);
        }
    },
    silly: (...text) => {
        if (['silly'].includes(process.env.LOGGER_LEVEL)) {
            console.log(`\x1b[35m${(new Date().toISOString())}\x1b[0m`, ...text);
        }
    },
};
