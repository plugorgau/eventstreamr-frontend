var express = require('express');
var router = express.Router();

// catch 404 and forward to error handler
router.use(function(req, res, next) {
    var err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (router.get('env') === 'development') {
  router.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      status: err.status,
      error: err,
      page: {
        url: 'error',
        title: 'Error'
      }
    });
  });
}

// production error handler
// no stacktraces leaked to user
router.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    status: err.status,
    error: {},
    page: {
      url: 'error',
      title: 'Error'
    }
  });
});

module.exports = router;
