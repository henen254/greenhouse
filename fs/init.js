//load('api_aws.js');
//load('api_azure.js');
load('api_config.js');
load('api_dash.js');
load('api_events.js');
load('api_gcp.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_watson.js');
load('api_adc.js');
load('api_http.js');
load('api_rpc.js');
load('api_dht.js');
load('api_net.js');
load('api_esp32.js');





//let btn = Cfg.get('board.btn1.pin');              // Built-in button GPIO
//let led = Cfg.get('board.led1.pin');              // Built-in LED GPIO number
//let onhi = Cfg.get('board.led1.active_high');     // LED on when high?
let state = {on: false, btnCount: 0, uptime: 0};  // Device state
let online = false;                               // Connected to the cloud?
let ADC33 = 33;
let ADC35 = 35;
let dhtPin = 22;
let deviceId = Cfg.get("device.id");

ADC.enable(ADC33);
ADC.enable(ADC35);
let dht = DHT.create(dhtPin, DHT.DHT11);

let readSensors = Timer.set(300, Timer.REPEAT, function() {
  state.ADC33=ADC.read(ADC33);
  state.ADC35=ADC.read(ADC35);
  state.temp=dht.getTemp();
  state.humidity=dht.getHumidity();
}, null);

RPC.addHandler('ADC33', function(args) {
    return state.ADC33;
});

RPC.addHandler('ADC35', function(args) {
  return state.ADC35;
});

let saveSensors = Timer.set(60*1000, Timer.REPEAT, function() {

  HTTP.query({
    url: 'http://kiefershohe.nimling.com/sensordata/toinflux.php?temp='+JSON.stringify(state.temp)+'&moist='+JSON.stringify(state.ADC33)+'&dev='+JSON.stringify(deviceId+'_1')+'_1&hum='+JSON.stringify(state.humidity),  // replace with your own endpoint',
    success: function(body, full_http_msg) { print(body); }
    //error: function(err) { print(err); },  // Optional
  });
  HTTP.query({
    url: 'http://kiefershohe.nimling.com/sensordata/toinflux.php?temp='+JSON.stringify(state.temp)+'&moist='+JSON.stringify(state.ADC35)+'&dev='+JSON.stringify(deviceId+'_2')+'&hum='+JSON.stringify(state.humidity),  // replace with your own endpoint',
    success: function(body, full_http_msg) { print(body); }
    //error: function(err) { print(err); },  // Optional
  });


}, null);

RPC.addHandler('DHT', function(args) {
  return state.dht;
});

let reportState = function() {
  Shadow.update(0, state);
};

// Update state every second, and report to cloud if online
Timer.set(60*1000, Timer.REPEAT, function() {
  state.uptime = Sys.uptime();
  state.ram_free = Sys.free_ram();
  print('online:', online, JSON.stringify(state));
  if (online) reportState();
}, null);

// Set up Shadow handler to synchronise device state with the shadow state
Shadow.addHandler(function(event, obj) {
  if (event === 'UPDATE_DELTA') {
    print('GOT DELTA:', JSON.stringify(obj));
    for (let key in obj) {  // Iterate over all keys in delta
      if (key === 'on') {   // We know about the 'on' key. Handle it!
        state.on = obj.on;  // Synchronise the state
        //setLED(state.on);   // according to the delta
      } else if (key === 'reboot') {
        state.reboot = obj.reboot;      // Reboot button clicked: that
        Timer.set(750, 0, function() {  // incremented 'reboot' counter
          Sys.reboot();                 // Sync and schedule a reboot
        }, null);
      }
    }
    reportState();  // Report our new state, hopefully clearing delta
  }
});



Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
  Shadow.update(0, {ram_total: Sys.total_ram()});
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);
