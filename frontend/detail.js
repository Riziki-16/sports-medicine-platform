
/* GET SEARCH DETAILS FROM THE URL*/
  
// Read the information passed from index.html
const params = new URLSearchParams(window.location.search);

const ingredientParam = params.get("ingredient");
const sportParam = params.get("sport");
const countryParam = params.get("country");
const searchDateParam = params.get("searchDate");


/* CONNECT JAVASCRIPT TO HTML ELEMENTS*/
  

// Medicine details
const medicineName = document.getElementById("medicineName");
const otherNames = document.getElementById("otherNames");
const ingredient = document.getElementById("ingredient");
const sport = document.getElementById("sport");
const country = document.getElementById("country");
const dosage = document.getElementById("dosage");
const searchDate = document.getElementById("searchDate");

// Conditions and warnings
const warnings = document.getElementById("warnings");

// WADA classification section
const wadaClassification =
    document.getElementById("wadaClassification");

// In-competition and out-of-competition status cards
const inCompetitionStatus =
    document.getElementById("inCompetitionStatus");

const outCompetitionStatus =
    document.getElementById("outCompetitionStatus");


/*  GET THE CURRENT SEARCH DATE*/
   

// Display the date and time using Kenya's time zone
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


/* DISPLAY THE STATUS COLOURS*/
  

// Change the colour and text according to the API status
function displayStatus(elementId, status) {
    const element = document.getElementById(elementId);
    const card = element.closest(".status-card");
    const icon = card.querySelector(".status-icon");

    // Remove the previous colour
    card.classList.remove("green", "amber", "red");

    const cleanStatus = String(status ?? "")
        .trim()
        .toLowerCase();

    // Green means the substance is not prohibited
    if (
        ["green", "allowable", "allowed",
         "not prohibited"].includes(cleanStatus)
    ) {
        card.classList.add("green");
        element.textContent = "Not Prohibited";
        icon.textContent = "✓";

    // Amber means conditions apply
    } else if (
        ["amber", "conditional",
         "allowed with conditions"].includes(cleanStatus)
    ) {
        card.classList.add("amber");
        element.textContent = "Allowed with Conditions";
        icon.textContent = "!";

    // Red means the substance is prohibited
    } else if (
        ["red", "prohibited", "restricted"].includes(cleanStatus)
    ) {
        card.classList.add("red");
        element.textContent = "Prohibited";
        icon.textContent = "✕";

    // Show a dash if the API has no status
    } else {
        element.textContent = "—";
        icon.textContent = "?";
    }
}


/* FIND THE WADA CLASSIFICATION*/
  


function getWadaClassification(result) {
    const possibleFields = [
        "wada_classification",
        "wadaClassification",
        "wada_subcategory",
        "wadaSubcategory",
        "wada_category",
        "wadaCategory",
        "classification",
        "classification_code",
        "classificationCode",
        "wada_class",
        "wadaClass",
        "prohibited_list_category",
        "prohibitedListCategory"
    ];

    // Check each possible field
    for (const field of possibleFields) {
        const value = result[field];

        // Use the first available classification
        if (value !== undefined && value !== null && value !== "") {

            // Some APIs return several classifications
            if (Array.isArray(value)) {
                return value
                    .map(item => {
                        if (typeof item === "object" && item !== null) {
                            return (
                                item.code ||
                                item.classification_code ||
                                item.name ||
                                item.category ||
                                ""
                            );
                        }

                        return item;
                    })
                    .filter(Boolean)
                    .join(", ");
            }

            // Some APIs return a classification object
            if (typeof value === "object") {
                return (
                    value.code ||
                    value.classification_code ||
                    value.name ||
                    value.category ||
                    "Classification format needs checking"
                );
            }

            // Return the classification supplied by the API
            return String(value);
        }
    }

    // No recognised classification field was found
    return "";
}


/* LOAD THE SELECTED MEDICINE*/

async function loadMedicineDetails() {

    // Check whether a medicine was selected
    if (!ingredientParam) {
        medicineName.textContent = "Medicine Not Found";
        warnings.textContent = "No medicine was selected.";
        searchDate.textContent = getSearchDate();

        if (wadaClassification) {
            wadaClassification.textContent =
                "No classification found.";
        }

        return;
    }

    // Display the basic search details while data loads
    medicineName.textContent = ingredientParam;
    ingredient.textContent = ingredientParam;
    sport.textContent = sportParam || "—";
    country.textContent = countryParam || "—";
    searchDate.textContent = searchDateParam || getSearchDate();

    try {

        // Request the selected medicine from your existing API
        const response = await fetch(
            `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(ingredientParam)}&sport=${encodeURIComponent(sportParam || "")}&country=${encodeURIComponent(countryParam || "")}`
        );

        // Check whether the request was successful
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Convert the API response into JavaScript data
        const data = await response.json();

        // Keep this log to help us check the real API fields
        console.log("Detail API Response:", data);

        // Get the first matching medicine
        const result = data.results?.[0];

        // Handle a medicine that was not found
        if (!result) {
            otherNames.textContent = "—";
            dosage.textContent = "—";
            warnings.textContent = "No additional information found.";

            if (wadaClassification) {
                wadaClassification.textContent =
                    "No classification found.";
            }

            displayStatus("inCompetitionStatus", "");
            displayStatus("outCompetitionStatus", "");

            return;
        }

        /* DISPLAY MEDICINE INFORMATION */
           

        // Display the medicine name from the database
        medicineName.textContent =
            result.medicine_name ||
            result.medicine ||
            result.name ||
            ingredientParam;

        // Display the active ingredient
        ingredient.textContent =
            result.ingredient || ingredientParam;

        // Display other names and brand names
        const names = [
            result.other_names,
            result.brand_names
        ]
            .flatMap(value => Array.isArray(value) ? value : [value])
            .filter(Boolean);

        otherNames.textContent = names.length
            ? names.join(", ")
            : "—";

        // Display dosage information
        dosage.textContent = result.dosage || "—";

        // Display any warnings or conditions
        warnings.textContent =
            result.warnings ||
            result.warning ||
            result.conditions ||
            "No specific warnings provided.";


        /*DISPLAY WADA CLASSIFICATION*/
          

        // Get the classification supplied by the API
        const classification = getWadaClassification(result);

        // Display the classification beneath the status cards
        if (wadaClassification) {
            wadaClassification.textContent =
                classification || "No classification found.";
        }


        /* DISPLAY COMPETITION STATUS*/


       
        const inStatus =
            result.in_competition ??
            result.inCompetition ??
            result.in_competition_status ??
            result.inCompetitionStatus ??
            result.status ??
            "";

        const outStatus =
            result.out_of_competition ??
            result.outCompetition ??
            result.out_of_competition_status ??
            result.outOfCompetitionStatus ??
            result.status ??
            "";

        // Apply the appropriate status colours
        displayStatus("inCompetitionStatus", inStatus);
        displayStatus("outCompetitionStatus", outStatus);

    } catch (error) {

        // Show errors in the browser console
        console.error("Detail Error:", error);

        warnings.textContent =
            "Unable to load medicine information.";

        if (wadaClassification) {
            wadaClassification.textContent =
                "Unable to load classification.";
        }

        // Leave the status unknown if the request fails
        displayStatus("inCompetitionStatus", "");
        displayStatus("outCompetitionStatus", "");
    }
}



    /*LOADING THE MEDICINE*/


loadMedicineDetails();
