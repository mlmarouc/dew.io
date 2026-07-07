const form = document.querySelector('.search-form');
const inputValue = document.querySelector('.inputValue');
const suggestionsList = document.querySelector('.suggestions');
const displayContainer = document.querySelector('.display');
const runMessage = document.querySelector('.runMessage');
const cityName = document.querySelector('.name');
const desc = document.querySelector('.desc');
const icon = document.querySelector('.icon');
const temp = document.querySelector('.temp');
const humid = document.querySelector('.humid');
const dew = document.querySelector('.dew');
const geolocationElement = document.querySelector('.geolocation');
const errorElement = document.querySelector('.error');

document.getElementById('currentYear').textContent = new Date().getFullYear();

function calculateDewPoint(temperatureF, humidity) {
  const tempC = (temperatureF - 32) * 5 / 9;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100.0);
  const dewPointC = (b * alpha) / (a - alpha);
  const dewPointF = (dewPointC * 9 / 5) + 32;
  return Math.round(dewPointF);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function capitalizeFirstLetters(string) {
  return string.split(' ').map(capitalizeFirstLetter).join(' ');
}

function dewPointCommentary(dewPoint) {
  if (dewPoint < 55) {
    return ['Dry. Running is unaffected.', 'Run your little heart out!'];
  } else if (dewPoint < 60) {
    return ['Dry and comfortable.', 'Easy runs are a breeze, but hard ones might break a sweat.'];
  } else if (dewPoint < 65) {
    return ['Getting sticky.', 'Easy runs are tricksy, and hard ones are a workout.'];
  } else if (dewPoint < 70) {
    return ['Unpleasant. Lots of moisture in the air.', 'Ew. Easy runs are a struggle, and hard ones are like a sauna. Sweaty spaghetti.'];
  } else if (dewPoint < 75) {
    return ['Uncomfortable and oppressive.', 'Prepare yourself. Easy runs are tough and hard runs will be like running into Mordor.'];
  } else if (dewPoint < 80) {
    return ['Dangerous. Hard runs not recommended.', 'Danger zone! Run at your own risk.'];
  }
  return ['Deadly. Running not recommended.', "Running not recommended. It's brutally muggy out there. Save yourself."];
}

async function fetchWeatherData(params) {
  errorElement.textContent = '';
  try {
    const response = await fetch(`/api/weather?${new URLSearchParams(params)}`);
    const data = await response.json();

    if (data.cod !== 200 && data.cod !== '200') {
      throw new Error(data.message || 'Unknown error');
    }

    const tempValue = Math.round((data.main.temp - 273.15) * 9 / 5 + 32);
    const humidValue = data.main.humidity;
    const dewPoint = calculateDewPoint(tempValue, humidValue);
    const [dewDescription, message] = dewPointCommentary(dewPoint);

    cityName.textContent = capitalizeFirstLetter(data.name);
    temp.textContent = `Temperature: ${tempValue}°F`;
    desc.textContent = capitalizeFirstLetters(data.weather[0].description);
    humid.textContent = `Humidity: ${humidValue}%`;
    dew.innerHTML = `Dew point: ${dewPoint}°<br>${dewDescription}`;
    runMessage.textContent = message;

    icon.replaceChildren();
    const iconElement = document.createElement('img');
    iconElement.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
    iconElement.alt = data.weather[0].description;
    icon.appendChild(iconElement);

    displayContainer.hidden = false;
    errorElement.textContent = '';
  } catch (err) {
    console.error('Error fetching weather data:', err);
    errorElement.textContent = 'Search must be in the form of a city or a valid zip code.';
  }
}

async function fetchWeatherByGeolocation() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    const { latitude, longitude } = position.coords;
    await fetchWeatherData({ lat: latitude, lon: longitude });

    if (geolocationElement) {
      geolocationElement.textContent = `Latitude: ${latitude.toFixed(2)}, Longitude: ${longitude.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error getting geolocation:', error);
  }
}

function isZipCode(query) {
  return /^\d{5}$/.test(query);
}

async function handleUserInput() {
  hideSuggestions();
  const query = inputValue.value.trim();
  if (!query) {
    errorElement.textContent = 'Please enter a city name or zip code.';
    return;
  }
  await fetchWeatherData(isZipCode(query) ? { zip: query } : { q: query });
}

window.addEventListener('load', fetchWeatherByGeolocation);

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  await handleUserInput();
});

// --- City autocomplete ---

let currentSuggestions = [];
let activeSuggestionIndex = -1;
let suggestionsAbortController = null;
let suggestionDebounce = null;

function formatSuggestion(item) {
  return [item.name, item.state, item.country].filter(Boolean).join(', ');
}

function hideSuggestions() {
  suggestionsList.hidden = true;
  suggestionsList.replaceChildren();
  currentSuggestions = [];
  activeSuggestionIndex = -1;
  inputValue.setAttribute('aria-expanded', 'false');
  inputValue.removeAttribute('aria-activedescendant');
}

function updateActiveSuggestion() {
  [...suggestionsList.children].forEach((li, index) => {
    const isActive = index === activeSuggestionIndex;
    li.setAttribute('aria-selected', String(isActive));
    li.classList.toggle('active', isActive);
  });
  if (activeSuggestionIndex >= 0) {
    inputValue.setAttribute('aria-activedescendant', `suggestion-${activeSuggestionIndex}`);
  } else {
    inputValue.removeAttribute('aria-activedescendant');
  }
}

async function selectSuggestion(item) {
  inputValue.value = formatSuggestion(item);
  hideSuggestions();
  await fetchWeatherData({ lat: item.lat, lon: item.lon });
}

function renderSuggestions(items) {
  currentSuggestions = items;
  activeSuggestionIndex = -1;
  suggestionsList.replaceChildren();

  if (items.length === 0) {
    hideSuggestions();
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.id = `suggestion-${index}`;
    li.setAttribute('role', 'option');
    li.textContent = formatSuggestion(item);
    li.addEventListener('mousedown', (event) => {
      event.preventDefault();
      selectSuggestion(item);
    });
    suggestionsList.appendChild(li);
  });

  suggestionsList.hidden = false;
  inputValue.setAttribute('aria-expanded', 'true');
}

async function fetchSuggestions(query) {
  if (suggestionsAbortController) {
    suggestionsAbortController.abort();
  }
  suggestionsAbortController = new AbortController();

  try {
    const response = await fetch(`/api/geocode?${new URLSearchParams({ q: query })}`, {
      signal: suggestionsAbortController.signal,
    });
    const data = await response.json();
    renderSuggestions(Array.isArray(data) ? data : []);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error fetching city suggestions:', err);
    }
  }
}

inputValue.addEventListener('input', () => {
  clearTimeout(suggestionDebounce);
  const query = inputValue.value.trim();

  if (!query || query.length < 2 || /^\d+$/.test(query)) {
    hideSuggestions();
    return;
  }

  suggestionDebounce = setTimeout(() => fetchSuggestions(query), 300);
});

inputValue.addEventListener('keydown', (event) => {
  if (suggestionsList.hidden) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
    updateActiveSuggestion();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
    updateActiveSuggestion();
  } else if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
    event.preventDefault();
    selectSuggestion(currentSuggestions[activeSuggestionIndex]);
  } else if (event.key === 'Escape') {
    hideSuggestions();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.input-group')) {
    hideSuggestions();
  }
});
