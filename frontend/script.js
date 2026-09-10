const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const results = document.getElementById("results");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const medicine = search.value.trim();
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    if (medicine === "") {
        results.innerHTML = `
            <p><strong>Please enter a medicine or substance.</strong></p>
        `;
        return;
    }

    results.innerHTML = `
          <p><strong>Searching...</strong></p>
     `;

    try {
        const url = `http://localhost:3000/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}`;

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            results.innerHTML = `
                <p><strong>Error:</strong> ${data.error}</p>
            `;
            return;
        }

        if (data.totalResults === 0) {
            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p><strong>Ingredient:</strong> —</p>
                <p><strong>Other Names:</strong> —</p>
                <p><strong>Status:</strong> No matching result found.</p>
            `;
            return;
        }

        const result = data.results[0];

        results.innerHTML = `
            <p><strong>Total Results:</strong> ${data.totalResults}</p>
            <p><strong>Ingredient:</strong> ${result.ingredient || "—"}</p>
            <p><strong>Other Names:</strong> ${result.other_names || "—"}</p>
            <p><strong>Status:</strong> ${result.status || "—"}</p>
        `;

    } catch (error) {
        results.innerHTML = `
            <p><strong>Connection Error:</strong> Unable to connect to the server.</p>
        `;
    }
});