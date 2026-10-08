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



// ===============================
// MEDICINE IMAGE SCANNER
// ===============================

const medicineImage = document.getElementById("medicineImage");
const scanPreview = document.getElementById("scanPreview");
const scanMedicine = document.getElementById("scanMedicine");


// When the user selects an image
medicineImage.addEventListener("change", function() {

    const file = medicineImage.files[0];


    // If no image was selected
    if (!file) {
        return;
    }


    // Create a temporary URL for the image
    const imageURL = URL.createObjectURL(file);


    // Show the image on the page
    scanPreview.innerHTML = `
        <img
            src="${imageURL}"
            alt="Selected medicine"
            class="preview-image"
        >

        <p>${file.name}</p>

        <p>
            Click "Scan Medicine" to identify the medicine.
        </p>
    `;

});



// ===============================
// SCAN MEDICINE
// ===============================

scanMedicine.addEventListener("click", async function() {

    // Get the selected image
    const file = medicineImage.files[0];


    // Make sure an image was selected
    if (!file) {

        alert("Please take or upload a medicine photo first.");

        return;
    }


    // Change the button text while scanning
    scanMedicine.textContent = "Identifying...";
    scanMedicine.disabled = true;


    try {

        // Create a form to send the image
        const formData = new FormData();

        formData.append("image", file);


        // Send the image to the backend
        const response = await fetch(
            "https://sports-medicine-platform-production.up.railway.app/identify-medicine",
            {
                method: "POST",
                body: formData
            }
        );


        // Get the response from the backend
        const data = await response.json();

        console.log("AI result:", data);


        // Check if the AI found a medicine name
        if (!data.medicineName) {

            scanPreview.innerHTML += `
                <p class="scan-error">
                    Medicine could not be identified.
                    Please try a clearer photo.
                </p>
            `;

            return;
        }


        // Get the medicine name identified by the AI
        const medicineName = data.medicineName;


        // Get the selected sport and country
        const sport = document.getElementById("sport").value;
        const country = document.getElementById("country").value;


        // Create the image URL again
        const imageURL = URL.createObjectURL(file);


        // Show the identified medicine
        // The image is now clickable
        scanPreview.innerHTML = `
            <a
                href="detail.html?ingredient=${encodeURIComponent(medicineName)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}"
                class="medicine-image-link"
            >

                <img
                    src="${imageURL}"
                    alt="${medicineName}"
                    class="preview-image"
                >

            </a>

            <p>
                <strong>${medicineName}</strong>
            </p>

            <p>
                Click the image to view medicine details.
            </p>
        `;


    } catch (error) {

        console.log("Scan error:", error);

        scanPreview.innerHTML += `
            <p class="scan-error">
                Unable to identify the medicine.
                Please try again.
            </p>
        `;

    }


    // Return the button to normal
    scanMedicine.textContent = "Scan Medicine";
    scanMedicine.disabled = false;

});