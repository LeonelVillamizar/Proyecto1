const express = require('express');
const router = express.Router();

const pool = require('../../src/services/database/database');


const { isLoggedIn } = require('../auth/auth');

//lista
router.get('/perfiles', isLoggedIn, async(req, res) => {
    const option = global.opciones;
    const resultado = option.find(modulo => modulo.link === "/perfiles");
    if (typeof(resultado) === "undefined") {
        res.redirect('/modulos');
        return
    }
    const listar = await pool.query('SELECT ru.id as idru, ru.resources_id, ru.tipouser_id, ru.compania_id, ru.active, r.id, r.option_name, r.module, r.description, c.name, tu.name as perfil FROM resources_users as ru INNER JOIN resources as r ON r.id=ru.resources_id INNER JOIN compania as c ON c.id=ru.compania_id INNER JOIN tipo_users as tu ON tu.id=ru.tipouser_id WHERE r.tipo="opcion" ORDER BY c.name, tu.name, r.module, r.option_name ASC');
    res.render('perfiles/list', { listar, mostrar: mod });
});
//lista
router.get('/perfiles/add', isLoggedIn, async(req, res) => {
    const option = global.opciones;
    const resultado = option.find(modulo => modulo.link === "/perfiles");
    if (typeof(resultado) === "undefined") {
        res.redirect('/modulos');
        return
    }
    const perfil = await pool.query('SELECT * FROM tipo_users ORDER by name ASC');
    const sede = await pool.query('SELECT * FROM compania ORDER by name ASC');
    const module = await pool.query('SELECT id, module, option_name FROM resources WHERE tipo = "modulo"');
    const listar = await pool.query('SELECT ru.id as idru, ru.resources_id, ru.tipouser_id, ru.compania_id, ru.active, r.id, r.option_name, r.module, r.description, c.name FROM resources_users as ru INNER JOIN resources as r ON r.id=ru.id INNER JOIN compania as c ON c.id=ru.compania_id');
    res.render('perfiles/add', { perfil, sede, module, mostrar: mod });
});
//Recursos
router.post('/perfiles/consultar_perfiles', async(req, res) => {
    const compania_id = req.user.compania_id;
    const { modulo, sede, perfil } = req.body;
    let recursos = [];
    let iddef = "";
    let module = "";
    let opcion = "";
    let description = "";
    var recex = "";
    const recursosdef = await pool.query('SELECT id,option_name,module,description FROM resources WHERE tipo="opcion" and module=?', [modulo]);
    const recursos1 = await pool.query('SELECT ru.id, ru.resources_id as resid, ru.tipouser_id, ru.compania_id, r.module from resources_users as ru INNER JOIN resources as r ON r.id = ru.resources_id WHERE r.module= ? and r.tipo= "opcion" and  ru.tipouser_id = ? AND ru.compania_id = ?', [modulo, perfil, sede]);
    let existe = "";
    if (recursosdef.length == recursos1.length) {
        iddef = "";
        module = "";
        opcion = "";
        description = "El perfil ya tiene todos los recursos asignados de éste módulo";
        const newconsulta2 = {
            iddef,
            module,
            opcion,
            description,
        };
        recursos.push(newconsulta2);
    } else {
        if (recursos1.length == 0) {
            //console.log("Esta vacio recursos");
            for (b = 0; b < recursosdef.length; b++) {
                idres = recursosdef[b].id;
                module = recursosdef[b].module;
                opcion = recursosdef[b].option_name;
                description = recursosdef[b].description;

                const newconsulta3 = {
                    idres,
                    module,
                    opcion,
                    description,
                };
                recursos.push(newconsulta3);
            }

        } else {
            for (i = 0; i < recursos1.length; i++) {
                iddef = recursos1[i].resid;

                for (p = 0; p < recursosdef.length; p++) {

                    let idres = recursosdef[p].id;
                    const recvalid = await pool.query('SELECT id, resources_id, active FROM resources_users WHERE resources_id = ? AND tipouser_id = ? AND compania_id =?', [idres, perfil, sede]);
                    if (recvalid.length != 0) {
                        //console.log("Entre por existe");
                    } else {
                        //console.log("Entre por NO existe");

                        module = recursosdef[p].module;
                        opcion = recursosdef[p].option_name;
                        description = recursosdef[p].description;
                        if (idres == recex) {
                            //console.log("Entre existe reccons");
                        } else {
                            const newconsulta1 = {
                                idres,
                                module,
                                opcion,
                                description,
                            };

                            recursos.push(newconsulta1);
                            //console.log(recursos);
                            recex = idres;
                        }

                    }


                }
            }
        }
    }


    return res.json({ recursos });
});


router.get('/perfiles/add', isLoggedIn, async(req, res) => {
    const option = global.opciones;
    const resultado = option.find(modulo => modulo.link === "/perfiles");
    if (typeof(resultado) === "undefined") {
        res.redirect('/modulos');
        return
    }
    const perfil = await pool.query('SELECT * FROM tipo_users ORDER by name ASC');
    const sede = await pool.query('SELECT * FROM compania ORDER by name ASC');
    const module = await pool.query('SELECT id, module, option_name FROM resources WHERE tipo = "modulo"');
    res.render('perfiles/add', { perfil, sede, module, mostrar: mod });
});

//agregar recurso
router.post('/perfiles/addrecursos', async(req, res, done) => {
    const user_id = req.user.id;
    var { sede, perfil, modulo, recursos } = req.body;
    //console.log(req.body);
    let active = "S";

    //------- Valido si debo crear el recurso padre----
    const rows2 = await pool.query('SELECT id FROM resources WHERE option_name= ?', [modulo]);
    let recurso = rows2[0].id;
    const rows1 = await pool.query('SELECT * FROM resources_users WHERE resources_id = ? and tipouser_id= ? and compania_id= ? and active= "S"', [recurso, perfil, sede]);
    if (rows1.length > 0) {
        //console.log("ya existe el recurso padre");

    } else {
        const newPadre = {
            resources_id: recurso,
            tipouser_id: perfil,
            compania_id: sede,
            active,
        };
        ////console.log(newPadre);
        //console.log("Inserto Padreeee");
        const result1 = await pool.query('INSERT INTO resources_users SET ? ', newPadre);
        newPadre.id = result1.insertId;
    }

    //--------------

    const newRecursos = {
        resources_id: recursos,
        tipouser_id: perfil,
        compania_id: sede,
        active,
    };
    //console.log(newRecursos);


    const result = await pool.query('INSERT INTO resources_users SET ? ', newRecursos);
    newRecursos.id = result.insertId;

    req.flash('success', 'Recursos actualizados exitosamente');
    res.redirect('/perfiles');
});
//eliminar
router.get('/perfiles/delete/:id', async(req, res) => {
    const { id } = req.params;
    //console.log(id);
    var borrarpa = "I";
    var idpadre = "";


    //------- Valido si debo crear el recurso padre----
    const padrerec = await pool.query('SELECT ru.id, ru.resources_id, ru.tipouser_id, ru.compania_id, r.module  FROM resources_users as ru INNER JOIN resources as r ON ru.resources_id=r.id WHERE ru.id = ?', [id]);
    let idrecin = padrerec[0].resources_id;
    //console.log(idrecin);
    let modulo = padrerec[0].module;
    //console.log(modulo);
    let perfil = padrerec[0].tipouser_id;
    //console.log(perfil);
    let sede = padrerec[0].compania_id;
    //console.log(sede);
    const recursosc = await pool.query('SELECT id, option_name, tipo FROM resources WHERE module = ?', [modulo]);

    for (p = 0; p < recursosc.length; p++) {
        let rec = recursosc[p].id;
        //console.log(rec);
        let mod = recursosc[p].tipo;
        //console.log(mod);
        if (idrecin == rec) {
            await pool.query('DELETE FROM resources_users WHERE id = ?', [id]);
        } else {
            if (mod == "modulo") {
                //console.log("Este es el padre");
                idpadre = rec;
            } else {
                const unicorec = await pool.query('SELECT id, active FROM resources_users WHERE resources_id = ? AND tipouser_id = ? AND compania_id = ?', [rec, perfil, sede]);
                if (unicorec.length > 0) {
                    //console.log("existe un hijo N else 1");
                    borrarpa = "N";
                } else {
                    if (borrarpa == "N") {
                        //console.log("existe un hijo N padre else 2");
                    } else {
                        borrarpa = "S";
                        //console.log("existe un hijo S padre else 1");
                    }
                }
            }
        }
    }

    if (borrarpa == "S") {
        //console.log("Elimino el recurso padre");
        await pool.query('DELETE FROM resources_users WHERE resources_id = ? AND tipouser_id = ? AND compania_id = ?', [idpadre, perfil, sede]);

    }
    //--------------

    req.flash('success', 'El registro ha sido eliminado exitosamente');
    res.redirect('/perfiles');
});

// ----- Empieza crear PERFILES ---------------------------------

//lista
router.get('/perfiles/newlist', isLoggedIn, async(req, res) => {
    const option = global.opciones;
    const resultado = option.find(modulo => modulo.link === "/perfiles");
    if (typeof(resultado) === "undefined") {
        res.redirect('/modulos');
        return
    }
    const compania_id = req.user.compania_id;
    const perfil = await pool.query('SELECT id, name FROM tipo_users  ORDER BY name ASC');
    res.render('perfiles/listnew', { perfil, mostrar: mod });
});

//eliminar
router.get('/perfiles/deleteprofile/:id', async(req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM tipo_users WHERE id = ?', [id]);
    req.flash('success', 'El perfil ha sido eliminado exitosamente');
    res.redirect('/newlist');
});

router.get('/perfiles/addnew', isLoggedIn, async(req, res) => {
    const category = await pool.query('SELECT * FROM category ORDER by name');
    res.render('perfiles/addnew', { category, mostrar: mod });
});


//agregar perfil
router.post('/perfiles/newadd', async(req, res, done) => {
    const option = global.opciones;
    const resultado = option.find(modulo => modulo.link === "/perfiles");
    if (typeof(resultado) === "undefined") {
        res.redirect('/modulos');
        return
    }
    const user_id = req.user.id;
    const { name } = req.body;
    const newPerfil = {
        name,
    };
    //console.log(newPerfil);

    const rows = await pool.query('SELECT * FROM tipo_users WHERE name = ?', [name]);
    if (rows.length > 0) {
        done(null, false, req.flash('message', 'Existe un perfil con el mismo nombre'));
        res.redirect('addnew');
    } else {
        const result = await pool.query('INSERT INTO tipo_users SET ? ', newPerfil);
        newPerfil.id = result.insertId;
        req.flash('success', 'Perfil creado exitosamente');
        res.redirect('newlist');
    }

});


router.get('/perfiles/editnew/:id', async(req, res) => {
    const { id } = req.params;
    //console.log(id);
    const perfilname = await pool.query('SELECT * FROM tipo_users WHERE id = ? ORDER by name', [id]);
    //console.log(perfilname[0].name);
    res.render('perfiles/editnew', { perfilname: perfilname[0], mostrar: mod });
});

router.post('/perfiles/editnew/:id', async(req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const { name } = req.body;
    const newPerfil = {
        name,
    };
    //console.log(newPerfil);

    await pool.query('UPDATE tipo_users SET ? WHERE id = ?', [newPerfil, id]);
    req.flash('success', 'Perfil actualizado correctamente');
    res.redirect('/newlist');
});


// ------ Fin crear perfiles --------------------------------------

module.exports = router;