const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const medicine = search.value.trim();
    const userTypeValue = userType.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    try {

       const response = await fetch(
    `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        console.log("Search API Response:", data);

        const firstResult = data.results?.[0];

        if (!firstResult) {
            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p><strong>Ingredient:</strong> —</p>
                <p><strong>Other Names:</strong> —</p>
                <p><strong>Status:</strong> —</p>
                <p><strong>Dosage:</strong> —</p>
            `;
            return;
        }

        const ingredient = firstResult.ingredient || "—";
        const otherNames = firstResult.other_names || "—";
       const actualStatus = firstResult.status || "Not classified";
const dosage = firstResult.dosage || "—";
const warning = firstResult.warning || "—";

let displayStatus = actualStatus;
let statusColor = "#6c757d";

// Demonstration display categories
const ingredientName = (firstResult.ingredient || "").toLowerCase();

if (ingredientName === "paracetamol") {
    displayStatus = "Not Prohibited";
    statusColor = "green";
}
else if (ingredientName === "salbutamol") {
    displayStatus = "Allowed with Conditions";
    statusColor = "orange";
}
else if (ingredientName === "testosterone") {
    displayStatus = "Prohibited";
    statusColor = "red";
}
        let ingredientDisplay;

        if (ingredient !== "—") {

            ingredientDisplay =
                `<a href="detail.html?ingredient=${encodeURIComponent(ingredient)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}">${ingredient}</a>`;

        } else {

            ingredientDisplay = "—";
        }

        results.innerHTML = `
            <p><strong>Total Results:</strong> ${data.totalResults || 0}</p>

            <p><strong>Ingredient:</strong> ${ingredientDisplay}</p>

            <p><strong>Other Names:</strong> ${otherNames}</p>

            <p>
    <strong>Status:</strong>
    <span style="color: ${statusColor}; font-weight: bold;">
        ${displayStatus}
    </span>
</p>

<p><strong>WADA classification:</strong> ${actualStatus}</p>

<p><strong>Dosage:</strong> ${dosage}</p>

<p><strong>Conditions / Warnings:</strong> ${warning}</p>

        `;

    } catch (error) {

        console.error("Search Error:", error);

        results.innerHTML = `
            <p><strong>Error connecting to the medicine database.</strong></p>
            <p>${error.message}</p>
        `;
    }
});