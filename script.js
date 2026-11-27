// Week 3: Live Weather from Open-Meteo API (Geocoding + Forecast)

let weatherData = null;
let currentUnit = "C";

// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const unitToggleBtn = document.getElementById("unit-toggle");
const searchMessage = document.getElementById("search-message");

// Helper: Convert Celsius to rounded Fahrenheit
function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

// Helper: Format temperature according to active unit
function formatTemp(tempC) {
  return currentUnit === "C" ? `${Math.round(tempC)}°C` : `${toFahrenheit(tempC)}°F`;
}

// Helper: Map Open-Meteo WMO weather_code to emoji, description, and theme
function getWeatherInfo(code) {
  if (code === 0) {
    return { emoji: "☀️", label: "Clear Sky", theme: "sunny" };
  }
  if ([1, 2].includes(code)) {
    return { emoji: "⛅", label: "Partly Cloudy", theme: "sunny" };
  }
  if (code === 3) {
    return { emoji: "☁️", label: "Overcast", theme: "cloudy" };
  }
  if ([45, 48].includes(code)) {
    return { emoji: "🌫️", label: "Foggy", theme: "cloudy" };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { emoji: "🌧️", label: "Rain / Showers", theme: "rain" };
  }
  if ((code >= 71 && code <= 77) || [85, 86].includes(code)) {
    return { emoji: "❄️", label: "Snow", theme: "cloudy" };
  }
  if (code >= 95 && code <= 99) {
    return { emoji: "⛈️", label: "Thunderstorm", theme: "rain" };
  }
  return { emoji: "🌤️", label: "Mild Weather", theme: "sunny" };
}

// Apply condition-based background theme
function applyConditionTheme(theme) {
  document.body.classList.remove("theme-sunny", "theme-cloudy", "theme-rain");
  if (theme) {
    document.body.classList.add(`theme-${theme}`);
  }
}

// Show feedback, loading, or error messages
function showMessage(text, type = "info") {
  searchMessage.textContent = text;
  searchMessage.className = `search-message ${type}`;
}

function clearMessage() {
  searchMessage.textContent = "";
  searchMessage.className = "search-message";
}

// Toggle disabled state on buttons during network fetch
function setLoadingState(isLoading, label = "Loading weather data...") {
  searchBtn.disabled = isLoading;
  geoBtn.disabled = isLoading;
  if (isLoading) {
    showMessage(label, "loading");
  }
}

// Step 1 API Call: Convert city name -> coordinates via Open-Meteo Geocoding API
async function getCoordinates(city) {
  const url = `https://open-meteo.com{encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to reach geocoding service.");
  }
  const data = await response.json();
  console.log("Geocoding API response:", data);

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const place = data.results[0];
  const displayName = place.country ? `${place.name}, ${place.country}` : place.name;
  return {
    name: displayName,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

// Step 2 API Call: Fetch current + 7-day weather from Open-Meteo Forecast API
async function getWeather(lat, lon) {
  const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch weather forecast.");
  }
  const data = await response.json();
  console.log("Forecast API response:", data);
  return data;
}

// Map raw Open-Meteo JSON into our clean dashboard object shape
function mapApiToWeatherData(cityLabel, apiJson) {
  const dailyForecasts = apiJson.daily.time.map((dateStr, idx) => ({
    date: dateStr,
    weatherCode: apiJson.daily.weather_code[idx],
    maxC: apiJson.daily.temperature_2m_max[idx],
    minC: apiJson.daily.temperature_2m_min[idx],
  }));

  return {
    current: {
      city: cityLabel,
      tempC: apiJson.current.temperature_2m,
      weatherCode: apiJson.current.weather_code,
      humidity: apiJson.current.relative_humidity_2m,
      windKmh: apiJson.current.wind_speed_10m,
    },
    daily: dailyForecasts,
  };
}

// Render Current Weather Card
function renderCurrent(current) {
  const weatherInfo = getWeatherInfo(current.weatherCode);

  document.getElementById("current-city").textContent = current.city;
  document.getElementById("current-condition").textContent = weatherInfo.label;
  document.getElementById("current-icon").textContent = weatherInfo.emoji;
  document.getElementById("current-temp").textContent = formatTemp(current.tempC);
  document.getElementById("current-humidity").textContent = `${current.humidity}%`;
  document.getElementById("current-wind").textContent = `${Math.round(current.windKmh)} km/h`;

  applyConditionTheme(weatherInfo.theme);
}

// Render 7-Day Forecast Cards
function renderForecast(days) {
  const forecastRow = document.getElementById("forecast-row");

  forecastRow.innerHTML = days
    .map((day) => {
      const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
      });
      const info = getWeatherInfo(day.weatherCode);
      const maxDisplay =
        currentUnit === "C" ? `${Math.round(day.maxC)}°` : `${toFahrenheit(day.maxC)}°`;
      const minDisplay =
        currentUnit === "C" ? `${Math.round(day.minC)}°` : `${toFahrenheit(day.minC)}°`;

      return `
        <article class="forecast-card">
          <h3 class="forecast-day">${weekday}</h3>
          <div class="forecast-icon" role="img" aria-label="${info.label}">${info.emoji}</div>
          <p class="forecast-temps">
            <span class="max-temp">${maxDisplay}</span> / <span class="min-temp">${minDisplay}</span>
          </p>
        </article>
      `;
    })
    .join("");
}

// Re-render dashboard from stored weatherData
function renderDashboard() {
  if (!weatherData) return;
  renderCurrent(weatherData.current);
  renderForecast(weatherData.daily);
}

// Search flow: City Name -> Coordinates -> Live Weather
async function loadWeatherForCity(cityName) {
  setLoadingState(true, `Loading weather for "${cityName}"...`);
  try {
    const location = await getCoordinates(cityName);
    if (!location) {
      showMessage(`City not found: "${cityName}". Please check the spelling and try again.`, "error");
      return;
    }

    const forecastJson = await getWeather(location.latitude, location.longitude);
    weatherData = mapApiToWeatherData(location.name, forecastJson);
    renderDashboard();
    clearMessage();
  } catch (error) {
    console.error(error);
    showMessage("Network error: Unable to load weather data. Check your internet connection.", "error");
  } finally {
    setLoadingState(false);
  }
}

// Stretch Goal: Use Browser Geolocation (skips Geocoding step)
geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showMessage("Geolocation is not supported by your browser.", "error");
    return;
  }

  setLoadingState(true, "Detecting your current location...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const forecastJson = await getWeather(latitude, longitude);
        weatherData = mapApiToWeatherData(
          `My Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
          forecastJson
        );
        renderDashboard();
        clearMessage();
      } catch (error) {
        console.error(error);
        showMessage("Network error while fetching local weather.", "error");
      } finally {
        setLoadingState(false);
      }
    },
    () => {
      setLoadingState(false);
      showMessage("Location access denied. Please search for a city manually.", "error");
    }
  );
});

// Unit Toggle Event (°C <-> °F)
unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";
  renderDashboard();
});

// Search Form Submit Event
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();

  if (!query) {
    showMessage("Please enter a city name before searching.", "error");
    return;
  }

  loadWeatherForCity(query);
  cityInput.value = "";
});

// Load live weather for Greater Noida by default on startup
loadWeatherForCity("Greater Noida");
