const axios = require("axios");

const ATHENA_API_URL =
  "https://appi-ksdoc-uat.azure-api.us/kci-pi/IndividualData";
const API_KEY = "0612fba72df743c7a24f5b8ee117cc0a"; // Store securely in .env

async function fetchResidentsFromAthena() {
  try {
    const response = await axios.get(ATHENA_API_URL, {
      headers: {
        "Ocp-Apim-Subscription-Key": API_KEY,
      },
    });

    if (response.status === 200) {
      const residents = response.data;
      console.log(response.data);
      // Find the specific resident by ID

      return residents;
    } else {
      throw new Error(`Athena API error: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching resident from Athena:", error.message);
    throw error;
  }
}

fetchResidentsFromAthena();

module.exports = { fetchResidentsFromAthena };
