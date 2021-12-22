const express = require('express');
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

const { S3_ENDPOINT, BUCKET_NAME } = process.env

const spacesEndpoint = new aws.Endpoint(S3_ENDPOINT);
//const spacesEndpoint = new aws.Endpoint('nyc3.digitaloceanspaces.com');


const s3 = new aws.S3({
  endpoint: spacesEndpoint,
});

let date = new Date()
const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET_NAME,
    acl: 'public-read', // para especificar permisos para listar archivo
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname ,
      });

    },
    key: (request, file, cb) => {
      console.log(file);
      cb(null, `${Date.now().toString()}_${file.originalname}`);
      //cb(null, file.originalname + Date.now());
    },
  }),
}).single("upload"); // array propiedad para subir multiples archivos

//s3 permite modificar los archivos
module.exports = { upload, s3 };
