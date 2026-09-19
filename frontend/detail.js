const params = new URLSearchParams(window.location.search);

const ingredient = params.get("medicine") || "";
const sport = params.get("sport") || "";
const country = params.get("country") || "";


if (ingredient) {

    // Show information received from the search page
    document.getElementById("medicineName").textContent = ingredient;

    document.getElementById("ingredient").textContent =
        ingredient || "—";

    document.getElementById("sport").textContent =
        sport || "—";

    document.getElementById("country").textContent =
        country || "—";



    fetch(
        `http://localhost:3000/search?medicine=${encodeURIComponent(ingredient)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}`
    )

    .then(response => response.json())

    .then(data => {

        console.log("Detail API response:", data);


        if (data.results && data.results.length > 0) {

            const medicine = data.results[0];

            console.log("Medicine data:", medicine);


            // Medicine name
            document.getElementById("medicineName").textContent =
                medicine.ingredient || ingredient || "—";


            // Other names
            document.getElementById("otherNames").textContent =
                medicine.other_names || "—";


            // Ingredient
            document.getElementById("ingredient").textContent =
                medicine.ingredient || ingredient || "—";


            // Sport
            document.getElementById("sport").textContent =
                medicine.sport || sport || "—";


            // Country
            document.getElementById("country").textContent =
                medicine.country || country || "—";


            // Dosage
            document.getElementById("dosage").textContent =
                medicine.dosage || "—";


            // Warnings
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


            
            displayStatus(
                "inCompetitionStatus",
                inCompetitionStatus
            );


            displayStatus(
                "outCompetitionStatus",
                outCompetitionStatus
            );


        }


        else {

            document.getElementById("otherNames").textContent = "—";

            document.getElementById("dosage").textContent = "—";

            document.getElementById("warnings").textContent = "—";


            displayStatus(
                "inCompetitionStatus",
                "—"
            );


            displayStatus(
                "outCompetitionStatus",
                "—"
            );
        }

    })


    .catch(error => {

        console.error(
            "Error loading medicine:",
            error
        );


        document.getElementById("otherNames").textContent = "—";

        document.getElementById("dosage").textContent = "—";

        document.getElementById("warnings").textContent = "—";


        displayStatus(
            "inCompetitionStatus",
            "—"
        );


        displayStatus(
            "outCompetitionStatus",
            "—"
        );

    });

}


else {

    document.getElementById("medicineName").textContent =
        "No medicine selected";


    document.getElementById("otherNames").textContent =
        "—";


    document.getElementById("ingredient").textContent =
        "—";


    document.getElementById("sport").textContent =
        "—";


    document.getElementById("country").textContent =
        "—";


    document.getElementById("dosage").textContent =
        "—";


    document.getElementById("warnings").textContent =
        "—";


    displayStatus(
        "inCompetitionStatus",
        "—"
    );


    displayStatus(
        "outCompetitionStatus",
        "—"
    );
}



function displayStatus(elementId, status) {

    const element =
        document.getElementById(elementId);


    // If the element does not exist
    if (!element) {
        return;
    }


    const card =
        element.closest(".status-card");


    if (!card) {
        return;
    }


    const icon =
        card.querySelector(".status-icon");


    // Remove previous colours
    card.classList.remove(
        "green",
        "amber",
        "red",
        "grey"
    );


    // Clean the status text
    const cleanStatus =
        String(status || "")
            .trim()
            .toLowerCase();


    //Shows green if allowed, not prohibited, or permitted

    if (
        cleanStatus === "green" ||
        cleanStatus === "allowed" ||
        cleanStatus === "not prohibited" ||
        cleanStatus === "permitted"
    ) {

        card.classList.add("green");

        element.textContent =
            "Allowed";

        icon.textContent =
            "✓";
    }


    //Shows amber if conditional, restricted, or allowed with conditions

    else if (
        cleanStatus === "amber" ||
        cleanStatus === "conditional" ||
        cleanStatus === "allowed with conditions" ||
        cleanStatus === "restricted" ||
        cleanStatus.includes("condition")
    ) {

        card.classList.add("amber");

        element.textContent =
            "Allowed with Conditions";

        icon.textContent =
            "!";
    }


    // Shows red if prohibited, banned, or not allowed
    else if (
        cleanStatus === "red" ||
        cleanStatus === "prohibited" ||
        cleanStatus === "banned" ||
        cleanStatus === "not allowed"
    ) {

        card.classList.add("red");

        element.textContent =
            "Not Allowed";

        icon.textContent =
            "✕";
    }

    // shows grey color if the status is unknown or not provided
    

    else {

        card.classList.add("grey");

        element.textContent =
            "No Information";

        icon.textContent =
            "—";
    }
}