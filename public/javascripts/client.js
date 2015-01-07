ko.bindingProvider.instance = new StringInterpolatingBindingProvider();

var availableRoles = [
  {value: 'ingest', text: 'ingest'},
  {value: 'mixer', text: 'mixer'},
  {value: 'record', text: 'record'},
  {value: 'stream', text: 'stream'}
];

//-- yuck
var roleDisplay = function(value, sourceData) {
   var selectedRoles = "",
       checked = $.fn.editableutils.itemsByValue(value, sourceData);
       
   if(checked.length) {
     $.each(checked, function(i, v) { 
       selectedRoles += "<li><span class='label label-info'>" + $.fn.editableutils.escape(v.text) + "</span></li>";
     });
     $(this).html('<ul class="list-inline">' + selectedRoles + '</ul>');
   } else {
     $(this).empty(); 
   }
};

var vm = {
  stations: ko.mapping.fromJS([]),
};

var statusArray = function(options) {
  // makes interface easier to write if status is an array of objects, 
  // but easier for the manager to keep it internally as an object of objects
  // can later make this observable to prevent updating the full interface (push, match station, update just status)

  var statusArray = [];
  for( var i in options.data.status ) {
    if (options.data.status.hasOwnProperty(i)){
      options.data.status[i].name = i;

        // this is a hack, fix the manager so that running is populated properly
        // done enough yak shaving for one conference...
        if (typeof options.data.status[i].running == 'undefined') {
          options.data.status[i].running = '0';
        }
        if (typeof options.data.status[i].type == 'undefined') {
          options.data.status[i].type = 'internal';
        }
        // end nasty hack

      statusArray.push(options.data.status[i]);
    }
  }

  return statusArray;
};

var availableDevices = function(station) {
  
  var allDevices = station.devices;
  var configuredDevices = station.settings.devices || [];
  configuredDevices = configuredDevices.map(function(item) {
    return item.id;
  });
  
  var availableDevices = allDevices.filter(function(item) {
      return configuredDevices.indexOf(item.id) == -1;
  });
  
  return availableDevices;
};

var mapping = {
  update: function(options) {
    var innerModel = ko.mapping.fromJS(options.data);
    
    
    // availableDevices
    if (options.data.devices) {
      try {
        innerModel.availableDevices = availableDevices(options.data);
      }
      catch(err) {
        console.log(err);
        console.log("station devices broken, update the station!");
      }
      finally {
        console.log("Available devices populated successfully!");
      }
    }
    
    // statusArray
    if (options.data.status) {
      innerModel.statusArray = statusArray(options);
      console.log(options.data.status);
    } else {
      innerModel.statusArray = [];
    }
    return innerModel;
  }
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
        vm.stations.splice(
          vm.stations.indexOf(match),
          1,
          ko.mapping.fromJS(data.content, mapping)
        );

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
