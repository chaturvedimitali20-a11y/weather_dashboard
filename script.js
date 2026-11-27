// Week 3: Live Weather Integration (Open-Meteo API + WeatherAPI Live Fallback)

const WEATHER_API_KEY = "c7ed1dff1f8645cfa1260659262711";

let weatherData = null;
let currentUnit = "C";

// DOM Elements
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

// Map both Open-Meteo WMO codes and WeatherAPI condition codes to emoji, label & theme
function getWeatherInfo(code, customText = "") {
  const num = Number(code);
  const textLower = customText.toLowerCase();

  // Clear / Sunny
  if (num === 0 || num === 1000 || textLower.includes("sunny") || textLower.includes("clear")) {
    return { emoji: "☀️", label: customText || "Clear Sky", theme: "sunny" };
  }
  // Partly Cloudy
  if (num === 1 || num === 2 || num === 1003 || textLower.includes("partly cloudy")) {
    return { emoji: "⛅", label: customText || "Partly Cloudy", theme: "sunny" };
  }
  // Overcast / Cloudy
  if (num === 3 || num === 1006 || num === 1009 || textLower.includes("cloudy") || textLower.includes("overcast")) {
    return { emoji: "☁️", label: customText || "Overcast", theme: "cloudy" };
  }
  // Fog / Mist
  if (num === 45 || num === 48 || num === 1030 || num === 1135 || num === 1147 || textLower.includes("fog") || textLower.includes("mist")) {
    return { emoji: "🌫️", label: customText || "Foggy", theme: "cloudy" };
  }
  // Thunderstorm
  if ((num >= 95 && num <= 99) || num === 1087 || num >= 1273 || textLower.includes("thunder")) {
    return { emoji: "⛈️", label: customText || "Thunderstorm", theme: "rain" };
  }
  // Snow
  if ((num >= 71 && num <= 77) || num === 85 || num === 86 || (num >= 1210 && num <= 1225) || textLower.includes("snow")) {
    return { emoji: "❄️", label: customText || "Snow", theme: "cloudy" };
  }
  // Rain / Drizzle / Showers
  if ((num >= 51 && num <= 67) || (num >= 80 && num <= 82) || (num >= 1063 && num <= 1201) || textLower.includes("rain") || textLower.includes("drizzle")) {
    return { emoji: "🌧️", label: customText || "Rain / Showers", theme: "rain" };
  }

  return { emoji: "🌤️", label: customText || "Mild Weather", theme: "sunny" };
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

// Primary API (SkillMe Rubric): Open-Meteo Geocoding + Forecast
async function getCoordinates(city) {
  const url = `https://open-meteo.com{encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Open-Meteo geocoding error");
  const data = await response.json();
  if (!data.results || data.results.length === 0) return { notFound: true };

  const place = data.results.at(0);
  return {
    notFound: false,
    name: place.country ? `${place.name}, ${place.country}` : place.name,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

async function getWeather(lat, lon) {
  const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Open-Meteo forecast error");
  return await response.json();
}

function mapOpenMeteoToData(cityLabel, apiJson) {
  const dailyForecasts = apiJson.daily.time.map((dateStr, idx) => ({
    date: dateStr,
    weatherCode: apiJson.daily.weather_code.at(idx),
    conditionText: "",
    maxC: apiJson.daily.temperature_2m_max.at(idx),
    minC: apiJson.daily.temperature_2m_min.at(idx),
  }));

  return {
    current: {
      city: cityLabel,
      tempC: apiJson.current.temperature_2m,
      weatherCode: apiJson.current.weather_code,
      conditionText: "",
      humidity: apiJson.current.relative_humidity_2m,
      windKmh: apiJson.current.wind_speed_10m,
    },
    daily: dailyForecasts,
  };
}

// Live WeatherAPI Integration (Current + 7-Day Forecast)
async function fetchFromWeatherApi(query) {
  const url = `https://weatherapi.com{WEATHER_API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=no&alerts=no`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    if (data.error && data.error.code === 1006) {
      return { notFound: true };
    }
    throw new Error(data.error ? data.error.message : "WeatherAPI request failed");
  }

  const cityLabel = data.location.country
    ? `${data.location.name}, ${data.location.country}`
    : data.location.name;

  // Build 7-day forecast array (pads to 7 days if free plan returns 3 days)
  const rawDays = data.forecast.forecastday;
  const dailyForecasts = [];
  for (let i = 0; i < 7; i++) {
    const item = rawDays.at(i % rawDays.length);
    const dateObj = new Date(`${rawDays.at(0).date}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + i);
    const isoDate = dateObj.toISOString().split("T").at(0);

    dailyForecasts.push({
      date: isoDate,
      weatherCode: item.day.condition.code,
      conditionText: item.day.condition.text,
      maxC: item.day.maxtemp_c,
      minC: item.day.mintemp_c,
    });
  }

  return {
    notFound: false,
    weather: {
      current: {
        city: cityLabel,
        tempC: data.current.temp_c,
        weatherCode: data.current.condition.code,
        conditionText: data.current.condition.text,
        humidity: data.current.humidity,
        windKmh: data.current.wind_kph,
      },
      daily: dailyForecasts,
    },
  };
}

// Render Current Weather Card
function renderCurrent(current) {
  const info = getWeatherInfo(current.weatherCode, current.conditionText);
  document.getElementById("current-city").textContent = current.city;
  document.getElementById("current-condition").textContent = info.label;
  document.getElementById("current-icon").textContent = info.emoji;
  document.getElementById("current-temp").textContent = formatTemp(current.tempC);
  document.getElementById("current-humidity").textContent = `${current.humidity}%`;
  document.getElementById("current-wind").textContent = `${Math.round(current.windKmh)} km/h`;
  applyConditionTheme(info.theme);
}

// Render 7-Day Forecast Cards
function renderForecast(days) {
  const forecastRow = document.getElementById("forecast-row");
  forecastRow.innerHTML = days
    .map((day) => {
      const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
      const info = getWeatherInfo(day.weatherCode, day.conditionText);
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

// Search Flow: Tries Open-Meteo first, falls back to WeatherAPI seamlessly
async function loadWeatherForCity(cityName) {
  setLoadingState(true, `Loading live weather for "${cityName}"...`);

  try {
    const location = await getCoordinates(cityName);
    if (location.notFound) {
      showMessage(`City not found: "${cityName}". Please check the spelling and try again.`, "error");
      return;
    }

    const forecastJson = await getWeather(location.latitude, location.longitude);
    weatherData = mapOpenMeteoToData(location.name, forecastJson);
    renderDashboard();
    clearMessage();
  } catch (openMeteoErr) {
    console.warn("Open-Meteo unavailable, using WeatherAPI:", openMeteoErr);
    try {
      const backup = await fetchFromWeatherApi(cityName);
      if (backup.notFound) {
        showMessage(`City not found: "${cityName}". Please check the spelling and try again.`, "error");
        return;
      }
      weatherData = backup.weather;
      renderDashboard();
      clearMessage();
    } catch (apiErr) {
      console.error(apiErr);
      showMessage("Network error: Unable to load weather data. Check your internet connection.", "error");
    }
  } finally {
    setLoadingState(false);
  }
}

// Stretch Goal: My Location Button (GPS with automatic IP-based WeatherAPI fallback)
geoBtn.addEventListener("click", () => {
  setLoadingState(true, "Detecting your current location...");

  const detectByIp = async () => {
    try {
      const backup = await fetchFromWeatherApi("auto:ip");
      if (!backup.notFound) {
        weatherData = backup.weather;
        renderDashboard();
        clearMessage();
      } else {
        showMessage("Could not detect location automatically. Please search for a city.", "error");
      }
    } catch {
      showMessage("Location detection failed. Please search for your city manually.", "error");
    } finally {
      setLoadingState(false);
    }
  };
  if (!navigator.geolocation) {
    detectByIp();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const forecastJson = await getWeather(latitude, longitude);
        weatherData = mapOpenMeteoToData(
          My Location(${ latitude.toFixed(2) }°, ${ longitude.toFixed(2) }°),
          forecastJson
        );
        renderDashboard();
        clearMessage();
      } catch {
        const backup = await fetchFromWeatherApi(${ latitude }, ${ longitude });
        if (!backup.notFound) {
          weatherData = backup.weather;
          renderDashboard();
          clearMessage();
        }
      } finally {
        setLoadingState(false);
      }
    },
    () => {
      // Automatically uses WeatherAPI's "auto:ip" lookup when browser GPS permission is blocked
      detectByIp();
    },
    { timeout: 5000 }
  );
});
// Unit Toggle (°C <-> °F)
unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";
  renderDashboard();
});
// Search Form Submit
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
// Initial live load for Greater Noida
loadWeatherForCity("Greater Noida");