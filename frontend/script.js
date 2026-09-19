function setSearchDate() {

    const now = new Date();

    const searchDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "longOffset"
    }).format(now);

    document.getElementById("searchDate").textContent = searchDate;
}

setSearchDate();

const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userTypeSelect = document.getElementById("userType");
const results = document.getElementById("results");



form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const medicine = search.value.trim();
    const selectedUserType = userTypeSelect.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    const response = await fetch(
        `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(selectedUserType)}`
    );

    const data = await response.json();

    const firstResult = data.results[0];


    const ingredient = firstResult?.ingredient || "—";
    const otherNames = firstResult?.other_names || "—";
    const status = firstResult?.status || "—";
    const dosage = firstResult?.dosage || "—";


    let ingredientDisplay;

    if (ingredient !== "—") {

        ingredientDisplay = `
            <a href="detail.html?ingredient=${encodeURIComponent(ingredient)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}">
                ${ingredient}
            </a>
        `;

    } else {

        ingredientDisplay = "—";
    }


    results.innerHTML = `

        <p>
            <strong>Total Results:</strong>
            ${data.totalResults}
        </p>

        <p>
            <strong>Ingredient:</strong>
            ${ingredientDisplay}
        </p>

        <p>
            <strong>Other Names:</strong>
            ${otherNames}
        </p>

        <p>
            <strong>Status:</strong>
            ${status}
        </p>

        <p>
            <strong>Dosage:</strong>
            ${dosage}
        </p>

    `;

});
