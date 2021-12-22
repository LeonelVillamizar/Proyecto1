const express = require('express');
const router = express.Router();
const app = express();
const { upload, s3 } = require("../auth/multer");
const pool = require('../../src/services/database/database');
const multer = require('multer');




const fs = require("fs");
const path = require("path");

const { isLoggedIn } = require('../auth/auth');
//let tipo_aplicacion_id = "1";

router.get('/documentos/gesdoc/:id', isLoggedIn, async (req, res) => {

    const { id } = req.params;
    console.log(req.params);
    const pruebas = await pool.query('SELECT PR.id, PR.nombre, PR.responsable, CIA.name, PROD.nombre as producto, concat(US.name, " ", US.lastname) AS usuario, PR.objetivos, PR.fecha_ejecucion ' +
        'FROM pruebas AS PR ' +
        'INNER JOIN compania AS CIA ON PR.id_sociedad=CIA.id ' +
        'INNER JOIN tipo_producto AS PROD ON PR.id_producto=PROD.id ' +
        'INNER JOIN users AS US ON PR.id_user=US.id WHERE PR.id= ?', [id]);

    console.log("documentos", pruebas);
    res.render('documentos/gesdoc', { pruebas: pruebas[0], title, mostrar: mod });
});


router.post('/compania/add', async(req, res, done) => {
    const { name, responsable, active } = req.body;
    const newClient = {
        name,
        responsable,
        active
    };
    
        const result = await pool.query('INSERT INTO compania SET ? ', newClient);
        newClient.id = result.insertId;
        req.flash('success', 'Sede creada exitosamente');
        res.redirect('/compania');
  
});


