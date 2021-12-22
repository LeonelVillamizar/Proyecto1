//procedimientos para la autenticación y registro de usuarios

const express = require('express');
const router = express.Router();
const pool = require('../../src/services/database/database');

const passport = require('passport');
// Con isLoggedIn PROTEJO LAS RUTAS
const { isLoggedIn, isNotLoggedIn } = require('../auth/auth');

router.get('/informes/newpdl', isLoggedIn, async (req, res) => {
    const title = "Segmentos";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT * FROM formatos');
    const user_id = req.user.id;
    res.render('informes/newpdl', { mostrar: mod, formatos, user_id, title });
});

router.get('/informes/ibe1bs', isLoggedIn, async (req, res) => {
    const title = "IBE 1 BS";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT * FROM formatos');
    const user_id = req.user.id;
    res.render('informes/ibe1bs', { mostrar: mod, formatos, user_id, title });
});

router.get('/informes/ibe2is', isLoggedIn, async (req, res) => {
    const title = "IBE 2 IS";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT * FROM formatos');
    const user_id = req.user.id;
    res.render('informes/ibe2is', { mostrar: mod, formatos, user_id, title });
});

router.get('/informes/ibe4k', isLoggedIn, async (req, res) => {
    const title = "IBE 4 K";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT * FROM formatos');
    const user_id = req.user.id;
    res.render('informes/ibe4k', { mostrar: mod, formatos, user_id, title });
});

router.get('/informes/cashEq', isLoggedIn, async (req, res) => {
    const title = "A Cash & Equi";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT * FROM formatos');
    const user_id = req.user.id;
    res.render('informes/cashEq', { mostrar: mod, formatos, user_id, title });
});
module.exports = router;