  // exporta objeto para identificar si el usuario está autenticado
  module.exports = {

      isLoggedIn(req, res, next) {
          // metodo de passport para identificar si la sesiòn existe true or false
          if (req.isAuthenticated()) {
              return next();
          }
          return res.redirect('/signin');
      },

      isNotLoggedIn(req, res, next) {
          // metodo de passport para identificar si la sesiòn existe true or false
          if (!req.isAuthenticated()) {
              return next();
          }
          return res.redirect('/');
      }

  };