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

router.get('/:db', function(req, res) {
  if (tableNames.indexOf(req.params.db) !== -1) {
    db.list(req.params.db, {}, function (error, docs) {
      if (error) {
        res.send(500, err);
      }
      if (docs) {
        res.send(docs);
      }
    });
  }
  else {
    res.send(404);
  }
});

router.get('/:db/:id', function(req, res, next) {
  if (tableNames.indexOf(req.params.db) !== -1) {
    var query = {};
    var tableInfo = tablesDocLookups[req.params.db];
    query[tableInfo.key] = req.params.id;
    db.get(req.params.db, query, function (error, doc) {
      if (error) {
        res.send(500, error);
      }
      if (doc === null) {
        res.send(404, tableInfo);
      }
      if (doc) {
        res.send(200, doc);
      }
    });
  }
  else {
    res.send(404);
  }
});

router.post('/:db/:id/partial', function(req, res, next) {
  if (tableNames.indexOf(req.params.db) !== -1) {
    var query = {};
    var tableInfo = tablesDocLookups[req.params.db];
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
    
    db.update(req.params.db, query, partial, function (error, doc) {
      if (error) {
        res.send(500);
      }
      if (doc) {
        if (!req.headers['station-mgr']){
          station.update(doc);
        }
        res.send(200, partial);
      }
      if (!error && !doc) {
        res.send(404);
      }
    });
  }  
  else {
    res.send(404);
  }
});

module.exports = router;
