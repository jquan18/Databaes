function log(message) {
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
}

function error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
}

module.exports = {
    log,
    error
};
