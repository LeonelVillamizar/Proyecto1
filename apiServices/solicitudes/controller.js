const express = require('express');
const router = express.Router();
const moment = require('moment');

const app = express();
const passport = require('passport');
const { upload, s3 } = require("../auth/multer");
const pool = require('../../src/services/database/database');
const title = "Solicitudes";


const { isLoggedIn } = require('../auth/auth');
router.post('/solicitudes/add', isLoggedIn, async (req, res) => {
    let area = req.body.area;
    let proponente = req.body.propuesta;
    let prueba_sugerida = req.body.prueba;
    let id_producto = req.body.producto;
    let id_entidad = req.body.id_sociedad;
    let prioridad = req.body.prioridad;
    let contexto = req.body.contexto;
    let auditoria = req.body.auditoria;
    let id_user = req.user.id;
    let fecha_estado = moment().format('DD/MM/YYYY HH:mm');

    const solicitud = {
        prueba_sugerida,
        id_producto,
        id_entidad,
        area,
        contexto,
        prioridad,
        auditoria,
        id_user,
        proponente,
        auditoria,
        fecha_fin: fecha_estado,
        estado: 1,
    };

    const result = await pool.query('INSERT INTO solicitudes SET ? ', solicitud);
    let id_solicitud = result.insertId;
    let id_tipo_estado_solicitud = 1;
    const estado = {
        id_tipo_estado_solicitud,
        id_solicitud,
        fecha_estado,
    }

    const newestado = await pool.query('INSERT INTO estado_solicitud SET ? ', estado);
    req.flash('success', 'Se ha realizado el registro correctamente');

    res.redirect('/solicitudes/list');
});
router.get('/solicitudes/check/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const solicitud = await pool.query('SELECT tp.nombre as producto, s.fecha_fin, s.informacion_revisado, s.estado as estado, s.id as id, s.prioridad as prioridad, s.contexto as contexto, s.auditoria as auditoria, c.name as sociedad, t.nombre as area, s.proponente as proponente, s.prueba_sugerida as prueba FROM solicitudes as s INNER JOIN compania as c ON c.id = s.id_entidad INNER JOIN tipo_producto as tp ON tp.id=s.id_producto INNER JOIN tipo_area AS t ON t.id = s.area WHERE s.id=?', id);
    let estado = 0;
    const tipo_usuario = req.user.tipou_id;
    let tp_usuario = 0;
    if (tipo_usuario === 1 || tipo_usuario === 2 || tipo_usuario === 4) {
        tp_usuario=1;
    }
    if (parseInt(solicitud[0].estado) != 1) {
        estado = 1;
    }
    console.log(estado)
    const tipo_estado_solicitud = await pool.query('SELECT * FROM tipo_estado_solicitud')
    res.render('solicitudes/check', { mostrar: mod,tp_usuario, solicitud: solicitud[0], estado, tipo_estado_solicitud, title });

});

router.post('/solicitudes/check/:id', async (req, res) => {
    const { id } = req.params;
    if (parseInt(req.body.estado) != 1) {
        const solicitud = await pool.query('SELECT s.id_user,s.id_entidad, s.id_producto,tp.nombre as producto, s.prioridad as prioridad, s.contexto as contexto, s.auditoria as auditoria, c.name as sociedad, t.nombre as area, s.proponente as proponente, s.prueba_sugerida as prueba FROM solicitudes as s INNER JOIN compania as c ON c.id = s.id_entidad INNER JOIN tipo_producto as tp ON tp.id=s.id_producto INNER JOIN tipo_area AS t ON t.id = s.area WHERE s.id=?', id);
        if (parseInt(req.body.estado) == 2) {
            const prueba = {
                radicador: solicitud[0].proponente,
                id_sociedad: solicitud[0].id_entidad,
                id_producto: solicitud[0].id_producto,
                id_user: solicitud[0].id_user,
                fecha_ejecucion: req.body.ejecucion,
                id_solicitud: id,
                estado: req.body.estado,
            }
            const result = await pool.query('INSERT INTO pruebas SET ?', prueba)
        }
        let fecha_estado = moment().format('DD/MM/YYYY HH:mm');

        const estado_solicitud = {
            id_tipo_estado_solicitud: req.body.estado,
            id_solicitud: id,
            fecha_estado
        }
        console.log(estado_solicitud);
        await pool.query('INSERT INTO estado_solicitud SET ?', estado_solicitud)

        let newstate = parseInt(req.body.estado)
        const apdaestado = {
            estado: newstate,
            informacion_revisado: req.body.informacion,
            revisado: "Si",
            fecha_fin: fecha_estado,

        }
        console.log(parseInt(req.body.estado), apdaestado)

        await pool.query('UPDATE solicitudes SET ? WHERE id = ?', [apdaestado, id]);
    }
    req.flash('success', 'Se ha realizado el registro correctamente');
    res.redirect('/solicitudes/list');

});


router.get('/solicitudes/list', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    const user_id = req.user.id;
    const tipo_usuario = req.user.tipou_id;
    let pruebasrad = [];
    console.log(tipo_usuario);
    //tipo_usuario === 1 administrador
    //tipo_usuario === 2 ejecutor
    //tipo_usuario === 4 aprobador
    if ((tipo_usuario === 1) || (tipo_usuario === 2) || (tipo_usuario === 4)) {
        pruebasrad = await pool.query('SELECT PR.id,PR.prueba_sugerida, PR.proponente, PROD.nombre as producto, CIA.name, PR.contexto, PR.prioridad, PR.revisado, te.nombre as estado, PR.fecha_fin, ' +
            'IF(PR.estado="2", "progress-bar bg-success", IF(PR.estado="1","progress-bar bg-warning","progress-bar bg-secundary")) AS clase, ' +
            'IF(PR.prioridad="Alta", "progress-bar bg-success", IF(PR.prioridad="Media", "progress-bar bg-secundary", "progress-bar bg-success")) AS clasePrioridad, ' +
            'IF(PR.prioridad="Baja", "width: 33.3%", IF(PR.prioridad="Media", "width: 66.6%", "width: 100%")) AS porcPrioridad ' +
            'FROM solicitudes AS PR ' +
            'INNER JOIN compania AS CIA ON PR.id_entidad=CIA.id ' +
            'INNER JOIN tipo_estado_solicitud AS te ON te.id=PR.estado ' +
            'INNER JOIN tipo_producto AS PROD ON PR.id_producto=PROD.id');
    } else {
        pruebasrad = await pool.query('SELECT PR.id,PR.prueba_sugerida, PR.proponente, PROD.nombre as producto, CIA.name, PR.contexto, PR.prioridad, PR.revisado, te.nombre as estado, PR.fecha_fin, ' +
            'IF(PR.estado="2", "progress-bar bg-success", IF(PR.estado="1","progress-bar bg-warning","progress-bar bg-secundary")) AS clase, ' +
            'IF(PR.prioridad="Alta", "progress-bar bg-success", IF(PR.prioridad="Media", "progress-bar bg-secundary", "progress-bar bg-success")) AS clasePrioridad, ' +
            'IF(PR.prioridad="Baja", "width: 33.3%", IF(PR.prioridad="Media", "width: 66.6%", "width: 100%")) AS porcPrioridad ' +
            'FROM solicitudes AS PR ' +
            'INNER JOIN compania AS CIA ON PR.id_entidad=CIA.id ' +
            'INNER JOIN tipo_estado_solicitud AS te ON te.id=PR.estado ' +
            'INNER JOIN tipo_producto AS PROD ON PR.id_producto=PROD.id WHERE PR.id_user=?;', user_id);
    }

    res.render('solicitudes/list', { mostrar: mod, title, pruebasrad });
});

router.get('/solicitudes/soportes/:id', async (req, res) => {
    const { id } = req.params;
    console.log(req.params);
    const pruebasrad = await pool.query('SELECT PR.id, PR.prueba_sugerida, PROD.nombre as producto, CIA.name, PR.contexto, PR.prioridad, PR.revisado, PR.estado, PR.informacion_revisado, PR.fecha_fin ' +
        'FROM solicitudes AS PR ' +
        'INNER JOIN compania AS CIA ON PR.id_entidad=CIA.id ' +
        'INNER JOIN tipo_producto AS PROD ON PR.id_producto=PROD.id ' +
        'WHERE PR.id= ?', [id]);
    res.render('solicitudes/soportes', { pruebasrad: pruebasrad[0], title, mostrar: mod });
});

router.get('/solicitudes/edit/:id', async (req, res) => {
    const { id } = req.params;
    //console.log(req.params);
    const pruebasrad = await pool.query('SELECT PR.id, PR.prueba_sugerida, PROD.nombre as producto, CIA.name, PR.contexto, PR.prioridad, PR.revisado, PR.estado, PR.informacion_revisado, PR.fecha_fin ' +
        'FROM solicitudes AS PR ' +
        'INNER JOIN compania AS CIA ON PR.id_entidad=CIA.id ' +
        'INNER JOIN tipo_producto AS PROD ON PR.id_producto=PROD.id ' +
        'WHERE PR.id= ?', [id]);
    res.render('solicitudes/edit', { pruebasrad: pruebasrad[0], title, mostrar: mod });
});

router.get('/solicitudes/add', isLoggedIn, async (req, res) => {
    const compania_id = req.user.compania_id;
    const producto = await pool.query('SELECT * FROM tipo_producto');
    const compania = await pool.query('SELECT * FROM compania');
    const tipo_area = await pool.query('SELECT * FROM tipo_area');

    const user = await pool.query('SELECT * FROM users');
    // console.log("compania", compania);
    const user_id = req.user.id;
    res.render('solicitudes/add', { mostrar: mod, tipo_area, producto, title, compania, user });
});

module.exports = router;