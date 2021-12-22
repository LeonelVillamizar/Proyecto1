const express = require('express');
const router = express.Router();
const app = express();
const { upload, s3 } = require("../auth/multer");
const pool = require('../../src/services/database/database');

const { isLoggedIn } = require('../auth/auth');
const title = "Hallazgos";

router.get('/hallazgos/list', isLoggedIn, async (req, res) => {
    const hallazgos = await pool.query('SELECT PR.nombre, count(PL.idplanes) AS cantidadPlanes, concat(US.name, " ", US.lastname) AS usuario, HAL.hallazgos, HAL.conclusiones ' +
    'FROM hallazgos AS HAL ' +
    'INNER JOIN planes AS PL ON HAL.idhallazgos=PL.id_hallazgo ' +
    'INNER JOIN pruebas AS PR ON HAL.id_prueba=PR.id ' +
    'INNER JOIN users AS US ON PR.id_user=US.id ' +
    'GROUP BY HAL.hallazgos, PR.nombre, HAL.hallazgos, usuario, HAL.conclusiones;')
    res.render('hallazgos/list', { mostrar: mod, title, hallazgos });
});

router.get('/hallazgos/edit/:id', async (req, res) => {
    const { id } = req.params;
    const hallazgos = await pool.query('SELECT * FROM hallazgos WHERE idhallazgos=?', [id]);
  
    res.render('hallazgos/edit', { title, hallazgo: hallazgos[0], mostrar: mod });
});

router.post('/hallazgos/edit/:id', async(req, res) => {
    const { id } = req.params;
    const { hallazgos, conclusiones } = req.body;
    const newClient = {
        hallazgos,
        conclusiones,
    };
    console.log(newClient);
    await pool.query('UPDATE hallazgos SET ? WHERE idhallazgos = ?', [newClient, id]);
    req.flash('success', 'Información de hallazgo actualizada correctamente');
    res.redirect('/hallazgos/edit/' + id);
});

router.get('/hallazgo/delete/:id', async(req, res) => {
    const { id } = req.params;   
    const idpruebas = await pool.query('SELECT id_prueba FROM hallazgos WHERE idhallazgos = ? ', [id]);
    let idprueba=idpruebas[0].id_prueba;
    const result = await pool.query('DELETE FROM hallazgos WHERE idhallazgos = ? ', [id]);
    req.flash('success', 'Se elimino correctamente el hallazgo.');
    res.redirect('/pruebas/add/' + idprueba);
});

module.exports = router;