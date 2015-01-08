ko.bindingProvider.instance = new StringInterpolatingBindingProvider();

var availableRoles = [
  {value: 'ingest', text: 'ingest'},
  {value: 'mixer', text: 'mixer'},
  {value: 'record', text: 'record'},
  {value: 'stream', text: 'stream'}
];

//-- yuck
var roleDisplay = function(value, sourceData) {
  var checked = $.fn.editableutils.itemsByValue(value, sourceData);
       
  if(checked.length) {
    var selectedRoles = "";
    
    checked.forEach(function(value) { 
      selectedRoles += 
        "<li><span class='label label-info'>" +
          $.fn.editableutils.escape(value.text) + 
        "</span></li>";
    });
    $(this).html('<ul class="list-inline">' + selectedRoles + '</ul>');
  } else {
    $(this).empty(); 
  }
};

var vm = {
  stations: ko.mapping.fromJS([]),
};

var availableDevices = function(station) {
  if (station.devices) {
  
    var allDevices = station.devices();
    
    if (station.settings.devices && station.settings.devices().length) {
      var configuredDevices = station.settings.devices() || [];
      configuredDevices = configuredDevices.map(function(item) {
        return item.id();
      });
      
      var availableDevices = allDevices.filter(function(item) {
        if (configuredDevices.indexOf(Object.keys(item)[0]) == -1) {
          return item;
        }
      });
      return availableDevices;
    }
    return allDevices;
  }
  return [];
};

var activeStatus = function(station) {

  var list = [];
  if (station.status) {
    for (var i in station.status) {
      list.push(station.status[i]);
    }
  }
  return list;
  /*
  if (station.status) {
    for( var i in station.status ) {
      station.status[i].name = i;

        // this is a hack, fix the manager so that running is populated properly
        // done enough yak shaving for one conference...
        if (typeof station.status[i].running == 'undefined') {
          station.status[i].running = '0';
        }
        if (typeof station.status[i].type == 'undefined') {
          station.status[i].type = 'internal';
        }
        // end nasty hack

      statusArray.push(station.status[i]);
    }
  }
  return statusArray;
  */
};

vm.roomDuplicates = ko.computed(function() {
  return vm.stations().map(function(item) {
    return (item.settings.room ? item.settings.room() : '');
  });
});

vm.rooms = ko.computed(function() {
  var onlyUnique = function (value, index, self) { 
    return self.indexOf(value) === index;
  };
  return vm.roomDuplicates().filter(onlyUnique);
});

ko.applyBindings(vm);

var socket = io.connect('//');
var mapping = {};

$.get( "/api/station", function( data ) {
})
  .done(function(data) {
    ko.mapping.fromJS(data, mapping, vm.stations);
    socket.on('change', function (data) {
      console.log(data);
      if (data.type == 'remove') {
        vm.stations.mappedRemove({id: data.content._id});
      }
      if (data.type == 'insert') {
        vm.stations.push(ko.mapping.fromJS(data.content, mapping));
      }
      if (data.type == 'update') {
        var match = ko.utils.arrayFirst(vm.stations(), function (item) {
            return item._id() == data.content._id;
        });
        if (match) {
          ko.mapping.fromJS(data.content, mapping, match);
        }
        if (!data.content.settings.devices && match.settings.devices) {
          match.settings.devices([]);
        }

      }
      if (data.type == 'notify') {
      }

    });
  });

var removeDevice = function (configuredDevices, macaddress, id) {
  var update = ko.toJS(configuredDevices).filter(function(device) {
    return device.id !== id;
  });
  
  $.ajax({
    url: "/api/station/"+ macaddress + '/partial',
    type: 'POST',
    data: {
      key: 'settings.devices',
      value: update
    }
  })
    .done(function(id) {
      console.log( "removed device ", id );
    });
};

var availableDeviceClick = function (item, configured, macaddress) {
  var value = ko.toJS(item);
  var devices = ko.toJS(configured) || [];
  if (devices == 'all') {
    devices = [];
  }
  devices.push(value);
  
  var post = {};
  post.key = "settings.devices";
  post.value = devices;
  
  $.ajax({
    url: '/api/station/' + macaddress() + '/partial',
    type: 'POST',
    data: post 
  });
};

var actionStationManagers = function(roomId, action) {
  ko.utils.arrayForEach(vm.stations(), function(station) {
    if (station.settings.room() === roomId) {
      var post = new Object({});
      post.station_macaddress = station.settings.macaddress();
      post.id = "Station";
      post.command_url = "manager";
      post.action = action;
      actionStationPost(post);
    }
  });
};

var actionStations = function(roomId, action) {
  ko.utils.arrayForEach(vm.stations(), function(station) {
    if (station.settings.room() === roomId) {
      var post = new Object({});
      post.station_macaddress = station.settings.macaddress();
      post.id = "all";
      post.command_url = "command";
      post.action = action;
      actionStationPost(post);
    }
  });
};

var actionStationManager = function(macaddress, action) {
  var post = new Object({});
  post.station_macaddress = macaddress;
  post.id = "Station";
  post.command_url = "manager";
  post.action = action;
  actionStationPost(post);
};

$("body").on("click", ".actionOnclick", function (e) {
  var post = new Object({});
  post.station_macaddress = $(e.currentTarget).closest("[data-macaddress]").data('macaddress');
  post.id = $(e.currentTarget).data('id');
  post.command_url = "command";
  post.action = $(e.currentTarget).data('action');
  actionStationPost(post);
});

var actionDevice = function(macaddress, device, action) {
  var post = new Object({});
  post.station_macaddress = macaddress;
  post.id = device;
  post.command_url = "command";
  post.action = action;
  actionStationPost(post);
};

var actionStationPost = function(post) {
  console.log(post);
  $.ajax({
    url: '/api/station/' + post.station_macaddress + '/action',
    type: 'POST',
    data: post 
  });
};

var removeStation = function(data, event) {
  $.ajax({
    url: "/api/station/"+ data.settings.macaddress(),
    type: 'DELETE'
  })
    .done(function(data) {
      console.log( "removed station", JSON.stringify(data) );
    });
};

var removeStationRoom = function(data, event) {
  $.ajax({
    url: "/api/station/"+ data.settings.macaddress()  + '/partial',
    type: 'POST',
    data: {
      key: 'settings.room',
      value: ''
    }
  })
    .done(function(data) {
      console.log( "removed station", JSON.stringify(data) );
    });
};

function submitStation(data, event) {
  var $form = $(event.currentTarget).parents('#add-station');

  $.ajax({
    type: "POST",
    url: "/api/station",
    data: data,
  })
    .done(function() {
      $form.collapse('hide');
    });
}   

var macRewrite = function(macaddress) {
  if (!macaddress) { return false; }
  return macaddress.replace(/-\s*/g, ":");
};
