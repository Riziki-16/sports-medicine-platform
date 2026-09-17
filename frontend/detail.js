const urlParams = new URLSearchParams(window.location.search);

const ingredient = urlParams.get("ingredient");
const sport = urlParams.get("sport");
const country = urlParams.get("country");

if (ingredient) {

    // Show information already received from the search page
    document.getElementById("medicineName").textContent = ingredient;
    document.getElementById("ingredient").textContent = ingredient;
    document.getElementById("sport").textContent = sport || "—";
    document.getElementById("country").textContent = country || "—";

    // Getting the full medicine information from the backend
    fetch(
        `http://localhost:3000/search?medicine=${encodeURIComponent(ingredient)}&sport=${encodeURIComponent(sport || "")}&country=${encodeURIComponent(country || "")}`
    )
    .then(response => response.json())
    .then(data => {

        console.log("Detail API response:", data);

        if (data.results && data.results.length > 0) {

            const medicine = data.results[0];

            // Other names
            document.getElementById("otherNames").textContent =
                medicine.other_names || "—";

            // Main information
            document.getElementById("ingredient").textContent =
                medicine.ingredient || ingredient || "—";

            document.getElementById("sport").textContent =
                medicine.sport || sport || "—";

            document.getElementById("country").textContent =
                medicine.country || country || "—";

            document.getElementById("dosage").textContent =
                medicine.dosage || "—";

            // Warnings
            document.getElementById("warnings").textContent =
                medicine.warnings || "—";

            // Status
            const status = medicine.status || "—";

            displayStatus("inCompetitionStatus", status);
            displayStatus("outCompetitionStatus", status);

        } else {

            document.getElementById("otherNames").textContent = "—";
            document.getElementById("dosage").textContent = "—";
            document.getElementById("warnings").textContent = "—";

            displayStatus("inCompetitionStatus", "—");
            displayStatus("outCompetitionStatus", "—");
        }

    })
    .catch(error => {
        console.error("Error loading medicine:", error);
    });

} else {

    document.getElementById("medicineName").textContent =
        "No medicine selected";
}


function displayStatus(elementId, status) {

    const element = document.getElementById(elementId);
    const card = element.closest(".status-card");
    const icon = card.querySelector(".status-icon");

    card.classList.remove("green", "amber", "red");

    const cleanStatus = String(status).trim().toLowerCase();

    if (
        cleanStatus === "green" ||
        cleanStatus === "allowed" ||
        cleanStatus === "not prohibited"
    ) {

        card.classList.add("green");
        element.textContent = "Not Prohibited";
        icon.textContent = "✓";

    } else if (
        cleanStatus === "amber" ||
        cleanStatus === "conditional" ||
        cleanStatus === "allowed with conditions"
    ) {

        card.classList.add("amber");
        element.textContent = "Allowed with Conditions";
        icon.textContent = "!";

    } else if (
        cleanStatus === "red" ||
        cleanStatus === "prohibited"
    ) {

        card.classList.add("red");
        element.textContent = "Prohibited";
        icon.textContent = "✕";

    } else {

        element.textContent = "—";
        icon.textContent = "?";
    }
}

