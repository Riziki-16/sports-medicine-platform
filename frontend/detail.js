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

            console.log("Medicine data:", medicine);

            document.getElementById("otherNames").textContent =
                medicine.other_names || "—";

            document.getElementById("ingredient").textContent =
                medicine.ingredient || ingredient || "—";

            document.getElementById("sport").textContent =
                medicine.sport || sport || "—";

            document.getElementById("country").textContent =
                medicine.country || country || "—";

            document.getElementById("dosage").textContent =
                medicine.dosage || "—";
            

            document.getElementById("warnings").textContent =
                medicine.warnings || "—";
 

            const inCompetitionStatus =
                medicine.in_competition ||
                medicine.inCompetition ||
                medicine.in_competition_status ||
                medicine.inCompetitionStatus ||
                medicine.status ||
                "—";


            const outCompetitionStatus =
                medicine.out_of_competition ||
                medicine.outOfCompetition ||
                medicine.out_of_competition_status ||
                medicine.outOfCompetitionStatus ||
                medicine.status ||
                "—";
s
            displayStatus(
                "inCompetitionStatus",
                inCompetitionStatus
            );

            displayStatus(
                "outCompetitionStatus",
                outCompetitionStatus
            );


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

        displayStatus("inCompetitionStatus", "—");
        displayStatus("outCompetitionStatus", "—");
    });

} else {

    document.getElementById("medicineName").textContent =
        "No medicine selected";
}


// FUNCTION TO DISPLAY GREEN / AMBER / RED STATUS


function displayStatus(elementId, status) {

    const element = document.getElementById(elementId);

    if (!element) {
        return;
    }

    const card = element.closest(".status-card");
    const icon = card.querySelector(".status-icon");

    // Remove previous colour
    card.classList.remove("green", "amber", "red");

    const cleanStatus = String(status)
        .trim()
        .toLowerCase();

    // GREEN - ALLOWED
    
    if (
        cleanStatus === "green" ||
        cleanStatus === "allowed" ||
        cleanStatus === "not prohibited" ||
        cleanStatus === "permitted"
    ) {

        card.classList.add("green");
        element.textContent = "Allowed";
        icon.textContent = "✓";
    }

    // AMBER - CONDITIONAL
   
    else if (
        cleanStatus === "amber" ||
        cleanStatus === "conditional" ||
        cleanStatus === "allowed with conditions" ||
        cleanStatus === "restricted" ||
        cleanStatus.includes("condition")
    ) {

        card.classList.add("amber");
        element.textContent = "Allowed with Conditions";
        icon.textContent = "!";
    }

    // RED - PROHIBITED


    else if (
        cleanStatus === "red" ||
        cleanStatus === "prohibited" ||
        cleanStatus === "banned" ||
        cleanStatus === "not allowed"
    ) {

        card.classList.add("red");

        element.textContent = "Not Allowed";

        icon.textContent = "✕";
    }

    // UNKNOWN
    else {

        element.textContent = "—";

        icon.textContent = "?";
    }
}