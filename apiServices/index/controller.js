const express = require('express');
const router = express.Router();

const pool = require('../../src/services/database/database');

const { isLoggedIn } = require('../auth/auth');


// router.get('/error', async(req, res) => {
//     console.log("entra a la raiz");
//     res.render('error',{title:"Error"});
// });
module.exports = router;