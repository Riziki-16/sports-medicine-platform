/* GET SEARCH DETAILS FROM THE URL */

const params = new URLSearchParams(window.location.search);

const ingredientParam = params.get("ingredient");
const sportParam = params.get("sport");
const countryParam = params.get("country");
const searchDateParam = params.get("searchDate");


/* BACKEND IMAGE LOCATION */
const API_URL = "https://clean-sport-kenya-api.onrender.com";


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


/* MEDICINE IMAGE ELEMENTS */

const medicineImageViewer = document.getElementById("medicineImageViewer");

const selectedMedicineName = document.getElementById("selectedMedicineName");

const selectedMedicineImage = document.getElementById("selectedMedicineImage");

const imageMessage = document.getElementById("imageMessage");


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


/* GET WADA CLASSIFICATION */

function getWadaClassification(result) {

    const category = result.category;
    const code = result.specific_code;
    let name = result.specific_name;

    const parts = [];

    if (category) {
        parts.push(category);
    }

    if (code) {
        // Remove the code from the beginning of the name if already present
        if (name && code) {
            name = name.replace(
                new RegExp("^" + code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*"),
                ""
            );
        }

        parts.push(code);
    }

    if (name) {
        parts.push(name);
    }

    return parts.length ? [...new Set(parts)].join(" — ") : "";
}



/* DISPLAY SELECTED MEDICINE IMAGE */

let imageRequestId = 0;

async function showMedicineImage(name) {

    const requestId = ++imageRequestId;

    medicineImageViewer.hidden = false;

    selectedMedicineName.textContent = name;

    selectedMedicineImage.style.display = "none";

    imageMessage.textContent = "Searching for medicine image...";

    try {

        // Ask the backend to find the correct image

        const response = await fetch(
            `${API_URL}/find-image?name=${encodeURIComponent(name)}`
        );

        if (!response.ok) {
            throw new Error("Image not found");
        }

        const data = await response.json();

        // Ignore older image requests

        if (requestId !== imageRequestId) {
            return;
        }

        // Display the image returned by the backend

        selectedMedicineImage.onload = function() {

            if (requestId !== imageRequestId) {
                return;
            }

            selectedMedicineImage.style.display = "block";

            selectedMedicineImage.alt = name + " medicine image";

            imageMessage.textContent = "Image loaded successfully.";

        };

        // Handle images that cannot load

        selectedMedicineImage.onerror = function() {

            if (requestId !== imageRequestId) {
                return;
            }

            selectedMedicineImage.style.display = "none";

            imageMessage.textContent =
                "Unable to display medicine image.";

        };

        selectedMedicineImage.src = API_URL + data.imageUrl;

    } catch (error) {

        if (requestId !== imageRequestId) {
            return;
        }

        console.log("Medicine image error:", error);

        selectedMedicineImage.style.display = "none";

        imageMessage.textContent =
            "Image not available for " + name + ".";

    }

}

/* DISPLAY CLICKABLE OTHER NAMES */
function displayOtherNames(result) {

    function parseNames(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value === "string" && value.trim()) {
            return value.split(",");
        }

        return [];
    }

    // Get brand names and alternative names
    const brandNames = parseNames(result.brand_names);
    const otherNamesList = parseNames(result.other_names);

    // Remove duplicates and empty values
    const cleanNames = names => [...new Set(
        names.map(name => String(name).trim()).filter(Boolean)
    )];

    const brands = cleanNames(brandNames);
    const alternatives = cleanNames(otherNamesList);

    // Identify the original search term
    const searchedTerm = String(ingredientParam || "")
        .trim()
        .toLowerCase();

    // Check whether the searched term is a brand or alternative name
    const matchedName = [...brands, ...alternatives].find(
        name => name.toLowerCase() === searchedTerm
    );

    // Show only the searched name for brand searches.
    // For chemical searches, show all associated names.
    let names;

    if (matchedName) {
    names = [matchedName];
} else {
    names = cleanNames([...brands, ...alternatives]);
}

    otherNames.innerHTML = "";

    if (names.length === 0) {
        otherNames.textContent = "—";
        medicineImageViewer.hidden = true;
        return;
    }

    names.forEach(function(name) {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "medicine-name-button";
        button.textContent = name;

        button.addEventListener("click", function() {
            showMedicineImage(name);
        });

        otherNames.appendChild(button);
    });
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

            `${API_URL}/search?medicine=${encodeURIComponent(ingredientParam)}&sport=${encodeURIComponent(sportParam || "")}&country=${encodeURIComponent(countryParam || "")}`

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

            medicineImageViewer.hidden = true;


            if (wadaClassification) {

                wadaClassification.textContent = "No classification found.";

            }


            displayStatus("inCompetitionStatus", "");

            displayStatus("outCompetitionStatus", "");

            return;

        }


        /* DISPLAY MEDICINE INFORMATION */

        medicineName.textContent =

            result.search_for ||
            result.medicine_name ||
            result.medicine ||
            result.name ||
            ingredientParam;


        ingredient.textContent = result.ingredient || ingredientParam;


        /* DISPLAY CLICKABLE OTHER NAMES */

        displayOtherNames(result);


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
