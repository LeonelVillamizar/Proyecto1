const express = require('express');
const router = express.Router();

const passport = require('../auth/passport');
const pool = require('../../src/services/database/database');
const helpers = require('../auth/helpers');

const { isLoggedIn } = require('../auth/auth');

router.get('/users', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    const usuarios = await pool.query('SELECT u.id AS id, IF(u.active=1,"Activo","Inactivo") as estado, u.number_id AS number_id, u.name AS name, u.compania_id as compania_id, u.username AS username, u.lastname AS lastname, t.name As tipo_users, c.name AS sede FROM users AS u INNER JOIN tipo_users AS t ON t.id = u.tipou_id INNER JOIN compania AS c ON c.id = u.compania_id');
    res.render('users/list', { usuarios, mostrar: mod, tiposede });
});

router.get('/users/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM users WHERE ID = ?', [id]);
    } catch (e) {

        req.flash('message', 'No se puede puede eliminar el usuario seleccionado');
        res.redirect('/users');
        // Si ocurrió un error, manéjalo
        return
    }
    console.log("eliminó");
    req.flash('success', 'Usuario eliminado exitosamente'); // Siempre cierra el recurso
    res.redirect('/users');
});


router.get('/users/add', isLoggedIn, async (req, res) => {
    const tipousuarios = await pool.query('SELECT * from tipo_users');
    const sede = await pool.query('SELECT * FROM compania');

    res.render('users/add', { tipousuarios, sede, mostrar: mod, tiposede });
});


router.post('/users/add', async (req, res, done) => {
    const { number_id, username, name, lastname, area_id, password, tipou_id, compania,estado } = req.body;
    const newUsers = {
        number_id,
        name,
        username,
        lastname,
        password,
        area_id,
        tipou_id,
        active: estado,
        compania_id: compania
    };
    // validar si el usuario existe con nùmero de cedula
    const rows = await pool.query('SELECT * FROM users WHERE number_id = ?', [number_id]);

    if (rows.length > 0) {
        done(null, false, req.flash('message', 'El número de cédula ingresada ya existe'));
        res.redirect('/users/add');
    } else {
        newUsers.password = await helpers.encryptPassword(password);
        console.log(newUsers);
        const result = await pool.query('INSERT INTO users SET ? ', newUsers);
        newUsers.id = result.insertId;
        req.flash('success', 'Empleado creado exitosamente');
        res.redirect('/users');
    }
});


router.get('/users/edit/:id', async (req, res) => {
    const { id } = req.params;
    const users = await pool.query('SELECT id, number_id, name, lastname, area, username, password, compania_id,tipou_id, IF(active=1,"Activo","Inactivo") as n_estado, active as estado FROM users WHERE ID = ?', [id]);
    const tusers = await pool.query('SELECT t.id as id, t.name as name FROM tipo_users AS t INNER JOIN users AS u ON u.tipou_id  = t.id where  u.id =?', [id]);
    const tipo_users = await pool.query('SELECT * FROM tipo_users');
    const tsede = await pool.query('SELECT t.id as id, t.name FROM compania AS t INNER JOIN users AS u ON u.compania_id = t.id where u.id =?', [id]);
    const tipo_sede = await pool.query('SELECT * FROM compania');
    console.log(tsede);
    res.render('users/edit', { user: users[0], tipo_users, tusers: tusers[0], tipo_sede, tsede: tsede[0], mostrar: mod, tiposede });
});

router.post('/users/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { number_id, username, password, name, lastname, area, tipo_id = '1', estado, tipou_id, compania_id } = req.body;
    if (req.body.password == "") {
        const newuser = {
            number_id,
            name,
            username,
            lastname,
            area,
            tipou_id,
            compania_id,
            active: estado,
        };
        console.log("la contraseña vacia", newuser);
        await pool.query('UPDATE users SET ? WHERE id = ?', [newuser, id]);
        req.flash('success', 'Usuario Actualizado Correctamente');
        res.redirect('/users');
    } else {
        const newuser = {
            number_id,
            name,
            username,
            lastname,
            area,
            tipou_id,
            compania_id,
            password,
            active: estado,
        };
        newuser.password = await helpers.encryptPassword(password);
        console.log("la contraseña no es vacìa", newuser);
        await pool.query('UPDATE users SET ? WHERE id = ?', [newuser, id]);
        req.flash('success', 'Usuario Actualizado Correctamente');
        res.redirect('/users');
    }
});

// passport.serializeUser((user, done) => {
//     done(null, user.id);
// });

module.exports = router;