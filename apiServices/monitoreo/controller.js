const express = require('express');
const router = express.Router();
const app = express();
const { upload, s3 } = require("../cargar/controllerNube");
const pool = require('../../src/services/database/database');



const { isLoggedIn } = require('../auth/auth');
const title = "Monitoreo";


router.get('/monitoreo/list', isLoggedIn, async (req, res) => {
    
    const tipo_id=req.user.tipou_id;
    const compania_id=req.user.compania_id;
    const area_id=req.user.area_id;
    const user_id=req.user.id;
   
    let vista_Admin_area="";
    

    if (tipo_id == 1){ 
      var buzon = await pool.query('select pre_for, nombre, preparador_env,  aprobador_env, id_validador_rev, validador_rev, id_aprobador_rev, aprobador_rev, date_format(fecha_vencimiento , "%Y-%m-%d") fecha_vencimiento, date_format(fecha_casa_matriz , "%Y-%m-%d") fecha_casa_matriz, area_apro_env, estado, estado_proceso, complejidad, semaforo,  if(id_validador_rev=?,if(estado_proceso="Revisado","",if(id_aprobador_rev=?,if(complejidad="Alta",if(estado_proceso="Validado","","hidden"),"hidden"),"hidden")),"hidden") btn_aprobador, ("hidden") btn_area,(1) ocultar from vista_monitoreo_buzon',[user_id, user_id, user_id]);
      vista_Admin_area=1;
      
    }
    else if (tipo_id == 5 ){
      vista_Admin_area=0;    
      var buzon = await pool.query('select pre_for, nombre, id_preparador_env, preparador_env, id_aprobador_env, aprobador_env, id_validador_rev, validador_rev, id_aprobador_rev, aprobador_rev, date_format(fecha_vencimiento , "%Y-%m-%d") fecha_vencimiento, date_format(fecha_casa_matriz , "%Y-%m-%d") fecha_casa_matriz, area_apro_env, estado, estado_proceso, complejidad, semaforo, ("hidden") btn_aprobador, ("hidden") btn_validador ,if(estado_proceso="Sin Carga","",if(estado_proceso="Pendiente por aprobar","","hidden")) btn_area, (0) ocultar from vista_monitoreo_buzon where estado="Activo" and area_apro_env=?', area_id );
      console.log(buzon)
    }
    

    //console.log(buzon) 
    res.render('monitoreo/list', {mostrar: mod,  buzon, vista_Admin_area, title });
});


router.get('/monitoreo/aceptar/:id', isLoggedIn, async (req, res) => {
    
    const id_user = req.user.id;
    const id_formato= req.params.id;
    console.log(id_formato)
    const cargar_formatos = await pool.query('SELECT * from vista_monitoreo_buzon where pre_for=?', [id_formato]);
    const aceptar = await pool.query('SELECT pre_for, id_preparador_env, estado,estado_proceso, if(estado_proceso="Sin carga",0,1) ocultar, preparador_env, last_preparador_env, concat_ws(" ", preparador_env, last_preparador_env) nombre, id_validador_rev, id_aprobador_rev  from vista_monitoreo_buzon where pre_for=?', [id_formato]);
    const usuarios = await pool.query('SELECT id, concat_ws(" ", name, lastname) persona  FROM users where active=1');
    //console.log(cargar_formatos);
    console.log(aceptar);

    res.render('monitoreo/aceptar', { mostrar: mod, cargar_formatos:cargar_formatos[0], aceptar:aceptar[0], usuarios, title });
});


router.post('/monitoreo/aceptar/:id_formato', isLoggedIn, async (req, res) => {
  const user=req.user.id;
  const fecha1= Date.now();
  const fecha = new Date(fecha1);
  let cambio_estado = "";

  const {id_formato, id_preparador_env, estado_proceso, descripcion, aceptar} = req.body;
  
  
  if (estado_proceso == "Sin Carga") {
      console.log(id_preparador_env)
      const result3 = await pool.query('UPDATE asignacion_usuario SET id_preparador_env= ? WHERE id_formato= ?', [id_preparador_env, id_formato]);   
  }else{
       if (aceptar == "Aceptar"){
        cambio_estado="Revisado"
       }
       else if (aceptar == "Rechazar"){
        cambio_estado="Sin Carga"
       };
       const est_pro = cambio_estado;
       console.log(est_pro, id_formato)
       const new_asigna2 = {
        estado:cambio_estado,
        fecha:fecha,        
        user_id:user,
        formato_id:id_formato,
        descripcion
    
     };  

      const result4 = await pool.query('UPDATE asignacion_usuario SET id_preparador_env=? WHERE id_formato=?', [id_preparador_env, id_formato]);
      const result5 = await pool.query('UPDATE formatos SET estado_proceso= ? WHERE id= ?', [cambio_estado, id_formato]);
      const campos = await pool.query('INSERT estado_formatos SET ? ', new_asigna2); 
  }


  //res.redirect('/monitoreo/aceptar/' + [id_formato]);
  res.redirect('/monitoreo/list');
});




router.get('/monitoreo/aceptar_admin/:id', isLoggedIn, async (req, res) => {
    
  const id_user = req.user.id;
  const id_formato= req.params.id;
  console.log(id_formato)
  const aceptar = await pool.query('SELECT * from vista_monitoreo_buzon where pre_for=?', [id_formato]);


  res.render('monitoreo/aceptar_admin', { mostrar: mod, aceptar:aceptar[0],  title });
});



router.post('/monitoreo/aceptar_admin/:id_formato', isLoggedIn, async (req, res) => {
  const user=req.user.id;
  const fecha1= Date.now();
  const fecha = new Date(fecha1);
  let cambio_estado = "";

  const {id_formato, aceptar,  estado_proceso , descripcion, id_validador_rev, id_aprobador_rev, complejidad} = req.body;
  
      
      if ((id_validador_rev==user) && (estado_proceso=="Revisado")){
        console.log(estado_proceso,complejidad,aceptar)
        
            if (aceptar == "Aceptar" && complejidad=="Alta"){
              cambio_estado="Validado";
            }
            else if (aceptar == "Aceptar"){
              
              cambio_estado="Finalizado";
            }
            else if (aceptar == "Rechazar"){
              cambio_estado="Sin Carga";
            }
          
      }       
      else if ((id_aprobador_rev==user) && (estado_proceso=="Validado")){
        
          if (aceptar == "Aceptar"){
              cambio_estado="Finalizado";
             
          }
          else if (aceptar == "Rechazar"){
            cambio_estado="Sin Carga";
          }
       
    } 

    const new_asigna2 = {
      estado:cambio_estado,
      fecha:fecha,        
      user_id:user,
      formato_id:id_formato,
      descripcion
  
   };  

   const result9 = await pool.query('UPDATE formatos SET estado_proceso= ? WHERE id= ?', [cambio_estado, id_formato]);
   const campos = await pool.query('INSERT estado_formatos SET ? ', new_asigna2); 



 


  //res.redirect('/monitoreo/aceptar_admin/' + [id_formato]);
  res.redirect('/monitoreo/list');
});


  module.exports = router;


