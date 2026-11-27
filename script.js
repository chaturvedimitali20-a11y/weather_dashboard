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
  if (code === 0) return { emoji: "☀️", label: "Clear Sky", theme: "sunny" };
  if (code === 1 || code === 2) return { emoji: "⛅", label: "Partly Cloudy", theme: "sunny" };
  if (code === 3) return { emoji: "☁️", label: "Overcast", theme: "cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Foggy", theme: "cloudy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { emoji: "🌧️", label: "Rain / Showers", theme: "rain" };
  }
  if ((code >= 71 && code <= 77) || (code === 85 || code === 86)) {
    return { emoji: "❄️", label: "Snow", theme: "cloudy" };
  }
  if (code >= 95 && code <= 99) {
    return { emoji: "⛈️", label: "Thunderstorm", theme: "rain" };
  }
  return { emoji: "🌤️", label: "Mild Weather", theme: "sunny" };
}

// 1. Get Coordinates from City Name
async function getCoordinates(city) {
  const url = `https://open-meteo.com{encodeURIComponent(city)}&count=1`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding error: ${response.status}`);
  }

  return await response.json();
}

// 2. Get Current & 7-Day Forecast Data
async function getWeather(lat, lon) {
  const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Forecast error: ${response.status}`);
  }

  return await response.json();
}

// 3. Transform Open-Meteo JSON into Dashboard Data Shape
function formatWeatherData(cityLabel, apiData) {
  const currentInfo = getWeatherInfo(apiData.current.weather_code);

  const forecast = apiData.daily.time.map((dateStr, index) => {
    const dateObj = new Date(dateStr + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const dayInfo = getWeatherInfo(apiData.daily.weather_code[index]);

    return {
      day: dayName,
      code: apiData.daily.weather_code[index],
      emoji: dayInfo.emoji,
      highC: apiData.daily.temperature_2m_max[index],
      lowC: apiData.daily.temperature_2m_min[index],
    };
  });

  return {
    city: cityLabel,
    tempC: apiData.current.temperature_2m,
    humidity: apiData.current.relative_humidity_2m,
    windKmh: apiData.current.wind_speed_10m,
    weatherCode: apiData.current.weather_code,
    condition: currentInfo.label,
    emoji: currentInfo.emoji,
    theme: currentInfo.theme,
    forecast: forecast,
  };
}

// 4. Render Current Weather, 7-Day Forecast & Page Theme
function renderWeather(data) {
  document.body.className = `theme-${data.theme}`;

  document.getElementById("current-city").textContent = data.city;
  document.getElementById("current-condition").textContent = data.condition;
  document.getElementById("current-icon").textContent = data.emoji;
  document.getElementById("current-temp").textContent = formatTemp(data.tempC);
  document.getElementById("current-humidity").textContent = `${data.humidity}%`;
  document.getElementById("current-wind").textContent = `${data.windKmh} km/h`;

  const forecastRow = document.getElementById("forecast-row");
  forecastRow.innerHTML = data.forecast
    .map(
      (item) => `
      <div class="forecast-card">
        <span class="forecast-day">${item.day}</span>
        <span class="forecast-icon">${item.emoji}</span>
        <div class="forecast-temps">
          <span>${formatTemp(item.highC)}</span>
          <span class="min-temp">/ ${formatTemp(item.lowC)}</span>
        </div>
      </div>
    `
    )
    .join("");
}

// Helper to show/hide feedback banner
function setBanner(text, type = "") {
  searchMessage.textContent = text;
  searchMessage.className = type ? `search-message ${type}` : "search-message";
}

// 5. Main Search Handler
async function handleCitySearch(city) {
  setBanner("Loading...", "loading");
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  try {
    const geoData = await getCoordinates(city);

    if (!geoData.results || geoData.results.length === 0) {
      setBanner("City not found. Please check the spelling and try again.", "error");
      return;
    }

    const location = geoData.results[0];
    const rawWeather = await getWeather(location.latitude, location.longitude);

    const cityLabel = `${location.name}, ${location.country}`;
    weatherData = formatWeatherData(cityLabel, rawWeather);

    setBanner("");
    renderWeather(weatherData);
  } catch (error) {
    console.error("Fetch failed:", error);
    setBanner("Unable to connect. Please check your internet connection and try again.", "error");
  } finally {
    searchBtn.disabled = false;
    geoBtn.disabled = false;
  }
}

// 6. Geolocation ("📍 My Location" button)
function handleGeolocation() {
  if (!navigator.geolocation) {
    setBanner("Geolocation is not supported by your browser.", "error");
    return;
  }

  setBanner("Detecting your location...", "loading");
  searchBtn.disabled = true;
  geoBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const rawWeather = await getWeather(latitude, longitude);
        weatherData = formatWeatherData("My Current Location", rawWeather);
        setBanner("");
        renderWeather(weatherData);
      } catch (error) {
        console.error("Location weather failed:", error);
        setBanner("Unable to fetch weather for your location.", "error");
      } finally {
        searchBtn.disabled = false;
        geoBtn.disabled = false;
      }
    },
    () => {
      setBanner("Location access denied. Please search for a city manually.", "error");
      searchBtn.disabled = false;
      geoBtn.disabled = false;
    }
  );
}

// 7. Event Listeners
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    handleCitySearch(city);
  } else {
    setBanner("Please enter a city name.", "error");
  }
});

geoBtn.addEventListener("click", handleGeolocation);

unitToggleBtn.addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  unitToggleBtn.textContent = currentUnit === "C" ? "Switch to °F" : "Switch to °C";

  if (weatherData) {
    renderWeather(weatherData);
  }
});

// Load Pune by default when page opens
handleCitySearch("Pune");
