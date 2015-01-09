var db = require('../../lib/db');
var station = require('../../lib/station');

var express = require('express');
var router = express.Router();

router.use('/station', require('./stations'));

router.post('/station/:id/partial', function(req, res, next) {
  var query = {};
  query['settings.macaddress'] = req.params.id;
  
  partial = {};
  if (req.body instanceof Array) { 
    for (var i in req.body) {
      partial[req.body[i].key] = req.body[i].value;
    }
  }
  else {
    partial[req.body.key] = req.body.value;
  }
  
  db.update('stations', query, partial, function (error, doc) {
    if (error) {
      res.status(500).send();
    }
    if (doc) {
      if (!req.headers['station-mgr']){
        station.update(doc);
      }
      res.status(200).send(partial);
    }
    if (!error && !doc) {
      res.status(404).send();
    }
  });
});

module.exports = router;
