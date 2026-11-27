// Week 3: Live Weather from Open-Meteo API (Geocoding + Forecast)

let weatherData = null;
let currentUnit = "C";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const unitToggleBtn = document.getElementById("unit-toggle");
const searchMessage = document.getElementById("search-message");

function toFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

function formatTemp(tempC) {
  return currentUnit === "C" ? `${Math.round(tempC)}°C` : `${toFahrenheit(tempC)}°F`;
}

function getWeatherInfo(code) {
  if (code === 0) return { emoji: "☀️", label: "Clear Sky", theme: "sunny" };
  if (code === 1 || code === 2) return { emoji: "⛅", label: "Partly Cloudy", theme: "sunny" };
  if (code === 3) return { emoji: "☁️", label: "Overcast", theme: "cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Foggy", theme: "cloudy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { emoji: "🌧️", label: "Rain / Showers", theme: "rain" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { emoji: "❄️", label: "Snow", theme: "cloudy" };
  }
  if (code >= 95 && code <= 99) return { emoji: "⛈️", label: "Thunderstorm", theme: "rain" };
  return { emoji: "🌤️", label: "Mild Weather", theme: "sunny" };
}

function applyConditionTheme(theme) {
  document.body.classList.remove("theme-sunny", "theme-cloudy", "theme-rain");
  if (theme) document.body.classList.add(`theme-${theme}`);
}

function showMessage(text, type = "info") {
  searchMessage.textContent = text;
  searchMessage.className = `search-message ${type}`;
}

function clearMessage() {
  searchMessage.textContent = "";
  searchMessage.className = "search-message";
}

function setLoadingState(isLoading, label = "Loading weather data...") {
  searchBtn.disabled = isLoading;
  geoBtn.disabled = isLoading;
  if (isLoading) showMessage(label, "loading");
}

async function getCoordinates(city) {
  const url = `https://open-meteo.com{encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding request failed");
  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;

  const place = data.results.at(0);
  return {
    name: place.country ? `${place.name}, ${place.country}` : place.name,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

async function getWeather(lat, lon) {
  const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Forecast request failed");
  return await response.json();
}

function mapApiToWeatherData(cityLabel, apiJson) {
  const dailyForecasts = apiJson.daily.time.map((dateStr, idx) => ({
    date: dateStr,
    weatherCode: apiJson.daily.weather_code.at(idx),
    maxC: apiJson.daily.temperature_2m_max.at(idx),
    minC: apiJson.daily.temperature_2m_min.at(idx),
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

function renderCurrent(current) {
  const info = getWeatherInfo(current.weatherCode);
  document.getElementById("current-city").textContent = current.city;
  document.getElementById("current-condition").textContent = info.label;
  document.getElementById("current-icon").textContent = info.emoji;
  document.getElementById("current-temp").textContent = formatTemp(current.tempC);
  document.getElementById("current-humidity").textContent = `${current.humidity}%`;
  document.getElementById("current-wind").textContent = `${Math.round(current.windKmh)} km/h`;
  applyConditionTheme(info.theme);
}

function renderForecast(days) {
  const forecastRow = document.getElementById("forecast-row");
  forecastRow.innerHTML = days
    .map((day) => {
      const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
      const info = getWeatherInfo(day.weatherCode);
      const maxDisplay = currentUnit === "C" ? `${Math.round(day.maxC)}°` : `${toFahrenheit(day.maxC)}°`;
      const minDisplay = currentUnit === "C" ? `${Math.round(day.minC)}°` : `${toFahrenheit(day.minC)}°`;

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

function renderDashboard() {
  if (!weatherData) return;
  renderCurrent(weatherData.current);
  renderForecast(weatherData.daily);
}

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
      showMessage("Location access denied. Please enable Location in browser settings or search manually.", "error");
    }
  );
});

unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";
  renderDashboard();
});

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

loadWeatherForCity("Greater Noida");
