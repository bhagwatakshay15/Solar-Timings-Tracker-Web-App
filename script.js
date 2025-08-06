// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const geoButton = document.getElementById('geoButton');

    // Event listener for the search button
    searchButton.addEventListener('click', () => {
        console.log("Search button clicked"); 
        const location = document.getElementById('locationInput').value;
        if (location) {
            getCoordinates(location);  // Get coordinates based on the input location
        } else {
            showError('Please enter a location');  // Show error if input is empty
        }
    });

    // Event listener for the geolocation button
    geoButton.addEventListener('click', () => {
        console.log("Inside geoButton click");
        if (navigator.geolocation) {
            // Get the user's current location using geolocation
            navigator.geolocation.getCurrentPosition((position) => {
                console.log("Latitude:", position.coords.latitude, "Longitude:", position.coords.longitude);
                const { latitude, longitude } = position.coords;
                getSunriseSunset(latitude, longitude);  // Get sunrise/sunset data for current location
            }, (error) => {
                console.error("Geolocation Error:", error);
                showError(`Geolocation error: ${error.message}`);  // Handle geolocation errors
            });
        } else {
            showError('Geolocation is not supported by this browser.');  // Handle unsupported geolocation
        }
    });
    
});

// Fetch coordinates from the geocoding API for a given location
function getCoordinates(location) {
    clearResults();  // Clear previous results

    const geocodeApiUrl = `https://geocode.maps.co/search?q=${location}`;
    fetch(geocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            console.log("Response from geocode API data: " + JSON.stringify(data));
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                getSunriseSunset(lat, lon);  // Fetch sunrise/sunset based on coordinates
            } else {
                showError('Location not found');  // Show error if location is invalid
            }
        })
        .catch(error => showError(error));  // Handle fetch errors
}

// Fetch the local timezone using coordinates
function getLocalTimezone(latitude, longitude) {
    const timezoneApiUrl = `https://api.timezonedb.com/v2.1/get-time-zone?key=RQWQ4VZQSZFI&format=json&by=position&lat=${latitude}&lng=${longitude}`;
    
    return fetch(timezoneApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.status === "OK") {
                return data.zoneName;  // Return the timezone name
            } else {
                throw new Error('Timezone not found');
            }
        })
        .catch(error => {
            console.error('Error fetching timezone:', error);
            return 'UTC';  // Default to UTC if there's an error
        });
}

// Fetch sunrise/sunset data based on latitude and longitude
function getSunriseSunset(latitude, longitude) {
    getLocalTimezone(latitude, longitude)
        .then(timezone => {
            const dates = getFormattedDates();  // Get today's and tomorrow's dates
            const apiUrlToday = `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&timezone=${timezone}&date=${dates.today}`;
            const apiUrlTomorrow = `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&timezone=${timezone}&date=${dates.tomorrow}`;
            
            // Fetch data for today and tomorrow
            return Promise.all([
                fetch(apiUrlToday).then(response => response.json()),
                fetch(apiUrlTomorrow).then(response => response.json())
            ])
            .then(([dataToday, dataTomorrow]) => {
                if (dataToday.status === 'OK' && dataTomorrow.status === 'OK') {
                    updateUI(dataToday.results, dataTomorrow.results, timezone);  // Update the UI with data
                } else {
                    showError('Error fetching sunrise and sunset data');
                }
            });
        })
        .catch(error => {
            console.error('Error:', error);
            showError(error.message);  // Handle errors
        });
}

// Get formatted date strings for today and tomorrow
function getFormattedDates() {
    const today = new Date().toLocaleDateString('en-CA');
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-CA');

    return { today, tomorrow };
}

// Update the UI with sunrise and sunset data
function updateUI(dataToday, dataTomorrow, timezone) {  
    const resultsElement = document.getElementById('results');
    const placeholderElement = document.getElementById('placeholder');
    const resultContent = document.getElementById('resultContent');

    resultContent.innerHTML = `
        <div class="data-container">
            <div class="data-column">
                <h3>Today's Data</h3>
                <p>Sunrise: ${dataToday.sunrise}</p>
                <p>Sunset: ${dataToday.sunset}</p>
                <p>Dawn: ${dataToday.dawn}</p>
                <p>Dusk: ${dataToday.dusk}</p>
                <p>Day Length: ${dataToday.day_length}</p>
                <p>Solar Noon: ${dataToday.solar_noon}</p>
                <p>Timezone: ${timezone} </p>
            </div>
            <div class="data-column">
                <h3>Tomorrow's Data</h3>
                <p>Sunrise: ${dataTomorrow.sunrise}</p>
                <p>Sunset: ${dataTomorrow.sunset}</p>
                <p>Dawn: ${dataTomorrow.dawn}</p>
                <p>Dusk: ${dataTomorrow.dusk}</p>
                <p>Day Length: ${dataTomorrow.day_length}</p>
                <p>Solar Noon: ${dataTomorrow.solar_noon}</p>
                <p>Timezone: ${timezone} </p>
            </div>
        </div>
    `;

    placeholderElement.classList.add('hidden');  // Hide the placeholder
    resultsElement.classList.remove('hidden');  // Show the results
}

// Clear the previous results from the UI
function clearResults() {
    const resultsElement = document.getElementById('results');
    const placeholderElement = document.getElementById('placeholder');
    const resultContent = document.getElementById('resultContent');

    resultContent.innerHTML = '';  // Clear the result content
    resultsElement.classList.add('hidden');  // Hide results section
    placeholderElement.classList.remove('hidden');  // Show placeholder text
}

// Display an error message in the UI
function showError(message) {
    const resultsElement = document.getElementById('results');
    const resultContent = document.getElementById('resultContent');
    resultContent.innerHTML = `<p class="error">${message}</p>`;  // Display the error
    resultsElement.classList.remove('hidden');  // Show results section
}
