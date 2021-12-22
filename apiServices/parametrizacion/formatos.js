const express = require('express');
const router = express.Router();
const app = express();

const moment = require('moment');
const passport = require('../auth/passport');
const pool = require('../../src/services/database/database');
const helpers = require('../auth/helpers');
const request = require('request');

const { isLoggedIn } = require('../auth/auth');
const { upload, s3 } = require('../cargar/controllerNube');
const { IdentityStore } = require('aws-sdk');
const title = "Formatos";
const multer = require('multer');
let Rutatemp = "./resources/static/assets/uploads/";
const { database } = require('../../src/services/database/keys');
var csv2 = require('csv');

const fs = require("fs");
const path = require("path");
const { getDefaultSettings } = require('http2');
const { isNull } = require('util');

// const app = express();

//CREACIÓN Y EDICIÓN DE FORMATOS
router.get('/parametrizacion/formatos', isLoggedIn, async (req, res) => {
    const vicepresidencias = await pool.query('SELECT * FROM vicepresidencias');
    const formatos = await pool.query('SELECT * FROM formatos');

    res.render('parametrizacion/formatos', { mostrar: mod, title, vicepresidencias, formatos })
});

router.post('/parametrizacion/formatos', async (req, res, done) => {
    //Insertar información para la creación del formato
    const fecha = Date.now();
    const hoy = new Date(fecha)
    console.log(req.body);
    const { nombre, periodicidad, cruce_balance, cruce_formato, descripcion, vicepresidencias, area, identificador, rango, nombre_hoja } = req.body;
    const newClient = {
        nombre: nombre,
        periodicidad: periodicidad,
        cruce_balance: cruce_balance,
        cruce_formato: cruce_formato,
        id_vicepresidencia: vicepresidencias,
        id_area: area,
        estado: 'Activo',
        identificador: identificador.replace(/ /g, ""),
        descripcion: descripcion,
        estado_proceso: 'Por radicar',
        fecha: hoy,
        rango: rango,
        nombre_hoja: nombre_hoja
    };

    const result = await pool.query('INSERT INTO formatos SET ? ', newClient);
    newClient.id = result.insertId;

    var sql = "CREATE TABLE IF NOT EXISTS fto_" + identificador.replace(/ /g, "") + " (id BIGINT AUTO_INCREMENT PRIMARY KEY, periodo VARCHAR(45))";

    pool.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table created", result.affectedRows);
    });
    req.flash('message', 'Formato creado exitosamente');

    res.redirect('/parametrizacion/list');
});

router.get('/parametrizacion/list', isLoggedIn, async (req, res) => {
    const title = "Lista Formatos";

    const compania = req.user.compania_id;
    const formatos = await pool.query('SELECT id, nombre, periodicidad, cruce_balance, cruce_formato, estado, ' +
        'fecha, descripcion, id_area, id_vicepresidencia, estado_proceso, identificador FROM formatos;');
    const user_id = req.user.id;

    res.render('parametrizacion/list', { mostrar: mod, formatos, user_id, title });
});

router.get('/parametrizacion/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const formato = await pool.query('SELECT F.id, V.id as id_vicepresidencia, V.vicepresidencia, A.nombre AS area, A.id as id_area, F.nombre, F.periodicidad, F.cruce_balance, ' +
        'F.cruce_formato, F.estado, F.fecha, F.descripcion, F.identificador, F.rango, F.nombre_hoja FROM formatos AS F ' +
        'INNER JOIN vicepresidencias AS V ON V.id=F.id_vicepresidencia ' +
        'INNER JOIN areas AS A ON A.id=F.id_area ' +
        'WHERE F.id=?', [id]);
    const vicepresidencias = await pool.query('SELECT * FROM vicepresidencias');

    res.render('parametrizacion/edit', { mostrar: mod, title, formato: formato[0], vicepresidencias })
});

router.post('/parametrizacion/edit/:id', async (req, res, done) => {
    const { id } = req.params;
    console.log(req.body);
    const { nombre, periodicidad, cruce_balance, cruce_formato, estado, fecha, descripcion, vicepresidencias, area, rango, nombre_hoja } = req.body;

    const editFormat = {
        nombre,
        periodicidad,
        cruce_balance,
        cruce_formato,
        estado,
        fecha,
        descripcion,
        id_vicepresidencia: vicepresidencias,
        id_area: area,
        rango: rango,
        nombre_hoja: nombre_hoja
    };

    const result3 = await pool.query('UPDATE formatos SET ? WHERE id= ?', [editFormat, id]);
    res.redirect('/parametrizacion/edit/' + [id]);
});

//CREACIÓN Y EDICIÓN DE VALIDACIONES OBLIGATORIAS
router.get('/parametrizacion/campos/:id', isLoggedIn, async (req, res) => {
    const title = "Campos"
    const { id } = req.params;
    const campos = await pool.query('SELECT * FROM campos WHERE id_formato=?', id);

    res.render('parametrizacion/campos', { mostrar: mod, title, campos, id })
});

router.get('/parametrizacion/validaciones/:id', isLoggedIn, async (req, res) => {
    const title = "Validaciones"
    let id = req.params.id;
    const ver_cruces = await pool.query('SELECT if(cruce_balance="Si",1,0) cruce_puc_lib, if(cruce_formato="Si",1,0) cruce_form FROM formatos a inner join campos b on a.id=b.id_formato where b.id=?', [id]);
    const lista_formatos = await pool.query('SELECT * FROM formatos');
    const tipo_libro = await pool.query('SELECT * FROM tipo_libro');
    const layout = await pool.query('SELECT * FROM layouts');
    const id_formato = await pool.query('SELECT id_formato FROM campos WHERE id=?', [id]);
    const info_campo = await pool.query('SELECT * FROM campos WHERE id=?', [id]);
    const info_campo_list = await pool.query('SELECT * FROM campos WHERE id_formato=?', [id_formato[0].id_formato]);
    const cruces = await pool.query('SELECT VC.id, VC.id_tipo_libro AS id_tipo_libro, TL.nombre AS nombre_libro, VC.nro_cuenta, ' +
        'L.id AS id_layout, L.nombre AS nombre_layout, C.id AS id_campo_concepto, C.nombre AS campo_concepto, VC.concepto, ' +
        'IF(VC.nro_cuenta=0,"disabled","") AS disabled_cta, IF(VC.id_layout<>0,"","disabled") AS disabled_nodo ' +
        'FROM validaciones_cruce_contable AS VC ' +
        'LEFT JOIN tipo_libro AS TL ON TL.id=VC.id_tipo_libro ' +
        'LEFT JOIN campos AS C ON C.id=VC.id_campo_concepto ' +
        'LEFT JOIN layouts AS L ON L.id=VC.id_layout WHERE VC.id_campo=?', [id]);
    const cruce_formatos = await pool.query('SELECT V.id, C.id AS id_campo_concepto, C.nombre AS campo_concepto, V.concepto, V.ciclo, ' +
        'F.id AS id_formato_cruce, F.nombre AS formato_cruce, C_concepto.id AS id_campo_concepto_cruce, C_concepto.nombre AS campo_concepto_cruce, ' +
        'C_concepto2.id AS id_campo_valor_cruce, C_concepto2.nombre AS campo_valor_cruce, V.concepto_cruce ' +
        'FROM validaciones_cruce_formatos AS V ' +
        'LEFT JOIN campos AS C ON V.id_campo_concepto=C.id ' +
        'LEFT JOIN campos AS C_concepto ON V.id_campo_concepto_cruce=C_concepto.id ' +
        'LEFT JOIN campos AS C_concepto2 ON V.id_campo_valor_cruce=C_concepto2.id ' +
        'LEFT JOIN formatos AS F ON V.id_formato_cruce=F.id WHERE V.id_campo_valor=?', [id]);

    const user_id = req.user.id;
    const nodos = await pool.query('SELECT L.id as id_nodo, L.nombre as nombre FROM layouts AS L');
    let new_cruce_contable = [];
    for (i = 0; i < cruces.length; i++) {
        let id = cruces[i].id;
        let id_tipo_libro = cruces[i].id_tipo_libro;
        let nombre_libro = cruces[i].nombre_libro;
        let nro_cuenta = cruces[i].nro_cuenta;
        let id_layout = cruces[i].id_layout;
        let nombre_layout = cruces[i].nombre_layout;
        let id_campo_concepto = cruces[i].id_campo_concepto;
        let campo_concepto = cruces[i].campo_concepto;
        let concepto = cruces[i].concepto;
        let disabled_cta = cruces[i].disabled_cta;
        let disabled_nodo = cruces[i].disabled_nodo;
        const objet1 = { id, id_tipo_libro, nombre_libro, nro_cuenta, id_layout, nombre_layout, id_campo_concepto, campo_concepto, concepto, disabled_cta, disabled_nodo, layout, info_campo_list, tipo_libro };
        new_cruce_contable.push(objet1);
    }
    let objeto_cruces = [layout, info_campo_list, cruces];
    cruces: new_cruce_contable;

    let new_cruce_formatos = [];
    for (i = 0; i < cruce_formatos.length; i++) {
        let id = cruce_formatos[i].id;
        let id_campo_concepto = cruce_formatos[i].id_campo_concepto;
        let campo_concepto = cruce_formatos[i].campo_concepto;
        let concepto = cruce_formatos[i].concepto;
        let ciclo = cruce_formatos[i].ciclo;
        let id_formato_cruce = cruce_formatos[i].id_formato_cruce;
        let formato_cruce = cruce_formatos[i].formato_cruce;
        let id_campo_concepto_cruce = cruce_formatos[i].id_campo_concepto_cruce;
        let campo_concepto_cruce = cruce_formatos[i].campo_concepto_cruce;
        let id_campo_valor_cruce = cruce_formatos[i].id_campo_valor_cruce;
        let campo_valor_cruce = cruce_formatos[i].campo_valor_cruce;
        let concepto_cruce = cruce_formatos[i].concepto_cruce;
        const objet1 = { id, id_campo_concepto, campo_concepto, concepto, ciclo, id_formato_cruce, formato_cruce, id_campo_concepto_cruce, campo_concepto_cruce, id_campo_valor_cruce, campo_valor_cruce, concepto_cruce, info_campo_list, lista_formatos };
        new_cruce_formatos.push(objet1);
    }
    let objet1 = [lista_formatos, cruce_formatos, info_campo_list];

    res.render('parametrizacion/validaciones', { mostrar: mod, id, layouts: layout, nodos, tipo_libro, cruces, lista_formatos, cruce_formatos, info_campo_list, info_campo: info_campo[0], ver_cruces: ver_cruces[0], user_id, title, new_cruce_contable, new_cruce_formatos });

});

router.post('/parametrizacion/pregunta/consultar/campos', isLoggedIn, async (req, res) => {
    var id_campo = req.body.array;
    var idcampo = JSON.parse(id_campo);
    console.log(idcampo);
    const consulta_campo = await pool.query('SELECT id AS id_campo, nombre FROM campos WHERE id_formato =?', idcampo);
    console.log(consulta_campo);
    return res.json({ consulta_campo });
});

//Crear campos nuevos
router.get('/parametrizacion/add_campo/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    res.render('parametrizacion/add_campo', { mostrar: mod, title, id })
});

router.post('/parametrizacion/add_campo/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;
    //Crear nuevos campos de validación de formatos
    var campos = req.body.campos;
    var camposC = JSON.parse(campos);

    for (let i = 0; i < camposC.length; i += 3) {
        const newCampo = {
            nombre: camposC[i].value.replace(/ /g, ""),
            descripcion: camposC[i + 1].value,
            longitud: camposC[i + 2].value,
            id_formato: id
        };
        const campos = await pool.query('INSERT INTO campos SET ? ', newCampo);
        newCampo.id = campos.insertId;
    }

    //Crear los campos en la tabla
    const identifi = await pool.query('SELECT identificador FROM formatos WHERE id = ? ', [id]);
    let ident = identifi[0].identificador;
    for (let i = 0; i < camposC.length; i += 3) {
        var sql = "ALTER TABLE fto_" + ident + " ADD COLUMN " + camposC[i].value.replace(/ /g, "") + " VARCHAR(" + camposC[i + 2].value + ") NULL";
        pool.query(sql, function (err, result) {
            if (err) throw err;
            console.log("Campo created", result.affectedRows);
        });
    }

    req.flash('success', 'Información actualizada correctamente.');
    //res.redirect('/formatos');
    res.redirect('/parametrizacion/add_campo/' + id);
});

//Crear validaciones y actualizar información del campo
router.post('/parametrizacion/validaciones/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    //Actualizar información general de los campos
    var general = req.body.general;
    var generalC = JSON.parse(general);

    const newClient = {
        nombre: generalC[0].value.replace(/ /g, ""),
        descripcion: generalC[1].value,
        longitud: generalC[2].value,
    };
    //Actualizar la tabla campos
    const nombre_identificador = await pool.query('SELECT F.identificador, C.nombre FROM campos AS C ' +
        'INNER JOIN formatos AS F ON F.id=C.id_formato ' +
        'WHERE C.id=?', [id]);

    const result = await pool.query('UPDATE campos SET ? WHERE id = ?', [newClient, id]);
    //Modicar campos de la tabla
    const result2 = await pool.query('ALTER TABLE fto_' + nombre_identificador[0].identificador + ' CHANGE `' + nombre_identificador[0].nombre + '` `' + generalC[0].value.replace(/ /g, "") + '` VARCHAR(' + generalC[2].value + ')');

    //XXXXXXXXX ALTER TABLE CUANDO CAMBIA EL NOMBRE DE LOS CAMPOS XXXXXXXX
    //Crear los nuevos campos de validaciones obligatorias
    const id_formato = await pool.query('SELECT id_formato FROM campos WHERE id = ? ', [id]);
    let id_form = id_formato[0].id_formato;

    //Crear nuevos campos de validaciones de cruce
    var cruce = req.body.cruce;
    var cruceC = JSON.parse(cruce);
    let nro_cta = 0;
    let nod = 0;
    let nombre_cruce = '';
    console.log('cruceC',cruceC);
    for (let i = 0; i < cruceC.length; i += 4) {
        if (cruceC[i].value !== 'Seleccione...' && cruceC[i].value !== '') {
            console.log('entro',cruceC[i].value);
            nombre_cruce = cruceC[i + 1].name;
            if (nombre_cruce.indexOf('nodo') > 0) {
                nro_cta = 0;
                nod = cruceC[i + 1].value;
            }
            else {
                nro_cta = cruceC[i + 1].value;
                nod = 0;
            }

            const newClient4 = {
                id_tipo_libro: cruceC[i].value,
                nro_cuenta: nro_cta,
                id_campo: id,
                id_formato: id_form,
                id_layout: nod,
                id_campo_concepto: cruceC[i + 2].value,
                concepto: cruceC[i + 3].value
            };
        
            const campos = await pool.query('INSERT INTO validaciones_cruce_contable SET ? ', newClient4);
            newClient4.id = campos.insertId;
            console.log(newClient4);
        }
    }

    //Actualizar campos de validaciones de cruce
    var cruce_edit = req.body.cruce_edit;
    var cruceC_edit = JSON.parse(cruce_edit);

    let nombre_cruce_edit = '';
    for (let i = 0; i < cruceC_edit.length; i += 5) {
        nombre_cruce_edit = cruceC_edit[i + 2].name;
        if (nombre_cruce_edit.indexOf('nodo') > 0) {
            nro_cta = 0;
            nod = cruceC_edit[i + 2].value;
        }
        else {
            nro_cta = cruceC_edit[i + 2].value;
            nod = 0;
        }

        const newClient5 = {
            id_tipo_libro: cruceC_edit[i + 1].value,
            nro_cuenta: nro_cta,
            id_campo: id,
            id_formato: id_form,
            id_layout: nod,
            id_campo_concepto: cruceC_edit[i + 3].value,
            concepto: cruceC_edit[i + 4].value
        };
        const validaciones = await pool.query('UPDATE validaciones_cruce_contable SET ? WHERE id = ?', [newClient5, cruceC_edit[i].value]);

    }

    //Crear nuevos campos de validación de formatos
    var formatos = req.body.formatos;
    var formatosC = JSON.parse(formatos);

    for (let i = 0; i < formatosC.length; i += 7) {
        if (formatosC[i].value !== 'Seleccione...') {
            const newClient6 = {
                id_formato:id_form,
                id_campo_valor: id,
                id_campo_concepto: formatosC[i].value,
                concepto: formatosC[i + 1].value,
                ciclo: formatosC[i + 2].value,
                id_formato_cruce: formatosC[i + 3].value, 
                id_campo_concepto_cruce: formatosC[i + 4].value,
                concepto_cruce: formatosC[i + 5].value,
                id_campo_valor_cruce: formatosC[i + 6].value,
                id_campo_concepto: id
            };

            const campos = await pool.query('INSERT INTO validaciones_cruce_formatos SET ? ', newClient6);
            newClient6.id = campos.insertId;
        }
    }

    //Actualizar campos de validación de formatos
    var formatos_edit = req.body.formatos_edit;
    var formatosC_edit = JSON.parse(formatos_edit);
    console.log('formatosC_edit', formatosC_edit);

    for (let i = 0; i < formatosC_edit.length; i += 8) {
        if (formatosC_edit[i + 6].value !== 'Seleccione...') {
            console.log('value formatos edit', formatosC_edit[i + 1].value);
            const newClient7 = {
                id_formato: id_form,
                id_campo_concepto: formatosC_edit[i + 1].value,
                id_campo_valor: id,
                concepto: formatosC_edit[i + 2].value,
                ciclo: formatosC_edit[i + 3].value,
                id_formato_cruce: formatosC_edit[i + 4].value,
                id_campo_concepto_cruce: formatosC_edit[i + 5].value,
                concepto_cruce: formatosC_edit[i + 6].value,
                id_campo_valor_cruce: formatosC_edit[i + 7].value
            };
            console.log('newClient7', newClient7);
            const validaciones = await pool.query('UPDATE validaciones_cruce_formatos SET ? WHERE id = ?', [newClient7, formatosC_edit[i].value]);
        }
    }

    req.flash('success', 'Información actualizada correctamente.');
    //res.redirect('/formatos');
    res.redirect('/parametrizacion/list');
});

//Eliminar formato
router.get('/parametrizacion/formatos/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const identificador = await pool.query('SELECT identificador FROM formatos WHERE id = ? ', [id]);
    let identi = identificador[0].identificador;
    var sql = "DROP TABLE IF EXISTS fto_" + identi;
    pool.query(sql, function (err, result) {
        if (err) throw err;
        console.log("Table deleted", result.affectedRows);
    });
    const campos = await pool.query('DELETE FROM campos WHERE id_formato = ? ', [id]);
    const validaciones_obligatorias = await pool.query('DELETE FROM validaciones_obligatorias WHERE id_formato = ? ', [id]);
    const validaciones_cruce_contable = await pool.query('DELETE FROM validaciones_cruce_contable WHERE id_formato = ? ', [id]);
    const validaciones_cruce_formatos = await pool.query('DELETE FROM validaciones_cruce_formatos WHERE id_formato = ? ', [id]);
    const formatos = await pool.query('DELETE FROM formatos WHERE id = ? ', [id]);

    req.flash('success', 'Se elimino correctamente el formato.');
    res.redirect('/parametrizacion/list');
});

//Eliminar campo
router.get('/parametrizacion/campos/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const identificador = await pool.query('SELECT F.identificador FROM campos AS C INNER JOIN formatos AS F ON F.id=C.id_formato WHERE C.id = ? ', [id]);
    let identif = identificador[0].identificador;
    const camp = await pool.query('SELECT * FROM campos WHERE id = ? ', [id]);
    let campo = camp[0].nombre;

    var sql2 = "ALTER TABLE  fto_" + identif + " DROP " + campo;
    pool.query(sql2, function (err, result) {
        if (err) throw err;
        console.log("Campo deleted", result.affectedRows);
    });
    const campos = await pool.query('DELETE FROM campos WHERE id = ? ', [id]);
    const validaciones_obligatorias = await pool.query('DELETE FROM validaciones_obligatorias WHERE id_campo = ? ', [id]);
    const validaciones_cruce_contable = await pool.query('DELETE FROM validaciones_cruce_contable WHERE id_campo = ? ', [id]);
    const validaciones_cruce_formatos = await pool.query('DELETE FROM validaciones_cruce_formatos WHERE id_campo = ? ', [id]);

    req.flash('success', 'Se elimino correctamente el formato.');
    res.redirect('/parametrizacion/campos/' + camp[0].id_formato);
});

//ELiminar validación obligatoria
router.get('/parametrizacion/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const idcampos = await pool.query('SELECT id_campo FROM validaciones_obligatorias WHERE id = ? ', [id]);
    let idcampo = idcampos[0].id_campo;
    const result = await pool.query('DELETE FROM validaciones_obligatorias WHERE id = ? ', [id]);
    req.flash('success', 'Se elimino correctamente la parametrización de la validación obligatoria.');
    res.redirect('/parametrizacion/validaciones/' + idcampo);
});

//Eliminar validación de cruce contable
router.get('/parametrizacion/delete_cruce/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const idcampos = await pool.query('SELECT id_campo FROM validaciones_cruce_contable WHERE id = ? ', [id]);
    let idcampo = idcampos[0].id_campo;
    const result = await pool.query('DELETE FROM validaciones_cruce_contable WHERE id = ? ', [id]);
    req.flash('success', 'Se elimino correctamente la parametrización de la validación de cruce.');
    res.redirect('/parametrizacion/validaciones/' + idcampo);
});

//Eliminar validación de cruce entre formatos
router.get('/parametrizacion/delete_cruce_formato/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const idcampos = await pool.query('SELECT id_campo_valor FROM validaciones_cruce_formatos WHERE id = ? ', id);
    console.log(idcampos);
    let idcampo = idcampos[0].id_campo_valor;
    const result = await pool.query('DELETE FROM validaciones_cruce_formatos WHERE id = ? ', [id]);
    req.flash('success', 'Se elimino correctamente la parametrización de la validación de cruce entre formatos.');
    res.redirect('/parametrizacion/validaciones/' + idcampo);
});

router.get('/parametrizacion/detalle/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const formatos = await pool.query('SELECT * FROM formatos WHERE id= ?', [id]);
    const campos = await pool.query('SELECT * FROM campos WHERE id_formato= ?', [id]);
    const area = await pool.query('SELECT b.nombre FROM formatos a inner join areas b on a.id_area=b.id WHERE a.id= ?', [id]);
    const vise = await pool.query('SELECT d.vicepresidencia FROM formatos c inner join vicepresidencias d on c.id_vicepresidencia=d.id WHERE c.id= ?', [id]);
    const validaciones = await pool.query('SELECT * FROM validaciones_obligatorias WHERE id_formato=?', [id]);
    const validaciones_cruce = await pool.query('SELECT V.puc_libro, V.nro_cuenta, C.nombre FROM validaciones_cruce_contable AS V INNER JOIN campos AS C ON C.id=V.id_campo WHERE V.id_formato=?', [id]);
    const validaciones_cruce_formatos = await pool.query('SELECT F.nombre AS formato_cruce, CC.nombre AS campo_cruce, V.umbral, V.ciclo FROM validaciones_cruce_formatos AS V ' +
        'INNER JOIN campos AS C ON C.id=V.id_campo ' +
        'INNER JOIN campos AS CC ON CC.id=V.id_campo_cruce ' +
        'INNER JOIN formatos AS F ON F.id=V.id_formato_cruce WHERE V.id_formato=?', [id]);
    const user_id = req.user.id;
    res.render('parametrizacion/detalle', { mostrar: mod, formato: formatos[0], validaciones, validaciones_cruce_formatos, areas: area[0], vises: vise[0], campos, user_id, title, validaciones_cruce });
});

//Consultar áreas según selección de vicepresidencias
router.post('/parametrizacion/pregunta/consultar/areas', isLoggedIn, async (req, res) => {
    var id_area = req.body.array;
    var idarea = JSON.parse(id_area);
    const consulta = await pool.query('SELECT a.id as id_area, a.nombre as nombre FROM areas as a INNER JOIN vicepresidencias as v ON v.id = a.id_vicepresidencia WHERE a.id_vicepresidencia =?', idarea);
    return res.json({ consulta });
});

//Asignación de usuarios
router.get('/parametrizacion/asignarusuarios/:id', isLoggedIn, async (req, res) => {
    const title = "Lista Formatos";
    const { id } = req.params;
    const id_area1 = id;

    const preparador_env = await pool.query('SELECT b.id, concat_ws(" ", b.name, b.lastname) as persona FROM asignacion_usuario a inner join users b on a.id_preparador=b.id WHERE id_formato =?', id_area1);
    const validador_rev = await pool.query('SELECT b.id, concat_ws(" ", b.name, b.lastname) as persona FROM asignacion_usuario a inner join users b on a.id_validador=b.id WHERE id_formato =?', id_area1);

    const asign_usu = await pool.query('select id, id_formato, id_preparador, id_validador, notas_aclaratorias, date_format(fecha_vencimiento , "%Y-%m-%d") fecha_vencimiento, date_format(fecha_casa_matriz , "%Y-%m-%d") fecha_casa_matriz FROM asignacion_usuario WHERE id_formato= ?', id_area1);

    const usuarios = await pool.query('SELECT id, concat_ws(" ", name, lastname) persona FROM users where active=1');


    res.render('parametrizacion/asignarusuarios', { mostrar: mod, asign_usu: asign_usu[0], usuarios, preparador_env: preparador_env[0], validador_rev: validador_rev[0], id_area1, title });

});

router.post('/parametrizacion/asignarusuarios/:id_area1', isLoggedIn, async (req, res) => {

    const { id_area1 } = req.params;
    const { id, id_preparador_env, id_validador_rev, notas_aclaratorias, fecha_vencimiento, fecha_casa_matriz, id_formato } = req.body;

    const new_asigna2 = {
        id_formato,
        id_preparador:id_preparador_env,
        id_validador:id_validador_rev,
        notas_aclaratorias,
        fecha_vencimiento,
        fecha_casa_matriz
    };
    if (id != '') {
        //console.log("Entro1");
        const result3 = await pool.query('UPDATE asignacion_usuario SET ? WHERE id_formato= ?', [new_asigna2, id_formato]);

        req.flash('success', 'Se actualizaron los campos');

    } else {
        //console.log("Entro2");
        const campos = await pool.query('INSERT INTO asignacion_usuario SET ? ', new_asigna2);

        req.flash('success', 'Los datos fueron guardados exitosamente');

    };

    const result4 = await pool.query('UPDATE formatos SET estado_proceso="Sin Carga" WHERE id= ?', id_formato);
    const result5 = await pool.query('INSERT INTO estado_formatos (estado, fecha, user_id, formato_id) SELECT ("Sin Carga") estado  , (now()) fecha  , id_preparador user_id, id_formato formato_id  FROM asignacion_usuario WHERE  id_formato= ?', id_formato);
    const preparador_env = await pool.query('SELECT b.id, concat_ws(" ", b.name, b.lastname) as persona FROM asignacion_usuario a inner join users b on a.id_preparador=b.id WHERE id_formato=?', [id_area1]);
    const validador_rev = await pool.query('SELECT b.id, concat_ws(" ", b.name, b.lastname) as persona FROM asignacion_usuario a inner join users b on a.id_validador=b.id WHERE id_formato=?', [id_area1]);
    const asign_usu = await pool.query('SELECT * FROM asignacion_usuario WHERE id_formato=?', [id_area1]);
    const usuarios = await pool.query('SELECT id, concat_ws(" ", name, lastname) persona  FROM users where active=1');
    res.redirect('/parametrizacion/asignarusuarios/' + [id_area1]);
});

//Cargar Contabilidad
router.get('/parametrizacion/cargarpuc', isLoggedIn, async (req, res) => {
    const title = "Cargar contabilidad";
    const fecha = Date.now();
    const hoy = new Date(fecha);
    const user_id = req.user.id;
    var fecha1 = new Date();
    var ano = fecha1.getFullYear();
    var ano_ant = ano - 1;
    var ano_act = ano + 1;
    var ano_act1 = ano + 2;
    var ano_act2 = ano + 3;
    var ano_act3 = ano + 4;
    const info_puc = await pool.query('SELECT * FROM info_puc_libro');
    const usuarios = await pool.query('SELECT id, CONCAT(name, " ", lastname) AS nombre FROM users WHERE id=?', [user_id]);

    //PUC
    // const id_arch = await pool.query('SELECT MAX(id) FROM archivos WHERE puc_libro="PUC"');
    // const archivo_puc = await pool.query('SELECT MAX(id), nombre FROM archivos WHERE puc_libro="PUC"');
    const id_arch = await pool.query('SELECT MAX(id) As id FROM archivos WHERE puc_libro="Balance"');
    const archivo_puc = await pool.query('select id, nombre from reporteocif_dev.archivos where id=(SELECT max(id)FROM archivos WHERE puc_libro="Balance")');
    let archivo_puc_info = [];
    console.log(archivo_puc);
    if (id_arch.length != 0) {
        var id_archivo_puc = id_arch[0].id;
        console.log(id_archivo_puc)
        archivo_puc_info = await pool.query('SELECT * FROM info_puc_libro WHERE id_archivo=?', [id_archivo_puc]);
        console.log('1,' + id_arch)
    }
    else {
        archivo_puc_info = "";
    }
    //LIBRO MAYOR
    const id_arch_libro = await pool.query('SELECT id FROM archivos WHERE puc_libro="Libro mayor"');
    const archivo_libro = await pool.query('SELECT id, nombre FROM archivos WHERE puc_libro="Libro mayor"');
    let archivo_libro_info = [];
    if (id_arch_libro.length != 0) {
        var id_archivo_libro = id_arch_libro[0].id;
        archivo_libro_info = await pool.query('SELECT * FROM info_puc_libro WHERE id_archivo=?', [id_archivo_libro]);
    }
    else {
        archivo_libro_info = "";
    }

    res.render('parametrizacion/cargarpuc', { mostrar: mod, info_puc, user_id, archivo_puc_info: archivo_puc_info[0], archivo_libro_info: archivo_libro_info[0], archivo_puc: archivo_puc[0], archivo_libro: archivo_libro[0], usuario: usuarios[0], hoy, title, ano, ano_ant, ano_act, ano_act1, ano_act2, ano_act3 });
});

let id_archivo = '';
let puc_libro = '';
let periodo_balance = '';
const uploadFile = async (req, res) => {
    // show the uploaded file information
    const user_id = req.user.id;
    let identificador = req.params.id;
    const fecha = Date.now();
    const hoy = new Date(fecha);
    puc_libro = req.body.puc_libromayor
    const { size, bucket, key, acl, originalname, mimetype, location, etag } = req.file;
    let newsize = Math.round((parseInt(size) * 0.00000095367432), 3) + " MB";
    let url = req.file.location

    //Borrar archivo anterior
    const id_archivo_ant = await pool.query('SELECT id FROM archivos WHERE puc_libro=?', [puc_libro]);
    let id_archivo_ant2 = [];
    if (id_archivo_ant != 0) {
        id_archivo_ant2 = id_archivo_ant[0].id_archivo;
        await pool.query('DELETE FROM archivos WHERE puc_libro = ? ', [puc_libro]);
    }
    let tipo_estado_id = 1; // activo 
    // Saving the Image URL in Database
    const newdocumento = {
        key,
        nombre: originalname,
        location,
        bucket,
        mimetype,
        size: newsize,
        acl,
        etag,
        identificador,
        user_id,
        tipo_estado_id,
        puc_libro
    }

    const archivo = await pool.query('INSERT INTO archivos SET ? ', newdocumento);
    newdocumento.id = archivo.insertId;
    id_archivo = newdocumento.id;

    //Guardar datos en la tabla puc_info
    const { periodo, puc_libromayor } = req.body;
    puc_libro = req.body.puc_libromayor
    let mes = req.body.periodo
    let ano = req.body.ano;
    periodo_balance = ano + '-' + mes + '-01';

    // Saving the Image URL in Database
    const newdocumento2 = {
        nro_preliminar: 1,
        fecha_actualizacion: hoy,
        periodo,
        puc_libromayor,
        id_user: user_id,
        id_archivo: id_archivo
    }

    const guardar1 = await pool.query('delete from balance_anterior');
    const puc_info = await pool.query('INSERT INTO info_puc_libro SET ? ', newdocumento2);
    const guardar2 = await pool.query('Insert into balance_anterior (select * from balance)');
    newdocumento2.id = puc_info.insertId;

    Lectura_remota(url);
    req.flash('success', 'El PUC fue cargado exitosamente.');
    res.redirect('/parametrizacion/cargarpuc');
};

var datos = '';
async function Lectura_remota(url) {
    //Leer el archivo
    let csv = '';
    console.log('url: ' + url);
    request.get(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            csv = body;
        };

        csv2.parse(csv, { delimiter: ';', columns: false }, function (err, data) {
            datos = data;
            // console.log("datos: " + datos);
            GuardarDatos(datos);

        });

    })

}

async function GuardarDatos(datos) {
    console.log(datos.length);
    //Almacenar información en la BD
    pool.getConnection(function (err) {
        if (err) throw err;
        pool.query('DELETE FROM balance WHERE periodo = ?', periodo_balance);
        pool.query('TRUNCATE balance_actual');
        var sql = "INSERT INTO balance_actual (cuentas, descripcion, moneda, valor) VALUES ?";
        pool.query(sql, [datos], function (err, result) {
            if (err) throw err;
            pool.query('CALL Comparar_puc_actual_anterior(?,?)', [periodo_balance, id_archivo]);
        });
    });
}

//Mostrar detalle de cambios en el puc
router.get('/parametrizacion/detalle_cambios_puc/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const info_puc = await pool.query('SELECT CONCAT(name, " ", lastname) AS usuario, P.nro_preliminar, P.fecha_actualizacion, P.periodo, P.puc_libromayor FROM info_puc_libro AS P INNER JOIN users AS U ON P.id_user=U.id WHERE id_archivo=?', [id]);
    const detalle_cambios = await pool.query('select * from cambios_puc');
    res.render('parametrizacion/detalle_cambios_puc', { mostrar: mod, detalle_cambios, info_puc: info_puc[0], title });
});

router.get('/parametrizacion/ecuacion_contable/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const info_puc = await pool.query('SELECT CONCAT(name, " ", lastname) AS usuario, P.nro_preliminar, P.fecha_actualizacion, P.periodo, P.puc_libromayor FROM info_puc_libro AS P INNER JOIN users AS U ON P.id_user=U.id WHERE id_archivo=?', [id]);
    const ecuacion_contable = await pool.query('select * from ecuacion_contable');
    res.render('parametrizacion/ecuacion_contable', { mostrar: mod, ecuacion_contable, info_puc: info_puc[0], title });
});


router.post('/parametrizacion/cargarpuc', upload, uploadFile);

//Mostrar datos del PUC
router.get('/parametrizacion/datos_puc/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const info_puc = await pool.query('SELECT CONCAT(name, " ", lastname) AS usuario, P.nro_preliminar, P.fecha_actualizacion, P.periodo, P.puc_libromayor FROM info_puc_libro AS P INNER JOIN users AS U ON P.id_user=U.id WHERE id_archivo=?', [id]);
    const datos_puc = await pool.query('SELECT * FROM balance WHERE id_archivo=?', [id]);
    res.render('parametrizacion/datos_puc', { mostrar: mod, datos_puc, info_puc: info_puc[0], title });
});

//Mostrar datos del libro mayor
router.get('/parametrizacion/datos_libro/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const info_libro = await pool.query('SELECT CONCAT(name, " ", lastname) AS usuario, P.nro_preliminar, P.fecha_actualizacion, P.periodo, P.puc_libromayor FROM info_puc_libro AS P INNER JOIN users AS U ON P.id_user=U.id WHERE id_archivo=?', [id]);
    const datos_libro = await pool.query('SELECT * FROM libro_datos WHERE id_archivo=?', [id]);
    res.render('parametrizacion/datos_libro', { mostrar: mod, datos_libro, info_libro: info_libro[0], title });
});

//LAYOUTS
router.get('/parametrizacion/list_layout', isLoggedIn, async (req, res) => {
    const layouts = await pool.query('SELECT * from layouts');
    res.render('parametrizacion/list_layout', { mostrar: mod, layouts, title });
});

router.get('/parametrizacion/add_layout', isLoggedIn, async (req, res) => {
    res.render('parametrizacion/add_layout', { mostrar: mod, title });
});

router.post('/parametrizacion/add_layout', async (req, res, done) => {
    const { nombre, descripcion, activo } = req.body;
    const newClient = {
        nombre,
        descripcion,
        activo
    };

    // validar si existe sede
    const rows = await pool.query('SELECT * FROM layouts WHERE nombre = ?', [nombre]);

    if (rows.length > 0) {
        done(null, false, req.flash('message', 'El layout ingresado ya existe'));
        res.redirect('/parametrizacion/add_layout');
    } else {

        const result = await pool.query('INSERT INTO layouts SET ? ', newClient);
        newClient.id = result.insertId;
        req.flash('success', 'Layout creado exitosamente');
        res.redirect('/parametrizacion/add_layout');
    }
});

let id_layout = "";
router.get('/parametrizacion/add_cuentas/:id_layout', isLoggedIn, async (req, res) => {
    const { id_layout } = req.params;
    const cuentas = await pool.query('SELECT * FROM cuentas_layout WHERE id_layout=?', id_layout);
    console.log('paso por GET' + cuentas.cuentas, cuentas.descripcion)
    res.render('parametrizacion/add_cuenta', { mostrar: mod, title, cuentas, id_layout })

});

router.post('/parametrizacion/add_cuentas/:id_layout', async (req, res, done) => {
    //Insertar información para la creación del formato
    const { id_layout } = req.params;
    var form_cuentas = req.body.form_cuentas;
    var form_cuentasC = JSON.parse(form_cuentas);

    if (form_cuentasC[0].value !== '') {
        for (let i = 0; i < form_cuentasC.length; i += 2) {
            const newClient = {
                cuenta: form_cuentasC[i].value,
                descripcion: form_cuentasC[i + 1].value,
                id_layout: id_layout
            };

            const result = await pool.query('INSERT INTO cuentas_layout SET ? ', newClient);
            // const select = await pool.query('SELECT * FROM cuentas_layout');
            console.log('ENTRO: ', form_cuentasC);
            // console.log('ENTRO SELECT: ', select);

            newClient.id = result.insertId;
        }
    }

    //Actualizar campos
    var form_edit_cuentas = req.body.form_edit_cuentas;
    var form_edit_cuentasC = JSON.parse(form_edit_cuentas);
    console.log('CANTIDAD ', form_edit_cuentasC.length);
    for (let i = 0; i < form_edit_cuentasC.length; i += 3) {
        const newClient3 = {
            cuenta: form_edit_cuentasC[i + 1].value,
            descripcion: form_edit_cuentasC[i + 2].value,
            id_layout: id_layout
        };
        const cuentas = await pool.query('UPDATE cuentas_layout SET ? WHERE id = ?', [newClient3, form_edit_cuentasC[i].value]);

    }


    req.flash('success', 'cuentas creadas exitosamente');
    //res.redirect('/parametrizacion/add_cuenta/' + id_layout);
    res.send({});
});


router.get('/parametrizacion/layouts/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;

    const cuentas = await pool.query('DELETE FROM cuentas_layout WHERE id_layout = ? ', [id]);
    const layouts = await pool.query('DELETE FROM layouts WHERE id = ? ', [id]);
    req.flash('success', 'Se elimino correctamente el layout.');
    res.redirect('/parametrizacion/list_layout');
});

router.get('/parametrizacion/cuenta/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const idlayout = await pool.query('SELECT id_layout FROM cuentas_layout WHERE id = ? ', [id]);
    const result = await pool.query('DELETE FROM cuentas_layout WHERE id = ? ', [id]);

    req.flash('success', 'Se elimino correctamente la cuenta.');
    res.redirect('/parametrizacion/add_cuentas/' + idlayout[0].id_layout);
});

//XXXXXXXXXX CATEGORIAS XXXXXXXXXXXXXXXXX
router.get('/parametrizacion/add_categoria/:id', isLoggedIn, async (req, res) => {
    const title = "Categorias";
    const { id } = req.params;

    res.render('parametrizacion/add_categoria', { mostrar: mod, title, id });
});


//Crear validaciones y actualizar información de los subcategorias
router.post('/parametrizacion/add_categoria/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    const { nombre, descripcion } = req.body;
    const newClient = {
        nombre: nombre,
        descripcion: descripcion,
        id_formato: id
    };

    const result = await pool.query('INSERT INTO tipo_categoria SET ? ', newClient);
    newClient.id = result.insertId;

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/add_categoria/' + id);
});

router.get('/parametrizacion/categoria/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const id_formato = await pool.query('SELECT id_formato FROM tipo_categoria WHERE id = ? ', [id]);
    console.log(id_formato[0].id_formato);
    const result = await pool.query('DELETE FROM tipo_categoria WHERE id = ? ', [id]);
    const result2 = await pool.query('DELETE FROM tipo_subcategoria WHERE id_categoria = ? ', [id]);
    req.flash('success', 'Se elimino correctamente la cuenta.');
    res.redirect('/parametrizacion/campos/' + id_formato[0].id_formato);
});

router.get('/parametrizacion/edit_categoria/:id', isLoggedIn, async (req, res) => {
    const title = "Categorias";
    const { id } = req.params;
    const categoria = await pool.query('SELECT * FROM tipo_categoria WHERE id = ? ', [id]);
    const idformato = await pool.query('SELECT id_formato FROM tipo_categoria WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;

    res.render('parametrizacion/edit_categoria', { mostrar: mod, title, idfto, categoria: categoria[0], id });
});

//Crear validaciones y actualizar información de los subcategorias
router.post('/parametrizacion/edit_categoria/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;
    const idformato = await pool.query('SELECT id_formato FROM tipo_categoria WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;

    const { nombre, descripcion } = req.body;
    const newClient = {
        nombre: nombre,
        descripcion: descripcion,
        id_formato: idfto
    };

    const grupo = await pool.query('UPDATE tipo_categoria SET ? WHERE id = ?', [newClient, id]);

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/edit_categoria/' + id);
});

//XXXXXXXXXX SUBCATEGORIAS XXXXXXXXXXXXXXXXX
router.get('/parametrizacion/add_subcategoria/:id', isLoggedIn, async (req, res) => {
    const title = "Subcategorias";
    const { id } = req.params;
    const subcategorias = await pool.query('SELECT * FROM tipo_subcategoria WHERE id_categoria = ? ORDER BY id', [id]);
    const idformato = await pool.query('SELECT id_formato FROM tipo_categoria WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;
    res.render('parametrizacion/add_subcategoria', { mostrar: mod, title, subcategorias, id, idfto });
});

//Crear validaciones y actualizar información de los subcategorias
router.post('/parametrizacion/add_subcategoria/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    //Crear subgrupos
    var subcategoria = req.body.subcategoria;
    var subcategoriaC = JSON.parse(subcategoria);

    console.log(subcategoriaC);
    if (subcategoriaC[0].value != '') {
        for (let i = 0; i < subcategoriaC.length; i += 2) {
            const newClient = {
                nombre: subcategoriaC[i].value,
                descripcion: subcategoriaC[i + 1].value,
                id_categoria: id
            };
            const subcategorias = await pool.query('INSERT INTO tipo_subcategoria SET ? ', newClient);
            newClient.id = subcategorias.insertId;
        }
    }

    //Actualizar campos de validación de formatos
    var subcategoria_edit = req.body.edit_subcategoria;
    var subcategoriaC_edit = JSON.parse(subcategoria_edit);

    for (let i = 0; i < subcategoriaC_edit.length; i += 3) {
        const newClient2 = {
            nombre: subcategoriaC_edit[i + 1].value,
            descripcion: subcategoriaC_edit[i + 2].value,
            id_categoria: id
        };
        const subgruposEdit = await pool.query('UPDATE tipo_subcategoria SET ? WHERE id = ?', [newClient2, subcategoriaC_edit[i].value]);
    }

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/add_subcategoria/' + id);
});

router.get('/parametrizacion/add_subcategoria/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const id_categoria = await pool.query('SELECT id_categoria FROM tipo_subcategoria WHERE id = ? ', [id]);
    console.log(id_categoria[0].id_categoria);
    const result = await pool.query('DELETE FROM tipo_subcategoria WHERE id = ? ', [id]);

    req.flash('success', 'Se elimino correctamente la categoria.');
    res.redirect('/parametrizacion/add_subcategoria/' + id_categoria[0].id_categoria);
});

//XXXXXXXXXX GRUPOS XXXXXXXXXXXXXXXXX
router.get('/parametrizacion/add_grupo/:id', isLoggedIn, async (req, res) => {
    const title = "Grupos";
    const { id } = req.params;

    res.render('parametrizacion/add_grupo', { mostrar: mod, title, id });
});

//Crear validaciones y actualizar información de los subcategorias
router.post('/parametrizacion/add_grupo/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    const { nombre, descripcion } = req.body;
    const newClient = {
        nombre: nombre,
        descripcion: descripcion,
        id_formato: id
    };

    const result = await pool.query('INSERT INTO tipo_grupo SET ? ', newClient);
    newClient.id = result.insertId;

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/add_grupo/' + id);
});

router.get('/parametrizacion/grupo/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const id_formato = await pool.query('SELECT id_formato FROM tipo_grupo WHERE id = ? ', [id]);
    console.log(id_formato[0].id_formato);
    const result = await pool.query('DELETE FROM tipo_grupo WHERE id = ? ', [id]);
    const result2 = await pool.query('DELETE FROM tipo_subgrupo WHERE id_grupo = ? ', [id]);
    req.flash('success', 'Se elimino correctamente el grupo.');
    res.redirect('/parametrizacion/campos/' + id_formato[0].id_formato);
});

router.get('/parametrizacion/edit_grupo/:id', isLoggedIn, async (req, res) => {
    const title = "Grupos";
    const { id } = req.params;
    const grupo = await pool.query('SELECT * FROM tipo_grupo WHERE id = ? ', [id]);
    const idformato = await pool.query('SELECT id_formato FROM tipo_grupo WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;

    console.log("ID FORMATO", idfto);

    res.render('parametrizacion/edit_grupo', { mostrar: mod, title, grupo: grupo[0], id, idfto });
});

//Crear validaciones y actualizar información de los subcategorias
router.post('/parametrizacion/edit_grupo/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    const idformato = await pool.query('SELECT id_formato FROM tipo_grupo WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;

    const { nombre, descripcion } = req.body;
    const newClient = {
        nombre: nombre,
        descripcion: descripcion,
        id_formato: idfto
    };
    const grupo = await pool.query('UPDATE tipo_grupo SET ? WHERE id = ?', [newClient, id]);

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/edit_grupo/' + id);
});

//XXXXXXXXXX SUBGRUPOS XXXXXXXXXXXXXXXXX
router.get('/parametrizacion/add_subgrupo/:id', isLoggedIn, async (req, res) => {
    const title = "Subgrupos";
    const { id } = req.params;
    const subgrupos = await pool.query('SELECT * FROM tipo_subgrupo WHERE id_grupo = ? ORDER BY id', [id]);
    const idformato = await pool.query('SELECT id_formato FROM tipo_grupo WHERE id = ?', [id]);
    const idfto = idformato[0].id_formato;

    res.render('parametrizacion/add_subgrupo', { mostrar: mod, title, subgrupos, id, idfto });
});

//Crear validaciones y actualizar información de los subgrupos
router.post('/parametrizacion/add_subgrupo/:id', async (req, res, done) => {
    //Actualizar información general del formato
    const { id } = req.params;

    //Crear subgrupos
    var subgrupo = req.body.subgrupo;
    var subgrupoC = JSON.parse(subgrupo);

    console.log(subgrupoC);
    if (subgrupoC[0].value != '') {
        for (let i = 0; i < subgrupoC.length; i += 2) {
            const newClient = {
                nombre: subgrupoC[i].value,
                descripcion: subgrupoC[i + 1].value,
                id_grupo: id
            };
            const subgrupos = await pool.query('INSERT INTO tipo_subgrupo SET ? ', newClient);
            newClient.id = subgrupos.insertId;
        }
    }

    //Actualizar campos de validación de formatos
    var subgrupo_edit = req.body.edit_subgrupo;
    var subgrupoC_edit = JSON.parse(subgrupo_edit);

    for (let i = 0; i < subgrupoC_edit.length; i += 3) {
        const newClient2 = {
            nombre: subgrupoC_edit[i + 1].value,
            descripcion: subgrupoC_edit[i + 2].value,
            id_grupo: id
        };
        const subgruposEdit = await pool.query('UPDATE tipo_subgrupo SET ? WHERE id = ?', [newClient2, subgrupoC_edit[i].value]);
    }

    req.flash('success', 'Información actualizada correctamente.');
    res.redirect('/parametrizacion/add_subgrupo/' + id);
});

router.get('/parametrizacion/add_subgrupo/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const id_grupo = await pool.query('SELECT id_grupo FROM tipo_subgrupo WHERE id = ? ', [id]);
    console.log(id_grupo[0].id_grupo);
    const result = await pool.query('DELETE FROM tipo_subgrupo WHERE id = ? ', [id]);

    req.flash('success', 'Se elimino correctamente la cuenta.');
    res.redirect('/parametrizacion/add_subgrupo/' + id_grupo[0].id_grupo);
});

module.exports = router;