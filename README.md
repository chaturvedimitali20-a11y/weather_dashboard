# Weather Dashboard (Week 1, Week 2 & Week 3)

A responsive weather dashboard UI built with semantic HTML5, modern CSS3 (Flexbox & CSS Custom Properties), and vanilla JavaScript as part of the SkillMe Full Stack Engineer Internship.

🌐 **Live Demo:** [https://chaturvedimitali20-a11y.github.io/weather_dashboard/](https://chaturvedimitali20-a11y.github.io/weather_dashboard/)

## Features

### Week 1 (Static UI & Responsive Layout)
- Accessible city search bar
- Current weather card displaying city, condition, temperature, humidity, and wind speed
- 7-day forecast row with horizontal scrolling on smaller screens

### Week 2 (Dynamic JavaScript Rendering & Interactivity)
- Dynamic DOM rendering of current weather and 7-day forecast cards from JavaScript data objects using template literals
- Live **°C / °F** temperature unit toggle with pure helper functions
- Client-side search form validation with instant feedback messages and dynamic city updates
- Condition-based background color themes (`sunny`, `cloudy`, `rain`)

### Week 3 (Live Weather API Integration)
- Integrated the free Open-Meteo API to fetch live weather data without requiring an API key
- Implemented Geocoding API to convert city names into geographical coordinates
- Used JavaScript `fetch` and `async/await` to handle API requests
- Displayed actual current temperature, humidity, wind speed, and weather conditions
- Integrated a live 7-day forecast with daily maximum and minimum temperatures
- Mapped Open-Meteo weather codes to corresponding weather descriptions and emojis
- Added loading messages while fetching weather data
- Implemented error handling for invalid city searches and network failures
- Disabled the Search button while loading to prevent multiple requests
- Preserved the **°C / °F** temperature toggle with live weather data

## Tech Stack
- HTML5
- CSS3 (Flexbox, CSS Variables)
- JavaScript (ES6+ DOM Manipulation, Events, Fetch API, Async/Await)
- Open-Meteo API (Geocoding & Weather Forecast)
