const express = require('express');
const router = express.Router();

const passport = require('../auth/passport');
const pool = require('../../src/services/database/database');
const helpers = require('../auth/helpers');

const { isLoggedIn } = require('../auth/auth');
let title= "Tipo"
router.get('/parametrizacion_listas/list_tipo', isLoggedIn, async(req, res) => {
    
    const tipos = await pool.query('SELECT * from tipo_formato');
    console.log(tipos )
    res.render('parametrizacion_listas/list_tipo', { mostrar: mod, tipos,title });
});

router.get('/parametrizacion_listas/delete/:id', async(req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM tipo_formato WHERE ID = ?', [id]);
    req.flash('success', 'Sede eliminada el tipo');
    res.redirect('/parametrizacion_listas/list_tipo');
});

router.get('/parametrizacion_listas/add_tipo', isLoggedIn, async(req, res) => {

    res.render('parametrizacion_listas/add_tipo', { mostrar: mod});
});

router.post('/parametrizacion_listas/add_tipo', async(req, res, done) => {
    const { nom_tipo } = req.body;
    const newClient = {
        nom_tipo,
    };
    // validar si existe sede
    const rows = await pool.query('SELECT * FROM tipo_formato WHERE nom_tipo = ?', [nom_tipo]);

    if (rows.length > 0) {
        done(null, false, req.flash('message', 'El tipo ingresado ya existe'));
        res.redirect('/parametrizacion_listas/add_tipo');
    } else {

        const result = await pool.query('INSERT INTO tipo_formato SET ? ', newClient);
        req.flash('success', 'Tipo creado exitosamente');
        res.redirect('/parametrizacion_listas/list_tipo');
    }
});

router.get('/parametrizacion_listas/edit_tipo/:id', async(req, res) => {
    const { id } = req.params;
    const tipo = await pool.query('SELECT id, nom_tipo FROM tipo_formato WHERE id = ?', id);
    res.render('parametrizacion_listas/edit_tipo', { tipo: tipo[0], mostrar: mod});
});

router.post('/parametrizacion_listas/edit_tipo/:id', async(req, res) => {
    const { id } = req.params;
    const { nom_tipo } = req.body;
    const newClient = {
        nom_tipo,
    };
    console.log(newClient, id)
    await pool.query('UPDATE tipo_formato SET ? WHERE id = ?', [newClient, id]);
    req.flash('success', 'Compañía Actualizada Correctamente');
    res.redirect('/parametrizacion_listas/list_tipo');
});

















router.get('/parametrizacion_listas/list_complejidad', isLoggedIn, async(req, res) => {
    
    const complejidad = await pool.query('SELECT * from complejidad');
    console.log(complejidad )
    res.render('parametrizacion_listas/list_complejidad', { mostrar: mod, complejidad,title });
});

router.get('/parametrizacion_listas/delete_complejidad/:id', async(req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM complejidad WHERE ID = ?', [id]);
    req.flash('success', 'Sede eliminada complejidad');
    res.redirect('/parametrizacion_listas/list_complejidad');
});

router.get('/parametrizacion_listas/delete_tipo/:id', async(req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM tipo_formato WHERE ID = ?', [id]);
    req.flash('success', 'Sede eliminada complejidad');
    res.redirect('/parametrizacion_listas/list_tipo');
});

router.get('/parametrizacion_listas/add_complejidad', isLoggedIn, async(req, res) => {

    res.render('parametrizacion_listas/add_complejidad', { mostrar: mod});
});

router.post('/parametrizacion_listas/add_complejidad', async(req, res, done) => {
    const { nom_complejidad } = req.body;
    const newClient = {
        nom_complejidad,
    };
    // validar si existe sede
    const rows = await pool.query('SELECT * FROM complejidad WHERE nom_complejidad= ?', [nom_complejidad]);

    if (rows.length > 0) {
        done(null, false, req.flash('message', 'La complejidad ingresada ya existe'));
        res.redirect('/parametrizacion_listas/add_complejidad');
    } else {

        const result = await pool.query('INSERT INTO complejidad SET ? ', newClient);
        req.flash('success', 'Complejidad creada exitosamente');
        res.redirect('/parametrizacion_listas/list_complejidad');
    }
});

router.get('/parametrizacion_listas/edit_complejidad/:id', async(req, res) => {
    const { id } = req.params;
    const complejidad = await pool.query('SELECT id, nom_complejidad FROM complejidad WHERE id = ?', id);
    res.render('parametrizacion_listas/edit_complejidad', { complejidad: complejidad[0], mostrar: mod});
});

router.post('/parametrizacion_listas/edit_complejidad/:id', async(req, res) => {
    const { id } = req.params;
    const { nom_complejidad } = req.body;
    const newClient = {
        nom_complejidad,
    };
    console.log(newClient, id)
    await pool.query('UPDATE complejidad SET ? WHERE id = ?', [newClient, id]);
    req.flash('success', 'Compañía Actualizada Correctamente');
    res.redirect('/parametrizacion_listas/list_tipo');
});


module.exports = router;