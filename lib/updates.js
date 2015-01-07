var dbFeed = require('./lib/db').feed;
var stationFeed = require('./lib/station').feed;

var io = require('../io');

var updates = io.sockets.on('connection', function (socket) {
  console.log('new change subscriber connected.');
});

dbFeed.on('change', function(info) {
  updates.emit('change', info);
});

stationFeed.on('change', function(info) {
  updates.emit('change', info);
});
