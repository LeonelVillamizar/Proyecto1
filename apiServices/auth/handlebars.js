const { format } = require('timeago.js');
const helpers = {};
const pool = require('../../src/services/database/database');


helpers.timeago = (timestamp) => {
    return format(timestamp);
};


module.exports = helpers;