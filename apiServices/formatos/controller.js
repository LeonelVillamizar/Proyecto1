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
var XLSX = require('xlsx')

const fs = require("fs");
const path = require("path");
const xlsxFile = require('read-excel-file/node');
const { getDefaultSettings } = require('http2');
const { Console } = require('console');

router.get('/formatos/cargar', isLoggedIn, async (req, res) => {
    const id_user = req.user.id;
    console.log(id_user);
    //const cargar_formatos = await pool.query('SELECT id, nombre, id_preparador, nombre_preparador, nombre_aprobador, periodicidad, complejidad, fecha_vencimiento, estado_gest , descripcion, IF(estado_gest="Aceptado", "", "hidden") AS visible,  IF(fecha_vencimiento<=now(),"badge badge-soft-danger",IF(fecha_vencimiento<=now()+ INTERVAL 2 DAY,"badge badge-soft-warning","badge badge-soft-success")) as semaforo from vista_cargar_formatos where estado="Activo" and id_preparador=?', id_user);
    const cargar_formatos = await pool.query('SELECT F.id, F.nombre, AU.id_preparador, U.name AS preparador, UV.name AS nombre_aprobador, F.periodicidad, ' +
        'AU.fecha_vencimiento, F.estado, F.descripcion, IF(AU.fecha_vencimiento<=now(),"badge badge-soft-danger",IF(AU.fecha_vencimiento<=now()+ INTERVAL 2 DAY,"badge badge-soft-warning","badge badge-soft-success")) as semaforo ' +
        'FROM asignacion_usuario AS AU ' +
        'INNER JOIN formatos AS F ON F.id=AU.id_formato ' +
        'INNER JOIN users AS U ON U.id=AU.id_preparador ' +
        'INNER JOIN users AS UV ON UV.id=AU.id_validador ' +
        'WHERE F.estado="Activo" AND AU.id_preparador=?', id_user);
    //const cargar_formatos = await pool.query('SELECT id, nombre, id_preparador, nombre_preparador, nombre_aprobador, periodicidad, fecha_vencimiento, estado_gest , descripcion, IF(estado_gest="Aceptado", "", "hidden") AS visible, IF(fecha_vencimiento<=now(),"badge badge-soft-danger",IF(fecha_vencimiento<=now()+ INTERVAL 2 DAY,"badge badge-soft-warning","badge badge-soft-success")) as semaforo from vista_cargar_formatos where estado="Activo" and id_preparador=?', id_user);

    res.render('formatos/cargar', { mostrar: mod, cargar_formatos, title });
});



router.get('/formatos/area', isLoggedIn, async (req, res) => {
    const area_id = req.user.area_id;
    console.log(req.user);

    //const cargar_formatos = await pool.query('SELECT * , IF(estado="Aceptar", "hidden", "") AS visible  from vista_cargar_formatos where id_preparador=?', id_user);
    const cargar_formatos = await pool.query('SELECT id, nombre, id_preparador, nombre_preparador, id_aprobador, nombre_aprobador, periodicidad, complejidad, fecha_vencimiento, estado_gest , descripcion, IF(estado_gest="Aceptado", "", "hidden") AS visible, id_preparador_asig, IF(fecha_vencimiento<=now(),"badge badge-soft-danger",IF(fecha_vencimiento<=now()+ INTERVAL 2 DAY,"badge badge-soft-warning","badge badge-soft-success")) as semaforo from vista_cargar_formatos where area_id=?', area_id);
    //console.log(cargar_formatos);

    res.render('formatos/area', { mostrar: mod, cargar_formatos, title });
});

let datos = '';
var maximo = 0;
var identificador = '';
var periodo2 = '';
var id_formato_val = "";
router.post('/formatos/datosxlsx/:id', async (req, res) => {
    const id = req.params.id;
    datosxlsx = req.body.datosxlsx;
    var datos = JSON.parse(datosxlsx);
    id_formato_val = req.params.id;
    //console.log('datos',datos);

    //Crear valor de la variable período
    let mes = req.body.mes;
    let ano = req.body.ano;
    periodo2 = ano + '-' + mes + '-01';
    //console.log('periodo2', periodo2, id_formato_val);
    const identi = await pool.query('SELECT identificador FROM formatos WHERE id=?', id);
    identificador = identi[0].identificador;

    GuardarDatos(datos);

    const val_estado_format = await pool.query('SELECT estado_proceso from formatos where id=?', [id]);
    if (val_estado_format[0].estado_proceso === 'En proceso') {
        boton_error = 1;
    }
    const maximo1 = await pool.query('select (max(id)+1) a from fto_' + identificador);
    //console.log(maximo = maximo1[0].a);
    if (maximo = maximo1[0].a == null) {
        maximo = 1;
    } else {
        maximo = maximo1[0].a;
    }

    res.send({});
});


var periodo = '';

const uploadFile = async (req, res) => {
    // show the uploaded file information
    const user_id = req.user.id;
    const fecha = Date.now();
    const hoy = new Date(fecha);
    const id = req.params.id;
    console.log('SUBIR ARCHIVO');
    //Crear valor de la variable período
    let mes = req.body.mes;
    let ano = req.body.ano;
    periodo = ano + '-' + mes + '-01';
    //console.log(req.file);
    const { size, bucket, key, acl, originalname, mimetype, location, etag } = req.file;
    let newsize = Math.round((parseInt(size) * 0.00000095367432), 3) + " MB";
    let tipo_estado_id = 1; // activo 
    let url = req.file.location
    //Borrar el formato si existe
    const val_format = await pool.query('SELECT * from archivos where id_formato=? AND periodo=?', [id, periodo]);
    if (val_format.length != 0) {
        await pool.query('DELETE FROM archivos WHERE id_formato = ? AND periodo=?', [id, periodo]);
    }

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
        user_id,
        tipo_estado_id,
        id_formato: id
    }

    const archivo = await pool.query('INSERT INTO archivos SET ? ', newdocumento);
    newdocumento.id = archivo.insertId;
    let id_new = newdocumento.id;
    //Actualizar el estado del formato
    let estado = 'En proceso';
    const result = await pool.query('UPDATE formatos SET estado_proceso=? WHERE id = ?', [estado, id]);
    const result2 = await pool.query('UPDATE archivos SET periodo=? WHERE id = ?', [periodo, id_new])
    req.flash('success', 'El archivo fue cargado exitosamente.');
    //res.redirect('/formatos/subir_archivo/'+ id, { mostrar: mod, boton_error, title});
    res.redirect('/formatos/subir_archivo/' + id);
};

router.post('/formatos/subir_archivo/:id', upload, uploadFile);

async function GuardarDatos(datos) {
    console.log(datos);
    await pool.query('DELETE FROM fto_' + identificador + ' WHERE periodo = ?', [periodo2]);
    const campos = await pool.query('SHOW COLUMNS FROM fto_' + identificador);
    console.log("identificador: " + identificador);
    let nombre_campos = '';
    nombre_campos = JSON.stringify(campos[2].Field).replace(/['"]+/g, '');
    console.log('CANTIDAD', campos.length - 2, datos[0].length);
    //Validar que los campos leídos en el archivo sean iguales a los campos en la tabla de la BD
    if (campos.length - 2 == datos[0].length) {
        //console.log('campos BD', campos.length - 2);
        //console.log('datos', datos[0].length);
        var camp = '';
        for (let i = 3; i < campos.length; i++) {
            camp = JSON.stringify(campos[i].Field);

            nombre_campos = nombre_campos + ',' + camp.replace(/['"]+/g, '');
        }


        var sql = "INSERT INTO fto_" + identificador + " (" + nombre_campos + ") VALUES ?";


        await pool.query(sql, [datos], function (err, result) {
            //pool.query(sql, [datos], function (err, result) {
            console.log(sql);
            if (err) throw err;
            console.log("Number of records inserted: " + result.affectedRows);

            //Ingresar el periodo
            pool.query('UPDATE fto_' + identificador + ' SET periodo=? WHERE periodo IS NULL', [periodo2]);
            console.log(id_formato_val, periodo2);
            pool.query('call validacion_obligatorios_Tipo(?,?) ', [id_formato_val, periodo2]);
        });
    }
    else {
        req.flash('success', 'La cantidad de campos del formato es diferente a la cantidad de campos parametrizados.');
    }
}

let id_format = "";
let boton_error = 0;
router.get('/formatos/subir_archivo/:id', isLoggedIn, async (req, res) => {
    const id_user = req.user.id;
    const id_formato = req.params.id;
    var fecha = new Date();
    var ano = fecha.getFullYear();
    var ano_ant = ano - 1;
    var ano_act = ano + 1;
    var ano_act1 = ano + 2;
    var ano_act2 = ano + 3;
    var ano_act3 = ano + 4;
    id_format = id_formato;
    const formatos = await pool.query('SELECT * from archivos WHERE id_formato=?', id_formato);
    const rango = await pool.query('SELECT rango, nombre_hoja from formatos WHERE id=?', id_formato);
    let rango_string = rango[0].rango;
    let nombre_hoja = rango[0].nombre_hoja;
    console.log(id_formato);
    res.render('formatos/subir_archivo', { mostrar: mod, rango_string, id_formato, formatos, title, ano, ano_ant, ano_act, ano_act1, ano_act2, ano_act3, nombre_hoja, boton_error });
});

router.get('/formatos/log_errores/:id', isLoggedIn, async (req, res) => {
    const id = req.params.id;
/*     const periodo_id = await pool.query('SELECT periodo, id_formato from archivos WHERE id=?', id);
    const errores = await pool.query('SELECT L.id_registro, L.nombre_campo, L.nombre_formato, ' +
        'L.periodo, L.fecha, L.valor_campo, E.tipo, E.descripcion, L.detalle, L.justificacion ' +
        'from log_error AS L ' +
        'INNER JOIN tipo_error AS E ON L.id_tipo_error=E.id ' +
        'WHERE L.id_formato=? AND L.periodo=?', [periodo_id[0].id_formato, periodo_id[0].periodo]);
    const justificacion = await pool.query('SELECT id_tipo_error FROM log_error WHERE id_formato=? AND id_tipo_error=9', id);
    let bandjustificacion = 0;
    if (justificacion != "") {
        if (justificacion[0].id_tipo_error == 9) {
            bandjustificacion = 1;
        }
    }
    const id_for = periodo_id[0].id_formato;

    res.render('formatos/log_errores', { mostrar: mod, title, errores, bandjustificacion, id, id_for }); */


    const periodo_id = await pool.query('SELECT periodo, id_formato from archivos WHERE id=?', id);
    const id_for = periodo_id[0].id_formato;
    const log_error = await pool.query('SELECT id, nombre_campo, nombre_formato, periodo, id_tipo_error, detalle, justificacion, id_formato, valor_campo FROM log_error ' + 
    'WHERE id_formato=?', id_for);

    



    res.render('formatos/log_errores', { mostrar: mod, title, log_error, id_for});

});

router.post('/formatos/log_errores/:id', async (req, res, done) => {
    const id = req.params.id;
    const { justificacion } = req.body;
    const result = await pool.query('UPDATE log_error SET justificacion=? WHERE id_tipo_error=9 AND id_formato=?', [justificacion, id]);
    console.log(result);
    const id_formato = await pool.query('SELECT id_formato FROM log_error WHERE id=?', id);
    console.log(id_formato);
    if (id_formato != "") {
        const result1 = await pool.query('UPDATE formatos SET estado_proceso="Pendiente de aprobación" WHERE id=?', id_formato[0].id_formato);
    }
    req.flash('success', 'Se actualizaron los campos');

    res.redirect('/formatos/log_errores/' + [id]);
});

router.get('/formatos/delete/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM archivos WHERE id = ? ', [id]);

    req.flash('success', 'El archivo fue eliminado exitosamente.');
    res.redirect('/formatos/subir_archivo/' + id_format);
});


module.exports = router;