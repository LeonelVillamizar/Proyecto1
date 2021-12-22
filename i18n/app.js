require("dotenv").config();
const generalRouter = require('./apiServices/routes/index')
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
const flash = require('connect-flash');
const passport = require('passport');
const MySQLStore = require('express-mysql-session');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
var methodOverride = require('method-override');
var http = require('http').Server(app);
var validator = require('express-validator');

const { database } = require('./src/services/database/keys');

// Initializations
require('./apiServices/auth/passport');
require("./apiServices/aws/aws");


var i18n = require("i18n-express");
app.use(bodyParser.json({limit: "50mb"}));
var urlencodeParser = bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000});

// settings
app.set('port', process.env.PORT || 2000);
app.set('views', path.join(__dirname, 'views'));

app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: require('./apiServices/auth/handlebars')
}));
app.set('view engine', '.hbs');

//Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride());
app.use(session({
    key: 'user_sid',
    //secret: 'somerandonstuffs',
    secret: process.env.SESSION_SECRET, //
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(database),
    cookie: {
      expires: 1200000000
    }
}));

const { renderIndex, uploadFile, getFiles, getSingleFile } = require("./apiServices/aws/controller");
const { upload, s3 } = require('./apiServices/cargar/controllerNube');
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(i18n({
    translationsPath: path.join(__dirname, 'i18n'), // <--- use here. Specify translations files path.
    siteLangs: ["es", "en", "de", "ru", "it"],
    textsVarName: 'translation'
  }));
//app.use(validator());

//Global Variables

app.use((req, res, next) => {
    app.locals.message = req.flash('message');
    app.locals.success = req.flash('success');
    app.locals.user = req.user;
    next();
});

//Routes: aqui importo las rutas
app.use(generalRouter)
// app.use(require('./apiServices/index/controller'));


//Public
//app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static('public'));

// //Starting server
app.listen(app.get('port'), () => console.log(`Server Running on port: ${app.get('port')}`));



app.get('/Pages/pages-404', function (req, res, next) {
    next();
  });
  
  
  app.use(function (req, res, next) {
    var err = new Error('Not found');
    if (err.status = 404) {
      res.status(404);
      let error = new Error(),
        title = "Error 404";
      locals = {
        title: 'Error 404',
        description: "Recurso no encontrado",
        error: error
      }
  
      res.format({
        html: function () {
          res.render('Pages/pages-404', { locals, title })
        },
      })
    }
  
  });