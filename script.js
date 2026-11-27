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

let weatherData = null;
let temperatureUnit = "C";

// Open-Meteo weather codes converted into a short description and emoji.
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

// Convert Celsius to Fahrenheit when the user changes the unit.
function convertTemperature(celsius) {
  if (temperatureUnit === "F") {
    return Math.round((celsius * 9 / 5) + 32);
  }

  return Math.round(celsius);
}

// First API call: convert the city name into latitude and longitude.
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not search for this city. Please try again.");
  }

  const data = await response.json();
  console.log("Geocoding response:", data);

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}

// Second API call: get current weather and the 7-day forecast.
async function getWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather data could not be loaded. Please try again.");
  }

  const data = await response.json();
  console.log("Weather response:", data);
  return data;
}

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

function getDayName(dateString, index) {
  if (index === 0) return "Today";

  // Use midday to avoid date shifting because of timezone differences.
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function renderCurrentWeather(current) {
  const weatherInfo = getWeatherInfo(current.weather_code);
  const temperature = convertTemperature(current.temperature_2m);

  currentDescription.textContent = weatherInfo.description;
  currentIcon.textContent = weatherInfo.emoji;
  currentTemperature.textContent = `${temperature}°${temperatureUnit}`;
  feelsLike.textContent = `Updated with live weather data`;
  humidityElement.textContent = `${current.relative_humidity_2m}%`;
  windSpeedElement.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
}

function renderForecast(daily) {
  forecastList.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const weatherInfo = getWeatherInfo(daily.weather_code[i]);
    const maximum = convertTemperature(daily.temperature_2m_max[i]);
    const minimum = convertTemperature(daily.temperature_2m_min[i]);

    const card = document.createElement("article");
    card.className = "forecast-card";

    card.innerHTML = `
      <p class="forecast-day">${getDayName(daily.time[i], i)}</p>
      <span class="forecast-icon" aria-hidden="true">${weatherInfo.emoji}</span>
      <p class="forecast-condition">${weatherInfo.description}</p>
      <p class="forecast-temperatures">
        <strong>${maximum}°</strong> / <span>${minimum}°</span>
      </p>
    `;

    forecastList.appendChild(card);
  }
}

function renderWeather() {
  if (!weatherData) return;

  renderCurrentWeather(weatherData.current);
  renderForecast(weatherData.daily);
}

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
      showError("City not found. Please check the spelling and try again.");
      return;
    }

    const data = await getWeather(location.latitude, location.longitude);

    if (!data.current || !data.daily) {
      throw new Error("The weather service returned incomplete data. Please try again.");
    }

    weatherData = data;
    cityNameElement.textContent = formatCityName(location);
    renderWeather();

    statusMessage.textContent = `Showing live weather for ${location.name}.`;
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

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  searchCity(cityInput.value);
});

celsiusButton.addEventListener("click", function () {
  temperatureUnit = "C";
  celsiusButton.classList.add("active");
  fahrenheitButton.classList.remove("active");
  celsiusButton.setAttribute("aria-pressed", "true");
  fahrenheitButton.setAttribute("aria-pressed", "false");
  renderWeather();
});

fahrenheitButton.addEventListener("click", function () {
  temperatureUnit = "F";
  fahrenheitButton.classList.add("active");
  celsiusButton.classList.remove("active");
  fahrenheitButton.setAttribute("aria-pressed", "true");
  celsiusButton.setAttribute("aria-pressed", "false");
  renderWeather();
});

// Load a default city as soon as the page opens.
searchCity("Greater Noida");
