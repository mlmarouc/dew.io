const form = document.querySelector('.search-form');
const inputValue = document.querySelector('.inputValue');
const clearButton = document.querySelector('.clear-button');
const suggestionsList = document.querySelector('.suggestions');
const displayContainer = document.querySelector('.display');
const runMessage = document.querySelector('.runMessage');
const cityName = document.querySelector('.name');
const desc = document.querySelector('.desc');
const icon = document.querySelector('.icon');
const temp = document.querySelector('.temp');
const feelsLike = document.querySelector('.feelsLike');
const humid = document.querySelector('.humid');
const dew = document.querySelector('.dew');
const dewDescriptionElement = document.querySelector('.dewDescription');
const cardMessage = document.querySelector('.card-message');
const messageIcon = document.querySelector('.message-icon');
const errorElement = document.querySelector('.error');

document.getElementById('currentYear').textContent = new Date().getFullYear();

function dewPointCommentary(dewPoint) {
  if (dewPoint < 55) {
    return ['Dry. Running is unaffected.', 'Run. Run like the bitch you are!'];
  } else if (dewPoint < 60) {
    return ['Dry and comfortable.', 'Easy peasy. Easy runs are a breeze, but hard ones might break a sweat.'];
  } else if (dewPoint < 65) {
    return ['Getting sticky.', 'Whew. Easy runs are tricksy, and hard ones are a workout.'];
  } else if (dewPoint < 70) {
    return ['Unpleasant. Lots of moisture in the air.', 'Ew. Easy runs are a struggle, and hard ones are like a sauna. Sweaty spaghetti.'];
  } else if (dewPoint < 75) {
    return ['Uncomfortable and oppressive.', "Satan's taint. Prepare yourself. Easy runs are tough and hard runs will be like running into Mordor."];
  } else if (dewPoint < 80) {
    return ['Danger.', 'Dead. Run on the treadmill.'];
  }
  return ['Deadly.', 'You died. Continue | Load Game'];
}

// Splits a message into its first sentence (the "lead") and the rest, so the
// lead can be styled as a short bold heading above the supporting text.
function splitMessage(message) {
  const match = message.match(/^([^.!?]*[.!?])\s*([\s\S]*)$/);
  if (!match) return [message, ''];
  return [match[1], match[2]];
}

const SEVERITY_CLASSES = ['severity-good', 'severity-caution', 'severity-danger'];

function dewSeverity(dewPoint) {
  if (dewPoint < 60) return 'severity-good';
  if (dewPoint < 70) return 'severity-caution';
  return 'severity-danger';
}

async function fetchWeatherData(params, label) {
  errorElement.textContent = '';
  try {
    const response = await fetch(`/api/weather?${new URLSearchParams(params)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unknown error');
    }

    const tempValue = Math.round(data.temperature);
    const feelsLikeValue = Math.round(data.apparentTemperature);
    const humidValue = Math.round(data.humidity);
    const dewPoint = Math.round(data.dewPoint);
    const [dewDescription, message] = dewPointCommentary(dewPoint);
    const [messageLead, messageRest] = splitMessage(message);
    const severityClass = dewSeverity(dewPoint);

    cityName.textContent = label || formatSuggestion({ name: data.name, state: data.state, country: data.country });
    temp.textContent = `${tempValue}°F`;
    feelsLike.textContent = `Feels like ${feelsLikeValue}°`;
    desc.textContent = data.description;
    humid.textContent = `${humidValue}%`;
    dew.textContent = `${dewPoint}°`;
    dewDescriptionElement.textContent = dewDescription;
    runMessage.innerHTML = messageRest
      ? `<span class="message-lead">${messageLead}</span>${messageRest}`
      : `<span class="message-lead">${messageLead}</span>`;

    dew.classList.remove(...SEVERITY_CLASSES);
    dew.classList.add(severityClass);
    cardMessage.classList.remove(...SEVERITY_CLASSES);
    cardMessage.classList.add(severityClass);
    runMessage.querySelector('.message-lead').classList.add(severityClass);
    messageIcon.classList.remove(...SEVERITY_CLASSES);
    messageIcon.classList.add(severityClass);

    icon.textContent = data.icon;
    icon.setAttribute('aria-label', data.description);

    displayContainer.hidden = false;
    errorElement.textContent = '';
  } catch (err) {
    console.error('Error fetching weather data:', err);
  }
}

async function handleUserInput() {
  hideSuggestions();
  const query = inputValue.value.trim();
  if (!query) {
    errorElement.textContent = 'Please enter a city name or zip code.';
    return;
  }
  await fetchWeatherData({ q: query });
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  await handleUserInput();
});

clearButton.addEventListener('click', () => {
  inputValue.value = '';
  clearButton.hidden = true;
  hideSuggestions();
  inputValue.focus();
});

// --- City autocomplete ---

const US_STATE_ABBREVIATIONS = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH',
  Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'District of Columbia': 'DC',
};

let currentSuggestions = [];
let activeSuggestionIndex = -1;
let suggestionsAbortController = null;
let suggestionDebounce = null;

function formatSuggestion(item) {
  if (item.country === 'US') {
    const abbreviation = US_STATE_ABBREVIATIONS[item.state] || item.state;
    return [item.name, abbreviation].filter(Boolean).join(', ');
  }
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
  const label = formatSuggestion(item);
  inputValue.value = label;
  clearButton.hidden = false;
  hideSuggestions();
  await fetchWeatherData({ lat: item.lat, lon: item.lon }, label);
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
  clearButton.hidden = inputValue.value.length === 0;
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
