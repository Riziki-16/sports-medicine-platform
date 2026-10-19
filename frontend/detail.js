/* GET SEARCH DETAILS FROM THE URL */

const params = new URLSearchParams(window.location.search);

const ingredientParam = params.get("ingredient");
const sportParam = params.get("sport");
const countryParam = params.get("country");
const searchDateParam = params.get("searchDate");


/* CONNECT JAVASCRIPT TO HTML */

const medicineName = document.getElementById("medicineName");
const otherNames = document.getElementById("otherNames");
const ingredient = document.getElementById("ingredient");
const sport = document.getElementById("sport");
const country = document.getElementById("country");
const dosage = document.getElementById("dosage");
const searchDate = document.getElementById("searchDate");

const warnings = document.getElementById("warnings");
const wadaClassification = document.getElementById("wadaClassification");

const inCompetitionStatus = document.getElementById("inCompetitionStatus");
const outCompetitionStatus = document.getElementById("outCompetitionStatus");


/* GET CURRENT DATE AND TIME */

function getSearchDate() {
    const now = new Date();

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(now);
}


/* DISPLAY STATUS COLOURS */

function displayStatus(elementId, status) {
    const element = document.getElementById(elementId);
    const card = element.closest(".status-card");
    const icon = card.querySelector(".status-icon");

    card.classList.remove("green", "amber", "red");

    status = String(status || "").trim().toLowerCase();

    if (["green", "allowable", "allowed", "not prohibited"].includes(status)) {
        card.classList.add("green");
        element.textContent = "Not Prohibited";
        icon.textContent = "✓";

    } else if (["amber", "conditional", "allowed with conditions"].includes(status)) {
        card.classList.add("amber");
        element.textContent = "Allowed with Conditions";
        icon.textContent = "!";

    } else if (["red", "prohibited", "restricted"].includes(status)) {
        card.classList.add("red");
        element.textContent = "Prohibited";
        icon.textContent = "✕";

    } else {
        element.textContent = "—";
        icon.textContent = "?";
    }
}


/* GET WADA CLASSIFICATION */

function getWadaClassification(result) {
    const category = result.category;
    const code = result.specific_code;
    const name = result.specific_name;

    const parts = [];

    if (category) {
        parts.push(category);
    }

    if (code) {
        parts.push(code);
    }

    if (name) {
        parts.push(name);
    }

    return parts.length ? [...new Set(parts)].join(" — ") : "";
}


/* LOAD MEDICINE DETAILS */

async function loadMedicineDetails() {

    if (!ingredientParam) {
        medicineName.textContent = "Medicine Not Found";
        warnings.textContent = "No medicine was selected.";
        searchDate.textContent = getSearchDate();
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
            throw new Error("Unable to get medicine details");
        }

        const data = await response.json();

        console.log("Detail API Response:", data);

        const result = data.results?.[0];

        if (!result) {
            otherNames.textContent = "—";
            dosage.textContent = "—";
            warnings.textContent = "No additional information found.";

            if (wadaClassification) {
                wadaClassification.textContent = "No classification found.";
            }

            displayStatus("inCompetitionStatus", "");
            displayStatus("outCompetitionStatus", "");
            return;
        }


        /* DISPLAY MEDICINE INFORMATION */

        medicineName.textContent =
            result.medicine_name || result.medicine || result.name || ingredientParam;

        ingredient.textContent = result.ingredient || ingredientParam;


        /* DISPLAY OTHER NAMES WITH IMAGES */


let names = [];

if (result.other_names) {
    names = names.concat(result.other_names);
}

if (result.brand_names) {
    names = names.concat(result.brand_names);
}

otherNames.innerHTML = "";

names.forEach(function(name) {
    const image = document.createElement("img");

    image.alt = name;
    image.width = 120;

    const extensions = [".png", ".jpg", ".jpeg"];
    let index = 0;

    function loadImage() {
        if (index < extensions.length) {
            image.src = `images/${name}${extensions[index]}`;
            index++;
        } else {
            image.style.display = "none";
        }
    }

    image.onerror = loadImage;
    loadImage();

    const text = document.createElement("p");
    text.textContent = name;

    otherNames.appendChild(image);
    otherNames.appendChild(text);
});

if (names.length === 0) {
    otherNames.textContent = "—";
}


        /* DISPLAY DOSAGE AND WARNINGS */

        dosage.textContent = result.dosage || "—";

        warnings.textContent =
            result.warnings ||
            result.warning ||
            result.conditions ||
            "No specific warnings provided.";


        /* DISPLAY WADA CLASSIFICATION */

        const classification = getWadaClassification(result);

        if (wadaClassification) {
            wadaClassification.textContent =
                classification || "No classification found.";
        }


        /* DISPLAY COMPETITION STATUS */

        const inStatus =
            result.in_competition ||
            result.inCompetition ||
            result.in_competition_status ||
            result.inCompetitionStatus ||
            result.status || "";

        const outStatus =
            result.out_of_competition ||
            result.outCompetition ||
            result.out_of_competition_status ||
            result.outOfCompetitionStatus ||
            result.status || "";

        displayStatus("inCompetitionStatus", inStatus);
        displayStatus("outCompetitionStatus", outStatus);

    } catch (error) {
        console.error("Detail Error:", error);

        warnings.textContent = "Unable to load medicine information.";

        if (wadaClassification) {
            wadaClassification.textContent = "Unable to load classification.";
        }

        displayStatus("inCompetitionStatus", "");
        displayStatus("outCompetitionStatus", "");
    }
}


/* START LOADING THE MEDICINE */

loadMedicineDetails();