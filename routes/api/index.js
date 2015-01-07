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
        res.status(500).send(err);
      }
      if (docs) {
        res.send(docs);
      }
    });
  }
  else {
    res.status(404).send();
  }
});

router.get('/:db/:id', function(req, res, next) {
  if (tableNames.indexOf(req.params.db) !== -1) {
    var query = {};
    var tableInfo = tablesDocLookups[req.params.db];
    query[tableInfo.key] = req.params.id;
    db.get(req.params.db, query, function (error, doc) {
      if (error) {
        res.status(500).send(error);
      }
      if (doc === null) {
        res.status(404).send(tableInfo);
      }
      if (doc) {
        res.status(200).send(doc);
      }
    });
  }
  else {
    res.status(404).send();
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
  }  
  else {
    res.status(404).send();
  }
});

module.exports = router;
