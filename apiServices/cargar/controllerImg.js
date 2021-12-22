const express = require('express');
const router = express.Router();

async function imageSchema(nombre, url) {
  const objeto = {
    nombre,
    link: url
  };
  const imageSchema = await pool.query('INSERT INTO documentos SET ? ', objeto);
};


module.exports = router;