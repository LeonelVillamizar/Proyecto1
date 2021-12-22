const express = require('express');
const router = express.Router();

const passport = require('../auth/passport');
const pool = require('../../src/services/database/database');
const helpers = require('../auth/helpers');

const { isLoggedIn } = require('../auth/auth');
let title = "Areas"

router.get('/areas', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    const area = await pool.query('SELECT v.id as id, v.vicepresidencia as vice, a.nombre as area, a.id as id_a from vicepresidencias as v INNER JOIN areas as a ON a.id_vicepresidencia = v.id WHERE v.compania_id=?', compania);
    res.render('areas/list', { area, mostrar: mod, tiposede, title });
});

router.get('/areas/add', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    const sedes = await pool.query('SELECT * from compania');
    const consulta = await pool.query('SELECT v.id, v.vicepresidencia FROM vicepresidencias as v WHERE v.compania_id =?', req.user.compania_id);
    res.render('areas/add', { sedes, mostrar: mod, consulta, tiposede, title });
});


router.post('/areas/vice', async (req, res, done) => {
    //Insertar información de la vicepresidencia
    const fecha = Date.now();
    const hoy = new Date(fecha);
    console.log("vice", req.body)
    //LLevar a una lista los elementos pertenecientes al group del repeter
    i = 0
    let list = [];
    for (let [key, valor] of Object.entries(req.body)) {
        let campo = key;
        let posicion = campo.indexOf('vice');

        if (posicion !== -1) {
            list[i] = valor;
            i += 1;
        }
    }
    console.log(list.length)


    //Almacenar las vicepresidencias.
    for (let i = 0; i < list.length; i++) {
        const newVice = {
            vicepresidencia: list[i],
            compania_id: req.user.compania_id
        };
        const campos = await pool.query('INSERT INTO vicepresidencias SET ? ', newVice);
    }


    req.flash('success', 'Vicepresidencia(s) creadas exitosamente');
    res.render('areas/list', { mostrar: mod, title })

});
router.post('/areas/dependencia', async (req, res, done) => {
    //Insertar información del area
    //LLevar a una lista los elementos pertenecientes al group del repeter
    i = 0
    let list = [];
    for (let [key, valor] of Object.entries(req.body)) {
        let campo = key;
        let posicion = campo.indexOf('area');

        if (posicion !== -1) {
            list[i] = valor;
            i += 1;
        }
    }

    //Almacenar las areas.
    for (let i = 0; i < list.length; i += 2) {
        const newArea = {
            id_vicepresidencia: list[i],
            nombre: list[i + 1],
        };
        const campos = await pool.query('INSERT INTO areas   SET ? ', newArea);
    }

    req.flash('success', 'Vicepresidencia(s) creadas exitosamente');
    res.render('areas', { mostrar: mod, title })

});
router.post('/consultar/areas', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    console.log(compania);
    const consulta = await pool.query('SELECT v.id, v.vicepresidencia FROM vicepresidencias as v WHERE v.compania_id =?', req.user.compania_id);

    console.log("carlos tatiana ", consulta)
    console.table(consulta);
    return res.json({ consulta });

});

router.get('/areas/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    console.log(id)
    const compania = req.user.compania_id;
    const Area = await pool.query('select a.id,a.id_vicepresidencia,b.vicepresidencia, a.nombre from areas a inner join vicepresidencias b on a.id_vicepresidencia=b.id where a.id=?', [id] );
    
    const sedes = await pool.query('SELECT * from compania');
    const consulta = await pool.query('SELECT v.id, v.vicepresidencia FROM vicepresidencias as v WHERE v.compania_id =?', req.user.compania_id);
    console.log(Area[0]);
    res.render('areas/edit', { areas:Area[0], sedes, mostrar: mod, consulta, tiposede, title });
    
});

router.post('/areas/viceedit/:id', async (req, res, done) => {
    const { id } = req.params;
    const { nombre, id_vice } = req.body;
    const newVice = {
        vicepresidencia:nombre,
        compania_id: req.user.compania_id
    };  
    const campos = await pool.query('UPDATE vicepresidencias SET ? WHERE id = ?', [newVice, id_vice] );
    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/areas/edit/' +  id);
});

router.post('/areas/edit/:id', async (req, res, done) => {
    const { id } = req.params;
    const { vicepresidencias, depen } = req.body;

    const newArea = {
        nombre: depen,
        id_vicepresidencia : vicepresidencias
    };  
     const campos = await pool.query('UPDATE areas SET ? WHERE id = ?',  [newArea, id]);
    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/areas/edit/' +  id);
});

module.exports = router;