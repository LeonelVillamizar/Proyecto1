const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const pool = require('../../src/services/database/database');
const helpers = require('./helpers');


passport.use('local.signin', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async(req, username, password, done) => {
    const rows = await pool.query('SELECT u.id AS id, u.username AS username, u.password AS password,u.name AS name, u.lastname AS lastname, t.name AS tipo_user,c.active AS estado FROM users AS u INNER JOIN compania AS c ON c.id = u.compania_id INNER JOIN tipo_users AS t ON t.id = u.tipou_id WHERE  c.active = 1 AND u.active = 1 AND u.username = ?', [username]);
    if (rows.length > 0) {
        const user = rows[0]; // guardo el usuario que he encontrado
        const validPassword = await helpers.matchPassword(password, user.password)
            // genera un falso o verdadero
            //(matchPassword) me compara las contraseñas
        if (validPassword) {
            done(null, user, req.flash('success', 'Bienvenido! ' + user.username + ' Nombre y Apellido ' + user.name + ' ' + user.lastname + ' rol: ' + user.tipo_user));
        } else {
            done(null, false, req.flash('message', 'Clave Incorrecta'));
        }
    } else {
        return done(null, false, req.flash('message', 'El usuario no existe o está inactivo.'));
    }

}));

passport.use('local.signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async(req, username, password, done) => {
    const { name, lastname, telephone, cellphone, address, number_id, } = req.body; // solo se agregan los campos que vienen del formulario
    let newUser = {
        username,
        password,
        name,
        lastname,
        telephone,
        cellphone,
        address,
        password,
        number_id,
        compania_id: req.user.compania_id,
        tipou_id: 1,
        tipo_id: 1
    };
    newUser.password = await helpers.encryptPassword(password);
    // Saving in the Database
    const result = await pool.query('INSERT INTO users SET ? ', newUser);
    newUser.id = result.insertId;
    return done(null, newUser);
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    const rows = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
});