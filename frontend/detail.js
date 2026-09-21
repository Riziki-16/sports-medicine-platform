const params = new URLSearchParams(window.location.search);

const ingredientParam = params.get("ingredient");
const sportParam = params.get("sport");
const countryParam = params.get("country");
const searchDateParam = params.get("searchDate");

const medicineName = document.getElementById("medicineName");
const otherNames = document.getElementById("otherNames");
const ingredient = document.getElementById("ingredient");
const sport = document.getElementById("sport");
const country = document.getElementById("country");
const dosage = document.getElementById("dosage");
const searchDate = document.getElementById("searchDate");

const warnings = document.getElementById("warnings");

const inCompetitionCard = document.getElementById("inCompetitionCard");
const outCompetitionCard = document.getElementById("outCompetitionCard");

const inCompetitionStatus = document.getElementById("inCompetitionStatus");
const outCompetitionStatus = document.getElementById("outCompetitionStatus");

const inCompetitionIcon = document.getElementById("inCompetitionIcon");
const outCompetitionIcon = document.getElementById("outCompetitionIcon");


function getSearchDate() {
    const now = new Date();

    return new Intl.DateTimeFormat("en-GB", {
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
}


function displayStatus(elementId, status) {
    const element = document.getElementById(elementId);
    const card = element.closest(".status-card");
    const icon = card.querySelector(".status-icon");

    card.classList.remove("green", "amber", "red");

    const cleanStatus = String(status).trim().toLowerCase();

    if (
        cleanStatus === "green" ||
        cleanStatus === "allowable" ||
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
        cleanStatus === "prohibited" ||
        cleanStatus === "restricted"
    ) {
        card.classList.add("red");
        element.textContent = "Prohibited";
        icon.textContent = "✕";

    } else {
        element.textContent = "—";
        icon.textContent = "?";
    }
}async function loadMedicineDetails() {

    if (!ingredientParam) {
        medicineName.textContent = "Medicine Not Found";
        warnings.textContent = "No medicine was selected.";
        searchDate.textContent = getSearchDate();
        return;
    }

    // Show information from the URL immediately
    medicineName.textContent = ingredientParam;
    ingredient.textContent = ingredientParam;
    sport.textContent = sportParam || "—";
    country.textContent = countryParam || "—";
    searchDate.textContent = searchDateParam || getSearchDate();

    try {

        const response = await fetch(
            `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(ingredientParam)}&sport=${encodeURIComponent(sportParam || "")}&country=${encodeURIComponent(countryParam || "")}`
        );

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        console.log("Detail API Response:", data);

        const result = data.results?.[0];

        if (!result) {

            otherNames.textContent = "—";
            dosage.textContent = "—";
            warnings.textContent = "No additional information found.";

            displayStatus("inCompetitionStatus", "—");
            displayStatus("outCompetitionStatus", "—");

            return;
        }

        medicineName.textContent =
            result.medicine_name ||
            result.medicine ||
            result.name ||
            ingredientParam;

        ingredient.textContent =
            result.ingredient ||
            ingredientParam;

        otherNames.textContent =
            result.other_names ||
            "—";

        dosage.textContent =
            result.dosage ||
            "—";

        warnings.textContent =
            result.warnings ||
            result.warning ||
            result.conditions ||
            "No specific warnings provided.";

        // Demonstration display categories
        const ingredientName = String(
            result.ingredient || ingredientParam || ""
        ).trim().toLowerCase();

        let inStatus;
        let outStatus;

        if (ingredientName === "paracetamol") {

            inStatus = "Not Prohibited";
            outStatus = "Not Prohibited";

        } else if (ingredientName === "salbutamol") {

            inStatus = "Allowed with Conditions";
            outStatus = "Allowed with Conditions";

        } else if (
            ingredientName === "testosterone" ||
            ingredientName.includes("testosterone")
        ) {

            inStatus = "Prohibited";
            outStatus = "Prohibited";

        } else {

            inStatus =
                result.in_competition ||
                result.inCompetition ||
                result.in_competition_status ||
                result.status ||
                "—";

            outStatus =
                result.out_of_competition ||
                result.outCompetition ||
                result.out_of_competition_status ||
                result.status ||
                "—";
        }

        displayStatus(
            "inCompetitionStatus",
            inStatus
        );

        displayStatus(
            "outCompetitionStatus",
            outStatus
        );

    } catch (error) {

        console.error("Detail Error:", error);

        warnings.textContent =
            "Unable to load medicine information.";

        displayStatus(
            "inCompetitionStatus",
            "—"
        );

        displayStatus(
            "outCompetitionStatus",
            "—"
        );
    }
}

loadMedicineDetails();