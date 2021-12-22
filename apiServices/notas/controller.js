const express = require('express');
const router = express.Router();
const app = express();
const { upload, s3 } = require("../cargar/controllerNube");
const pool = require('../../src/services/database/database');



const { isLoggedIn } = require('../auth/auth');
const title = "Notas";


router.get('/notas/asignarlist', isLoggedIn, async (req, res) => {
    const notas = await pool.query('SELECT N.id, N.nombre, N.periodicidad, N.complejidad, N.estado, CIA.name  ' +
        'FROM notas AS N ' +
        'INNER JOIN compania AS CIA ON CIA.id=N.id;')

    res.render('notas/asignarlist', { notas, title, mostrar: mod });
});

router.get('/notas/asignar/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const formatos = await pool.query('SELECT nombre FROM notas WHERE id= ?', [id]);
    const users = await pool.query('SELECT concat_ws(" ", name, lastname) AS nombre FROM users');
    const areas = await pool.query('SELECT * FROM areas');
    const user_id = req.user.id;
    res.render('notas/asignar', { mostrar: mod, formato: formatos[0], users, areas, user_id, title });
});

router.get('/notas/config/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    res.render('notas/config', { mostrar: mod,  user_id, title });
});

router.get('/notas/detalle/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    res.render('notas/detalle', { mostrar: mod, user_id, title });
});

router.get('/notas/cargar', isLoggedIn, async (req, res) => {
    const compania = req.user.compania_id;
    const notas = await pool.query('SELECT F.id, FORM.nombre, concat_ws(" ", US.name, US.lastname) AS responsable, ' +
    'F.fecha_limite, FORM.periodicidad, F.notas, F.estado ' +
    'FROM asignacion_notas AS F ' +
    'INNER JOIN users AS US ON F.id_user=US.id ' +
    'INNER JOIN notas AS FORM ON F.id_nota=FORM.id ' +
    'WHERE F.id_area=US.area_id');
    const user_id = req.user.id;
    res.render('notas/cargar', { mostrar: mod, notas, user_id, title });
});

const uploadFile = async(req, res) => {

    const user_id = req.user.id;
    let identificador = req.params.id;
    const Descripcion =req.body.descripcion;
    const id_prueba1 =req.body.id_prueba;
    console.log(req.body);

    const { size, bucket, key, acl, originalname, mimetype, location, etag } = req.file
    let newsize = Math.round((parseInt(size) / 1024), 3) + " KB";
    console.log(newsize);
 
   let tipo_de_vista = 2;
   let descripcion = Descripcion; 
   let id_prueba=id_prueba1;
   let id_plan = identificador;
    const newdocumento = {
        key,
        nombre: originalname,
        location,
        bucket,
        mimetype,
        size:newsize,
        acl,
        etag,
        descripcion,
        id_prueba,
        user_id,
        tipo_de_vista,
        id_plan
     }
    
     await pool.query('INSERT INTO archivos SET ? ', newdocumento);
     console.log("Registró documento en BD", identificador)
     req.flash('success', 'Archivo cargado exitosamente');
     console.log("/planes/documents/"+ identificador);
     res.redirect('/planes/documents/' + identificador);
 
};
 
 const getFiles = async(req, res) => {
     try {
         const images = await Image.find();
         console.log(images);
 
         res.render("files", {
             images,
             title: "Getting Files",
         });
     } catch (error) {
         console.log(error);
     }
 };
 
 const getSingleFile = async(req, res) => {
     try {
         const { filename } = req.params;
 
         //fetching objects from bucket
         const data = await s3
             .getObject({
                 Bucket: BUCKET_NAME,
                 Key: filename,
             })
            .promise();
 
        // console.log(data);
         const file = fs.createWriteStream(
            path.resolve(`./src/public/files/${filename}`)
         );
         file.write(data.Body);
         res.redirect("/files/" + filename);
     } catch (error) {
         console.log(error);
     }
 };
 
 router.post("/filesPlanes/:id", upload, uploadFile);
 
 module.exports = router, {
     
     uploadFile,
     getFiles,
     getSingleFile,
 
  };

  module.exports = router;


