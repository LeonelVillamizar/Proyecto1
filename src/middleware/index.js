function logErrors(err, _, __, next) {
    console.error(err.stack);
    next(err);
}

function clientErrorHandler(err, req, res, next) {
    req.xhr ? res.status(500).send({ error: 'Something went wrong' }) : next(err);
}