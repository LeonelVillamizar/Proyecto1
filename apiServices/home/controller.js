const express = require('express');
const router = express.Router();

const pool = require('../../src/services/database/database');
const { isLoggedIn } = require('../auth/auth');


router.get('/', isLoggedIn, async (req, res) => {
    console.log("entra a la raiz");
    res.render('/', { mostrar: mod, tiposede });
});

router.get('/home', isLoggedIn, async (req, res) => {
    const compania_id = req.user.compania_id;
    console.log("compania", compania_id);
    const user_id = req.user.id;
    res.render('home/dashboard', { mostrar: mod,  });
});


module.exports = router;