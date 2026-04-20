// Weather widget: 5-day forecast + reverse geocoding (Open-Meteo)
(function(){
  const emojiMap = (code) => {
    if (code === 0) return '☀️';
    if ([1,2].includes(code)) return '🌤️';
    if (code === 3) return '☁️';
    if ([45,48].includes(code)) return '🌫️';
    if ([51,53,55,56,57,80,81,82,61,63,65,66,67].includes(code)) return '🌧️';
    if ([71,73,75,77,85,86].includes(code)) return '❄️';
    if ([95,96,99].includes(code)) return '⛈️';
    return '🌤️';
  };

  const descMap = (code) => {
    if (code === 0) return 'Clear';
    if ([1,2].includes(code)) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if ([45,48].includes(code)) return 'Fog';
    if ([51,53,55,56,57].includes(code)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
    if ([71,73,75,77,85,86].includes(code)) return 'Snow';
    if ([95,96,99].includes(code)) return 'Thunderstorm';
    return 'Weather';
  };

  const $ = id => document.getElementById(id);

  function showError(message) {
    $('weather-desc').textContent = message;
    $('weather-temp').textContent = '--°F';
    $('weather-emoji').textContent = '❓';
    $('weather-city').textContent = '—';
    $('weather-location').textContent = '—';
    $('weather-forecast').setAttribute('aria-hidden','true');
    $('weather-forecast').innerHTML = '';
  }

  function updateWidget(data, lat, lon) {
    const cw = data.current_weather;
    if (!cw) return showError('No data');
    const temp = Math.round(cw.temperature);
    const code = cw.weathercode;
    $('weather-temp').textContent = temp + '°F';
    $('weather-emoji').textContent = emojiMap(code);
    $('weather-desc').textContent = descMap(code);
    const t = new Date(cw.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    $('weather-time').textContent = t;
    // Forecast
    if (data.daily) updateForecast(data.daily);
  }

  function updateForecast(daily) {
    const container = $('weather-forecast');
    container.innerHTML = '';
    const times = daily.time;
    const max = daily.temperature_2m_max;
    const min = daily.temperature_2m_min;
    const codes = daily.weathercode;
    // show next 5 days (or less if not available)
    const count = Math.min(5, times.length);
    for (let i=0;i<count;i++){
      const day = new Date(times[i]).toLocaleDateString([], {weekday:'short'});
      const hi = Math.round(max[i]);
      const lo = Math.round(min[i]);
      const code = codes[i];
      const el = document.createElement('div');
      el.className = 'forecast-day';
      el.innerHTML = `<div class="day">${day}</div><div class="f-emoji">${emojiMap(code)}</div><div class="hi">${hi}°</div><div class="lo">${lo}°</div>`;
      container.appendChild(el);
    }
    container.removeAttribute('aria-hidden');
  }

  function fetchReverseGeocode(lat, lon) {
    const gurl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`;
    fetch(gurl).then(r=>r.json()).then(json=>{
      const coordsText = `Lat:${lat.toFixed(2)}, Lon:${lon.toFixed(2)}`;
      if (json && json.results && json.results.length){
        const p = json.results[0];
        const city = p.name || '';
        const region = p.admin1 || '';
        const country = p.country || '';
        // show city prominently and full place with coords for clarity
        $('weather-city').textContent = city || '—';
        const placeParts = [];
        if (city) placeParts.push(city);
        if (region) placeParts.push(region);
        if (country) placeParts.push(country);
        const place = placeParts.join(', ');
        $('weather-location').textContent = place ? `${place} (${coordsText})` : coordsText;
      } else {
        $('weather-city').textContent = '—';
        $('weather-location').textContent = coordsText;
      }
    }).catch(err=>{
      console.warn('Geocode error', err);
      $('weather-city').textContent = '—';
      $('weather-location').textContent = `Lat:${lat.toFixed(2)}, Lon:${lon.toFixed(2)}`;
    });
  }

  function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto`;
    fetch(url).then(r=>r.json()).then(json=>{
      updateWidget(json, lat, lon);
      fetchReverseGeocode(lat, lon);
    }).catch(err=>{
      console.error('Weather fetch error', err);
      showError('Unable to fetch');
    });
  }

  function fallback() {
    // Default to New York coordinates
    const lat = 40.7128, lon = -74.0060;
    $('weather-desc').textContent = 'Using default location';
    fetchWeather(lat, lon);
  }

  if (!('geolocation' in navigator)) {
    showError('Geolocation not supported');
    fallback();
  } else {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      fetchWeather(lat, lon);
    }, err => {
      // permission denied or timeout
      console.warn('Geolocation error', err);
      if (err.code === 1) {
        $('weather-desc').textContent = 'Enable location to see your weather.';
      } else {
        $('weather-desc').textContent = 'Location unavailable';
      }
      fallback();
    }, {timeout:10000});
  }
})();
