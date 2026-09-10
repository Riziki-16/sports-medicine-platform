const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const results = document.getElementById("results");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const medicine = search.value.trim();

    const sport = "Track & Field";
    const country = "United Kingdom";

    const response = await fetch(
        `http://localhost:3000/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}`
    );

    const data = await response.json();

    results.innerHTML = `
        <p><strong>Total Results:</strong> ${data.totalResults}</p>
        <p><strong>Ingredient:</strong> ${data.results[0]?.ingredient || "—"}</p>
        <p><strong>Other Names:</strong> ${data.results[0]?.other_names || "—"}</p>
        <p><strong>Dosage:</strong> ${data.results[0]?.dosage || "—"}</p>
    `;
});