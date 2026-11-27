
// ==========================================
// WEATHER NOW - WEEK 4
// Saved Cities, localStorage & Preferences
// ==========================================


// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");

const cityNameElement = document.getElementById("city-name");
const currentDescription = document.getElementById("current-description");
const currentIcon = document.getElementById("current-icon");
const currentTemperature = document.getElementById("current-temperature");
const feelsLike = document.getElementById("feels-like");
const humidityElement = document.getElementById("humidity");
const windSpeedElement = document.getElementById("wind-speed");
const forecastList = document.getElementById("forecast-list");

const celsiusButton = document.getElementById("celsius-button");
const fahrenheitButton = document.getElementById("fahrenheit-button");

const saveCityButton = document.getElementById("save-city-button");
const savedCitiesList = document.getElementById("saved-cities-list");


// Application Data
let weatherData = null;
let temperatureUnit = "C";
let savedCities = [];
let currentLocation = null;


// localStorage Keys
const SAVED_CITIES_KEY = "weatherNowSavedCities";
const LAST_CITY_KEY = "weatherNowLastCity";
const UNIT_KEY = "weatherNowTemperatureUnit";


// ==========================================
// LOCAL STORAGE FUNCTIONS
// ==========================================

// Safely read data from localStorage.
function readStorage(key, fallback) {
  try {
    const storedData = localStorage.getItem(key);

    if (storedData === null) {
      return fallback;
    }

    return JSON.parse(storedData);

  } catch (error) {
    console.error("Storage reading error:", error);
    return fallback;
  }
}


// Save favourite cities.
function saveCitiesToStorage() {
  try {
    localStorage.setItem(
      SAVED_CITIES_KEY,
      JSON.stringify(savedCities)
    );

  } catch (error) {
    console.error("Could not save favourite cities:", error);
    showError("Could not save cities. Check your browser storage.");
  }
}


// Save the last searched city.
function saveLastCity(location) {
  try {
    localStorage.setItem(
      LAST_CITY_KEY,
      JSON.stringify(location)
    );

  } catch (error) {
    console.error("Could not save last city:", error);
  }
}


// Save the selected temperature unit.
function saveTemperatureUnit() {
  try {
    localStorage.setItem(UNIT_KEY, temperatureUnit);

  } catch (error) {
    console.error("Could not save temperature unit:", error);
  }
}


// Load and validate favourite cities.
function loadSavedCities() {
  const storedCities = readStorage(SAVED_CITIES_KEY, []);

  if (!Array.isArray(storedCities)) {
    savedCities = [];
    return;
  }

  savedCities = storedCities.filter(function (city) {
    return city &&
      typeof city.name === "string" &&
      typeof city.latitude === "number" &&
      Number.isFinite(city.latitude) &&
      typeof city.longitude === "number" &&
      Number.isFinite(city.longitude) &&
      city.latitude >= -90 &&
      city.latitude <= 90 &&
      city.longitude >= -180 &&
      city.longitude <= 180;
  });

  // Replace invalid or outdated stored data.
  saveCitiesToStorage();
}


// Load the previously selected temperature unit.
function loadTemperatureUnit() {
  const storedUnit = localStorage.getItem(UNIT_KEY);

  if (storedUnit === "F") {
    temperatureUnit = "F";
  } else {
    temperatureUnit = "C";
  }

  updateUnitButtons();
}


// ==========================================
// WEATHER CODE MAPPING
// ==========================================

function getWeatherInfo(code) {
  if (code === 0) return { description: "Clear sky", emoji: "☀️" };
  if (code === 1) return { description: "Mainly clear", emoji: "🌤️" };
  if (code === 2) return { description: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { description: "Overcast", emoji: "☁️" };
  if ([45, 48].includes(code)) return { description: "Fog", emoji: "🌫️" };
  if ([51, 53, 55].includes(code)) return { description: "Drizzle", emoji: "🌦️" };
  if ([56, 57].includes(code)) return { description: "Freezing drizzle", emoji: "🌧️" };
  if ([61, 63, 65].includes(code)) return { description: "Rain", emoji: "🌧️" };
  if ([66, 67].includes(code)) return { description: "Freezing rain", emoji: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { description: "Snow", emoji: "❄️" };
  if ([80, 81, 82].includes(code)) return { description: "Rain showers", emoji: "🌦️" };
  if ([85, 86].includes(code)) return { description: "Snow showers", emoji: "🌨️" };
  if ([95, 96, 99].includes(code)) return { description: "Thunderstorm", emoji: "⛈️" };

  return { description: "Weather unavailable", emoji: "🌡️" };
}


// ==========================================
// TEMPERATURE CONVERSION
// ==========================================

function convertTemperature(celsius) {
  if (temperatureUnit === "F") {
    return Math.round((celsius * 9 / 5) + 32);
  }

  return Math.round(celsius);
}


function updateUnitButtons() {
  const isCelsius = temperatureUnit === "C";

  celsiusButton.classList.toggle("active", isCelsius);
  fahrenheitButton.classList.toggle("active", !isCelsius);

  celsiusButton.setAttribute("aria-pressed", String(isCelsius));
  fahrenheitButton.setAttribute("aria-pressed", String(!isCelsius));
}


// ==========================================
// OPEN-METEO API FUNCTIONS
// ==========================================

// First API call: Get city coordinates.
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not search for this city. Please try again.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}


// Second API call: Get current weather and forecast.
async function getWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather data could not be loaded. Please try again.");
  }

  return await response.json();
}


// ==========================================
// LOADING AND ERROR MESSAGES
// ==========================================

function showLoading() {
  statusMessage.textContent = "Loading weather data...";
  statusMessage.className = "status-message";

  searchButton.disabled = true;
  searchButton.textContent = "Loading...";
}


function hideLoading() {
  searchButton.disabled = false;
  searchButton.textContent = "Search";
}


function showError(message) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message error";
}


// ==========================================
// CITY INFORMATION
// ==========================================

function formatCityName(location) {
  const parts = [location.name];

  if (location.admin1 && location.admin1 !== location.name) {
    parts.push(location.admin1);
  }

  if (location.country_code) {
    parts.push(location.country_code);
  }

  return parts.join(", ");
}


// Create a clean object for storing a city.
function createCityObject(location) {
  return {
    name: location.name,
    admin1: location.admin1 || "",
    country_code: location.country_code || "",
    latitude: location.latitude,
    longitude: location.longitude
  };
}


// Check whether a city is already saved.
function isCitySaved(location) {
  return savedCities.some(function (city) {
    return city.name.toLowerCase() === location.name.toLowerCase() &&
      city.country_code.toLowerCase() ===
      (location.country_code || "").toLowerCase();
  });
}


// ==========================================
// FAVOURITE CITIES
// ==========================================

// Render all saved cities.
function renderSavedCities() {
  savedCitiesList.innerHTML = "";

  if (savedCities.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.id = "empty-favourites";
    emptyMessage.className = "empty-favourites";
    emptyMessage.textContent = "No favourite cities saved yet.";

    savedCitiesList.appendChild(emptyMessage);
    updateSaveButton();

    return;
  }

  savedCities.forEach(function (city, index) {

    const chip = document.createElement("div");
    chip.className = "saved-city-chip";

    // Clickable city name.
    const cityButton = document.createElement("button");

    cityButton.type = "button";
    cityButton.className = "saved-city-button";
    cityButton.textContent = city.name;

    cityButton.setAttribute(
      "aria-label",
      `Load weather for ${formatCityName(city)}`
    );

    cityButton.addEventListener("click", function () {
      loadSavedCity(city);
    });


    // Remove favourite button.
    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "remove-city-button";
    removeButton.textContent = "×";

    removeButton.setAttribute(
      "aria-label",
      `Remove ${formatCityName(city)} from favourites`
    );

    removeButton.addEventListener("click", function () {
      removeCity(index);
    });


    chip.appendChild(cityButton);
    chip.appendChild(removeButton);

    savedCitiesList.appendChild(chip);
  });

  updateSaveButton();
}


// Save the currently displayed city.
function saveCurrentCity() {
  if (!currentLocation) {
    return;
  }

  if (isCitySaved(currentLocation)) {
    showError("This city is already in your favourites.");
    return;
  }

  if (savedCities.length >= 10) {
    showError("You can save a maximum of 10 favourite cities.");
    return;
  }

  savedCities.push(createCityObject(currentLocation));

  saveCitiesToStorage();
  renderSavedCities();

  statusMessage.textContent =
    `${currentLocation.name} added to your favourite cities.`;

  statusMessage.className = "status-message";
}


// Remove a city from favourites.
function removeCity(index) {
  const removedCity = savedCities[index];

  savedCities.splice(index, 1);

  saveCitiesToStorage();
  renderSavedCities();

  statusMessage.textContent =
    `${removedCity.name} removed from your favourites.`;

  statusMessage.className = "status-message";
}


// Update the Save City button.
function updateSaveButton() {
  if (!currentLocation) {
    saveCityButton.disabled = true;
    saveCityButton.textContent = "+ Save City";
    return;
  }

  const alreadySaved = isCitySaved(currentLocation);

  saveCityButton.disabled = alreadySaved;

  saveCityButton.textContent = alreadySaved
    ? "✓ Saved"
    : "+ Save City";
}


// Load weather directly using stored coordinates.
async function loadSavedCity(city) {
  await loadLocationWeather(city);
}


// ==========================================
// DATE AND FORECAST FUNCTIONS
// ==========================================

function getDayName(dateString, index) {
  if (index === 0) {
    return "Today";
  }

  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "short"
  });
}


// ==========================================
// RENDER CURRENT WEATHER
// ==========================================

function renderCurrentWeather(current) {
  const weatherInfo = getWeatherInfo(current.weather_code);

  const temperature = convertTemperature(
    current.temperature_2m
  );

  currentDescription.textContent = weatherInfo.description;
  currentIcon.textContent = weatherInfo.emoji;

  currentTemperature.textContent =
    `${temperature}°${temperatureUnit}`;

  feelsLike.textContent = "Updated with live weather data";

  humidityElement.textContent =
    `${current.relative_humidity_2m}%`;

  windSpeedElement.textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;
}


// ==========================================
// RENDER SEVEN DAY FORECAST
// ==========================================

function renderForecast(daily) {
  forecastList.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {

    const weatherInfo = getWeatherInfo(
      daily.weather_code[i]
    );

    const maximum = convertTemperature(
      daily.temperature_2m_max[i]
    );

    const minimum = convertTemperature(
      daily.temperature_2m_min[i]
    );

    const card = document.createElement("article");

    card.className = "forecast-card";

    card.innerHTML = `
      <p class="forecast-day">
        ${getDayName(daily.time[i], i)}
      </p>

      <span class="forecast-icon" aria-hidden="true">
        ${weatherInfo.emoji}
      </span>

      <p class="forecast-condition">
        ${weatherInfo.description}
      </p>

      <p class="forecast-temperatures">
        <strong>${maximum}°</strong> /
        <span>${minimum}°</span>
      </p>
    `;

    forecastList.appendChild(card);
  }
}


// Render all weather information.
function renderWeather() {
  if (!weatherData) {
    return;
  }

  renderCurrentWeather(weatherData.current);
  renderForecast(weatherData.daily);
}


// ==========================================
// LOAD WEATHER FOR A CITY
// ==========================================

async function loadLocationWeather(location) {
  showLoading();

  try {
    const data = await getWeather(
      location.latitude,
      location.longitude
    );

    if (!data.current || !data.daily ||
      !Array.isArray(data.daily.time)) {

      throw new Error(
        "The weather service returned incomplete data."
      );
    }

    weatherData = data;
    currentLocation = createCityObject(location);

    cityNameElement.textContent = formatCityName(location);

    renderWeather();
    renderSavedCities();

    saveLastCity(currentLocation);

    statusMessage.textContent =
      `Showing live weather for ${location.name}.`;

    statusMessage.className = "status-message";

  } catch (error) {

    console.error("Weather dashboard error:", error);

    showError(
      error instanceof TypeError
        ? "Network error. Check your internet connection and try again."
        : error.message
    );

  } finally {
    hideLoading();
  }
}


// ==========================================
// CITY SEARCH
// ==========================================

async function searchCity(city) {
  const cleanCity = city.trim();

  if (!cleanCity) {
    showError("Please enter a city name.");
    return;
  }

  showLoading();

  try {
    const location = await getCoordinates(cleanCity);

    if (!location) {
      showError(
        "City not found. Please check the spelling and try again."
      );

      return;
    }

    const data = await getWeather(
      location.latitude,
      location.longitude
    );

    if (!data.current || !data.daily ||
      !Array.isArray(data.daily.time)) {

      throw new Error(
        "The weather service returned incomplete data."
      );
    }

    weatherData = data;
    currentLocation = createCityObject(location);

    cityNameElement.textContent = formatCityName(location);

    renderWeather();
    renderSavedCities();

    saveLastCity(currentLocation);

    statusMessage.textContent =
      `Showing live weather for ${location.name}.`;

    statusMessage.className = "status-message";

  } catch (error) {

    console.error("Weather dashboard error:", error);

    showError(
      error instanceof TypeError
        ? "Network error. Check your internet connection and try again."
        : error.message
    );

  } finally {
    hideLoading();
  }
}


// ==========================================
// EVENT LISTENERS
// ==========================================


// Search form.
searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  searchCity(cityInput.value);
});


// Save current city.
saveCityButton.addEventListener("click", saveCurrentCity);


// Celsius button.
celsiusButton.addEventListener("click", function () {
  temperatureUnit = "C";

  updateUnitButtons();
  saveTemperatureUnit();
  renderWeather();
});


// Fahrenheit button.
fahrenheitButton.addEventListener("click", function () {
  temperatureUnit = "F";

  updateUnitButtons();
  saveTemperatureUnit();
  renderWeather();
});


// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

async function initializeApp() {

  // Restore saved preferences.
  loadTemperatureUnit();

  // Load favourite cities.
  loadSavedCities();
  renderSavedCities();

  // Restore the last searched city.
  const lastCity = readStorage(LAST_CITY_KEY, null);

  if (
    lastCity &&
    typeof lastCity.name === "string" &&
    typeof lastCity.latitude === "number" &&
    Number.isFinite(lastCity.latitude) &&
    typeof lastCity.longitude === "number" &&
    Number.isFinite(lastCity.longitude) &&
    lastCity.latitude >= -90 &&
    lastCity.latitude <= 90 &&
    lastCity.longitude >= -180 &&
    lastCity.longitude <= 180
  ) {

    await loadLocationWeather(lastCity);

  } else {

    // Default city for a first-time visitor.
    await searchCity("Greater Noida");
  }
}


// Start WeatherNow.
initializeApp();
