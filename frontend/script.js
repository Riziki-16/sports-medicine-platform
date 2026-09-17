const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const medicine = search.value.trim();

    const userTypeValue = userType.value;

    const sport = "Track & Field";
    const country = document.getElementById("country").value;

    const response = await fetch(
    `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userType)}`
)

    const data = await response.json();

    results.innerHTML = `
        <p><strong>Total Results:</strong> ${data.totalResults}</p>
<p><strong>Ingredient:</strong> ${data.results[0]?.ingredient || "—"}</p>
<p><strong>Other Names:</strong> ${data.results[0]?.other_names || "—"}</p>
<p><strong>Status:</strong> ${data.results[0]?.status || "—"}</p>
<p><strong>Dosage:</strong> ${data.results[0]?.dosage || "—"}</p>
    `;
});