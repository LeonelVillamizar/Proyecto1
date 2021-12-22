const express = require('express');
const router = express.Router();

const passport = require('../auth/passport');
const pool = require('../../src/services/database/database');
const helpers = require('../auth/helpers');

const { isLoggedIn } = require('../auth/auth');
let title= "Compañías"
router.get('/compania', isLoggedIn, async(req, res) => {
    const compania = req.user.compania_id;
    const sedes = await pool.query('SELECT * from compania');
    res.render('compania/list', { sedes, mostrar: mod, tiposede,title });
});

router.get('/compania/delete/:id', async(req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM compania WHERE ID = ?', [id]);
    req.flash('success', 'Sede eliminada exitosamente');
    res.redirect('/compania');
});

router.get('/compania/add', isLoggedIn, async(req, res) => {
    res.render('compania/add', { mostrar: mod, tiposede });
});

router.post('/compania/add', async(req, res, done) => {
    const { name, responsable, active } = req.body;
    const newClient = {
        name,
        responsable,
        active
    };
    // validar si existe sede
    const rows = await pool.query('SELECT * FROM compania WHERE name = ?', [name]);

    if (rows.length > 0) {
        done(null, false, req.flash('message', 'La sede ingresada ya existe'));
        res.redirect('/compania/add');
    } else {

        const result = await pool.query('INSERT INTO compania SET ? ', newClient);
        newClient.id = result.insertId;
        req.flash('success', 'Sede creada exitosamente');
        res.redirect('/compania');
    }
});

router.get('/compania/edit/:id', async(req, res) => {
    const { id } = req.params;
    const users = await pool.query('SELECT id, name as nombre,  IF(active =1, "SI", "NO") as active , responsable FROM compania WHERE id = ?', id);
    res.render('compania/edit', { user: users[0], mostrar: mod, tiposede });
});

router.post('/compania/edit/:id', async(req, res) => {
    const { id } = req.params;
    const { nombre, responsable, active } = req.body;
    const newClient = {
        nombre,
        responsable,
        active
    };
    await pool.query('UPDATE compania SET ? WHERE id = ?', [newClient, id]);
    req.flash('success', 'Compañía Actualizada Correctamente');
    res.redirect('/compania');
});


module.exports = router;