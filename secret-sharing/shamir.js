const secrets = require('secrets.js-grempe');

/**
 * Splits a secret into n shares with a threshold of k
 * @param {string} secret - The secret to split (hex string)
 * @param {number} n - Total number of shares
 * @param {number} k - Threshold to reconstruct
 * @returns {Array} - Array of shares
 */
function splitSecret(secret, n, k) {
    const hexSecret = secrets.str2hex(secret);
    const shares = secrets.share(hexSecret, n, k);
    return shares;
}

/**
 * Combines shares to reconstruct the secret
 * @param {Array} shares - Array of shares
 * @returns {string} - Reconstructed secret
 */
function combineShares(shares) {
    const hexSecret = secrets.combine(shares);
    const secret = secrets.hex2str(hexSecret);
    return secret;
}

module.exports = {
    splitSecret,
    combineShares
};
