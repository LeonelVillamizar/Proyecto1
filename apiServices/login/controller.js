//procedimientos para la autenticación y registro de usuarios

const express = require('express');
const router = express.Router();
const pool = require('../../src/services/database/database');

const passport = require('passport');
// Con isLoggedIn PROTEJO LAS RUTAS
const { isLoggedIn, isNotLoggedIn } = require('../auth/auth');

// SIGNUP
router.get('/signup', isLoggedIn, async(req, res) => {
    const tipo_users = await pool.query('SELECT * FROM tipo_users');
    res.render('auth/signup', { tipo_users });
});

router.post('/signup', passport.authenticate('local.signup', {
    successRedirect: '/users',
    failureRedirect: '/signup',
    failureFlash: true
}));

// SINGIN
router.get('/signin', isNotLoggedIn, (req, res) => {
    // con "layout: false" omito la plantilla por defecto
    title="Loggin";
    res.render('auth/signin', { layout: false, title });
});

router.post('/signin', (req, res, next) => {
    passport.authenticate('local.signin', {
        successRedirect: '/', // define a donde se dirige si todo es correcto
        failureRedirect: '/signin',
        failureFlash: true // para enviar mensajes a la vista
    })(req, res, next);
});

router.get('/logout', isLoggedIn, (req, res) => {
    req.logOut(); // este método es entregado por passport 
    console.log("carlos revisar")
    
    res.redirect('/signin');
});


router.get('/',isLoggedIn, async(req, res) => {
    console.log("entra a la raiz", "carlos");
    const tipo_user = req.user.tipou_id;
    const id_user = req.user.id;
    const compania_id = req.user.compania_id;
    const modulos = await pool.query('SELECT r.module as module , r.id as id, r.system_option as option_name, r.tipo as tipo, r.icon_class as icon_class, r.link  as link   FROM resources as r INNER JOIN resources_users as s on s.resources_id = r.id WHERE s.compania_id=? and s.tipouser_id=? and r.tipo ="modulo" ORDER BY r.order ASC', [compania_id, tipo_user]);
    global.opciones = await pool.query('SELECT r.module as module , r.id as id, r.system_option as option_name, r.tipo as tipo, r.icon_class as icon_class, r.link  as link   FROM resources as r INNER JOIN resources_users as s on s.resources_id = r.id WHERE s.compania_id=? and s.tipouser_id=? and r.tipo ="opcion" ORDER BY r.order ASC', [compania_id, tipo_user]);

    global.mod = [];
    global.tiposede = [];
    const tipo_sede = await pool.query('SELECT c.name,c.responsable, c.id, cu.user_id, cu.principal FROM compania_users AS cu inner join compania AS c on c.id=cu.compania_id WHERE user_id = ? and cu.active = "S" order by user_id desc', [id_user]);
    tiposede = tipo_sede;

    let recorrer = modulos.length;
    for (i = 0; i < recorrer; i++) {
        n_module = modulos[i].module
        icono = modulos[i].icon_class
        option_name = modulos[i].option_name
        const opciones = await pool.query('SELECT r.module as module,r.option_name as name, r.id as id, r.tipo as tipo, r.icon_class as icon_class, r.link  as link   FROM resources as r INNER JOIN resources_users as s on s.resources_id = r.id WHERE s.compania_id=? and s.tipouser_id=? and s.active = "1" and r.tipo ="opcion" and r.module=? ORDER BY r.order ASC', [compania_id, tipo_user, n_module]);
        const newopciones = { option: opciones };
        const newmodule = { modulo: n_module, icono, option_name };
        const objet = Object.assign(newmodule, newopciones);
        mod.push(objet);
    }
    //console.table(mod)
    console.log("carlossss")
    res.render('index', {title:"Inicio",mostrar: mod, tiposede});

});

router.get('/error', async(req, res) => {
    console.log("entra a la raiz");
    res.render('error',{title:"Error"});
});

module.exports = router;