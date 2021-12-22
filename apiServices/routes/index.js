const {Router} = require('express')
const generalRouter = Router();

const index = require('../index/controller');
const login= require('../login/controller');
const companias = require('../companias/controller');
const parametrizacion_listas = require('../parametrizacion_listas/controller');
const users = require('../users/controller');
const perfiles = require('../perfiles/controller');
const formatos = require('../parametrizacion/formatos');
const home = require('../home/controller');
const notas = require('../notas/controller');
const areas = require('../areas/controller');
const img = require('../cargar/controllerImg');
const formato = require('../formatos/controller');
const monitoreo = require('../monitoreo/controller');



generalRouter.use(monitoreo);

generalRouter.use(index);
generalRouter.use(login);
generalRouter.use(companias);
generalRouter.use(parametrizacion_listas);
generalRouter.use(users);
generalRouter.use(perfiles);
generalRouter.use(formatos);
generalRouter.use(home);
generalRouter.use(notas);
generalRouter.use(areas);
generalRouter.use(img);
generalRouter.use(formato);








module.exports = generalRouter