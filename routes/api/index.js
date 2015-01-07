var db = require('../../lib/db');
var station = require('../../lib/station');

var express = require('express');
var router = express.Router();

var tablesDocLookups = {
  stations: {
    valueKey: 'macaddress',
    key: 'settings.macaddress'
  }
};

var tableNames = Object.keys(tablesDocLookups);

router.use('/station', require('./stations'));

router.post('/station/:id/partial', function(req, res, next) {
  var query = {};
  var tableInfo = tablesDocLookups.stations;
  query[tableInfo.key] = req.params.id;
  
  partial = {};
  if (req.body instanceof Array) { 
    for (var i in req.body) {
      partial[req.body[i].key] = req.body[i].value;
    }
  }
  else {
    partial[req.body.key] = req.body.value;
  }
  console.log(req.body.value, partial, req.body)
  
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
