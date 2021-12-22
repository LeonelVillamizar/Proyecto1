const bcrypt = require('bcryptjs');
const pool = require('../../src/services/database/database');
const moment = require('moment');
const helpers = {};
const hb = require('handlebars');
helpers.encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
};

helpers.matchPassword = async (password, savedPassword) => {
    try {
        return await bcrypt.compare(password, savedPassword);
    } catch (e) {
        console.log(e)
    }
};

hb.registerHelper('dateFormat', function (date, options) {
    const formatToUse = (arguments[1] && arguments[1].hash && arguments[1].hash.format) || "DD/MM/YYYY"
    return moment(date).format(formatToUse);
});
hb.registerHelper('dateNow', () => {
    return new Date();
});
hb.registerHelper('FormatNumber', (num) => {
    return formatNumber.new(num);
});
module.exports = helpers;

// consulta los precios en la BD