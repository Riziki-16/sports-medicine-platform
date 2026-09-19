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


function setStatus(card, icon, textElement, status) {
    card.classList.remove(
        "safe",
        "warning",
        "prohibited",
        "unknown"
    );

    const value = String(status || "").toLowerCase();

    textElement.textContent = status || "—";

    if (
        value.includes("prohibited") ||
        value.includes("banned") ||
        value.includes("not allowed")
    ) {
        card.classList.add("prohibited");
        icon.textContent = "✕";
    } else if (
        value.includes("warning") ||
        value.includes("caution") ||
        value.includes("conditional")
    ) {
        card.classList.add("warning");
        icon.textContent = "!";
    } else if (
        value.includes("allowed") ||
        value.includes("permitted") ||
        value.includes("not prohibited")
    ) {
        card.classList.add("safe");
        icon.textContent = "✓";
    } else {
        card.classList.add("unknown");
        icon.textContent = "?";
    }
}


async function loadMedicineDetails() {
    if (!ingredientParam) {
        medicineName.textContent = "Medicine Not Found";
        warnings.textContent = "No medicine was selected.";
        return;
    }

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
            setStatus(
                inCompetitionCard,
                inCompetitionIcon,
                inCompetitionStatus,
                "No information"
            );
            setStatus(
                outCompetitionCard,
                outCompetitionIcon,
                outCompetitionStatus,
                "No information"
            );
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

        const inStatus =
            result.in_competition ||
            result.inCompetition ||
            result.in_competition_status ||
            result.status ||
            "—";

        const outStatus =
            result.out_of_competition ||
            result.outCompetition ||
            result.out_of_competition_status ||
            "—";

        setStatus(
            inCompetitionCard,
            inCompetitionIcon,
            inCompetitionStatus,
            inStatus
        );

        setStatus(
            outCompetitionCard,
            outCompetitionIcon,
            outCompetitionStatus,
            outStatus
        );

    } catch (error) {
        console.error("Detail Error:", error);

        warnings.textContent =
            "Unable to load medicine information.";

        setStatus(
            inCompetitionCard,
            inCompetitionIcon,
            inCompetitionStatus,
            "Unable to load"
        );

        setStatus(
            outCompetitionCard,
            outCompetitionIcon,
            outCompetitionStatus,
            "Unable to load"
        );
    }
}


loadMedicineDetails();