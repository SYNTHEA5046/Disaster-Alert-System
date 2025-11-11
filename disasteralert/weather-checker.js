const axios = require('axios');
const fs = require('fs');

const OWM_KEY = process.env.OWM_API_KEY;
function loadLocations(){
  try{
    const raw = fs.readFileSync('locations.json');
    const arr = JSON.parse(raw);
    return arr;
  }catch(e){
    // fallback: parse env as array of {lat,lon}
    return (process.env.MONITOR_LOCATIONS || '').split(',').map(s => {
      const [lat, lon] = s.trim().split(':');
      return lat && lon ? { lat: Number(lat), lon: Number(lon), name: `${lat},${lon}` } : null;
    }).filter(Boolean);
  }
}

function createAlert(type, message, priority='high'){
  return { type, message, priority };
}

async function checkOnce(io){
  if (!OWM_KEY) {
    console.log('OWM_API_KEY not set; skipping weather checks');
    return;
  }

  const LOCATIONS = loadLocations();
  for (const loc of LOCATIONS){
    const { lat, lon, name } = loc;
    if (!lat || !lon) continue;
    try {
      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=metric&appid=${OWM_KEY}`;
      const res = await axios.get(url);
      const data = res.data;

      // Simple rule: if tomorrow's rain >= 30mm => flood alert
      const tomorrow = data.daily && data.daily[1];
      if (tomorrow && (tomorrow.rain || 0) >= 30){
        const alert = createAlert('Flood', `Heavy rain expected (${tomorrow.rain} mm)`, 'high');
        alert.location = name || `${lat},${lon}`;
        pushAlert(alert, io);
      }
      // Example: strong wind
      if (tomorrow && (tomorrow.wind_speed || 0) >= 15){
        const alert = createAlert('Wind', `Strong winds expected (${tomorrow.wind_speed} m/s)`, 'medium');
        alert.location = name || `${lat},${lon}`;
        pushAlert(alert, io);
      }
    } catch (e){
      console.log('weather check failed for', lat + ',' + lon, e.message);
    }
  }
}

function pushAlert(alert, io){
  // Append to alerts.json
  let alerts = [];
  try{ alerts = JSON.parse(fs.readFileSync('alerts.json')); } catch(e){ alerts = []; }
  alerts.push(alert);
  fs.writeFileSync('alerts.json', JSON.stringify(alerts, null, 2));
  if (io && io.emit) io.emit('alert', alert);
  console.log('Created alert from weather-checker:', alert.type, alert.message);
}

function start(io){
  // run once immediately, then every hour
  checkOnce(io);
  setInterval(() => checkOnce(io), 1000 * 60 * 60);
}

module.exports = { start };
