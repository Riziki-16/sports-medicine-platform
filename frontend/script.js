const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");


// When the Search button is clicked
form.addEventListener("submit", async function(event) {

    event.preventDefault();

    // Get the information entered by the user
    const medicine = search.value.trim();
    const userTypeValue = userType.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;


    // Make sure the user entered a medicine
    if (medicine === "") {
        alert("Please enter a medicine or substance.");
        return;
    }


    try {

        // Send the information to the backend
        const response = await fetch(
            `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
        );


        // Convert the response into JSON
        const data = await response.json();

        console.log("Search results:", data);


        // Get the results from the backend
        const medicineResults = data.results || [];


        // If there are no results
        if (medicineResults.length === 0) {

            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p>No results found.</p>
            `;

            return;
        }


        // Start displaying the results
        let output = `
            <p>
                <strong>Total Results:</strong>
                ${medicineResults.length}
            </p>

            <div class="formulation-list">

                <div class="formulation-title">
                    Formulation Name
                </div>
        `;


        // Display every medicine found
        medicineResults.forEach(function(medicine, index) {

            const name =
                medicine.search_for ||
                medicine.medicine_name ||
                medicine.ingredient;


            output += `
                <a
                    class="formulation-item"
                    href="detail.html?ingredient=${encodeURIComponent(name)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}"
                >
                    ${index + 1}. ${name}
                </a>
            `;

        });


        // Close the results list
        output += `
            </div>
        `;


        // Put the results on the page
        results.innerHTML = output;


    } catch (error) {

        console.log("Search error:", error);

        results.innerHTML = `
            <p>
                <strong>
                    Error connecting to the medicine database.
                </strong>
            </p>
        `;

    }

});



const openScanner = document.getElementById("openScanner");
const closeScanner = document.getElementById("closeScanner");
const scannerModal = document.getElementById("scannerModal");
const medicinePhoto = document.getElementById("medicinePhoto");
const preview = document.getElementById("preview");
const scannerStatus = document.getElementById("scannerStatus");

openScanner.addEventListener("click", function () {
    scannerModal.hidden = false;
});

closeScanner.addEventListener("click", function () {
    scannerModal.hidden = true;
});

medicinePhoto.addEventListener("change", function () {
    const photo = medicinePhoto.files[0];

    if (photo) {
        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;
        scannerStatus.textContent = "Photo selected successfully.";
    }
});


preview.addEventListener("click", function () {
    const medicineName = search.value.trim();

    if (medicineName === "") {
        alert("Please enter the medicine name before opening its details.");
        return;
    }

    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    window.location.href = "detail.html?ingredient=" +
        encodeURIComponent(medicineName) +
        "&sport=" + encodeURIComponent(sport) +
        "&country=" + encodeURIComponent(country);
});

