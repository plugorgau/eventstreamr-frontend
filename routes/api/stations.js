var db = require('../../lib/db');
var station = require('../../lib/station');

var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  db.list('stations', {}, function (error, docs) {
    if (error) {
      res.status(500).send(err);
    }
    if (docs) {
      res.send(docs);
    }
  });
});

router.get('/:id', function(req, res, next) {
  var query = {};
  var tableInfo = tablesDocLookups.station;
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
});


var tablesDocLookups = {
  stations: {
    valueKey: 'macaddress',
    key: 'settings.macaddress'
  }
};

var tableNames = Object.keys(tablesDocLookups);

var insertStation = function(settings, ip, callback) {
  var document = {
    ip: ip || null,
    settings: settings
  };
  db.insert('stations', document, callback);
};

var StationSettings = function(request) {
  if (request.roles && typeof request.roles == 'string') {
    request.roles = [request.roles];
  }
  return {
    macaddress: request.macaddress,
    roles: request.roles || [],
    room: request.room || '',
    devices: request.devices || [],
    nickname: request.nickname,
    record_path: request.record_path || null,
    mixer: request.mixer || null,
    stream: request.stream || null,
    sync: request.sync || null,
    run: request.run || 0,
    device_control: request.device_control || null
  };
};

router.post('/', function(req, res) {
  if (!req.body.macaddress) {
    var error = new Error('Mac Address required');
    return res.status(400).send(error);
  }
  db.get('stations', { 'settings.macaddress': req.body.macaddress }, function (error, doc) {
    
    if (req.headers['station-mgr']) {
      req.body.ip = req.ip;
    }
    
    var settings = new StationSettings(req.body);
    if (!error && doc === null) {
      insertStation(settings, req.body.ip, function(error, success) {
        if (error) {
          res.status(500).send(error);
        }
        if (success) {
          res.status(200).send(true);
        }
      });
    }
    if (doc) {
      db.updateRaw('stations', { "settings.macaddress": req.body.macaddress }, { $set: { "settings": settings } }, function(error, success) {
        if (error) {
          res.status(500).send(error);
        }
        if (success) {
          res.status(200).send(true);
        }
      });
    }
    if (error) {
      console.log(error);
      res.send(500, error);
    }
  });
});

router.post("/:macaddress", function(req, res) {
  db.get('stations', { 'settings.macaddress': req.params.macaddress }, function (error, doc) {
    if (doc === null) {
      var station = new StationSettings({macaddress: req.params.macaddress});
      insertStation(station, req.ip, function(error, success) {
        if (success) {
          res.status(201).send();
        }
      });
    }
    if (doc) {
      if (doc.ip !== req.ip) {
        db.updateRaw('stations', { ip: req.ip }, { $unset: { ip: true } }, function () {});
        db.updateRaw('stations', { "settings.macaddress": req.params.macaddress }, { $set: { ip: req.ip } }, function () {});
      }
      res.status(200).send(doc);
    }
  });
});

router.post("/:macaddress/action", function(req, res) {
  db.get('stations', { 'settings.macaddress': req.params.macaddress }, function (error, doc) {
    var partial = {};
    var query = {};
    var dbwrite = '';
    var tableInfo = tablesDocLookups.stations;
    query[tableInfo.key] = req.params.macaddress;
    if (req.body.id == 'all' && req.body.command_url == 'command') {
      req.body.key = 'settings.run';
      dbwrite = '1';
    } else if (req.body.command_url == 'command') {
      req.body.key = 'settings.device_control.' + req.body.id  + '.run';
      dbwrite = '1';
    }
    
    if(dbwrite) {
      switch(req.body.action) {
        case 'start':
          req.body.value = '1';
          break;
        case 'stop':
          req.body.value = '0';
          break;
        case 'restart':
          req.body.value = '2';
          break;
        default:
          // if all else fails the room/device must run
          req.body.value = '1';
      }
    }
    
    partial[req.body.key] = req.body.value;
    
    if (doc === null) {
      res.status(204).send();
    }
    if (doc) {
      station.action(req.body, doc);
      if (dbwrite) {
        console.log(partial);
        console.log("Writing our state to the db");
        db.update('stations', query, partial, function (error, doc) {
          if (error) {
            res.status(500).send();
          }
          if (doc) {
            console.log("Written");
            res.status(200).send(doc);
          }
          if (!error && !doc) {
            res.status(404).send();
          }
        });
      } else {
        res.send(200,true);
      }
    }
  });
});

router.delete('/:macaddress', function(req, res){
  db.remove('stations', {'settings.macaddress': req.params.macaddress}, function(error, removed) {
    if (removed) {
      res.status(204).send(true);
    }
  });
});

module.exports = router;
