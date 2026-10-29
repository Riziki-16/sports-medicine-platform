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
            `https://clean-sport-kenya-api.onrender.com/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
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
/*
const openScanner = document.getElementById("openScanner");
const scannerModal = document.getElementById("scannerModal");
const closeScanner = document.getElementById("closeScanner");

const takePicture = document.getElementById("takePicture");
const uploadPicture = document.getElementById("uploadPicture");
const medicinePhoto = document.getElementById("medicinePhoto");

const cameraPanel = document.getElementById("cameraPanel");
const cameraVideo = document.getElementById("cameraVideo");
const capturePhoto = document.getElementById("capturePhoto");
const stopCamera = document.getElementById("stopCamera");

const preview = document.getElementById("preview");
const scannerStatus = document.getElementById("scannerStatus");

let camera;


// Open the scanner
openScanner.onclick = () => scannerModal.hidden = false;


// Stop the camera
function closeCamera() {
    if (camera) {
        camera.getTracks().forEach(track => track.stop());
        camera = null;
    }

    cameraPanel.hidden = true;
    cameraVideo.srcObject = null;
}


// Close the scanner
closeScanner.onclick = () => {
    closeCamera();
    scannerModal.hidden = true;
};


// Open the camera
takePicture.onclick = async () => {
    try {
        closeCamera();

        camera = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        cameraVideo.srcObject = camera;
        cameraPanel.hidden = false;
        await cameraVideo.play();

    } catch (error) {
        scannerStatus.textContent = "Unable to open camera. Check permission or use Upload a Picture.";
    }
};


// Capture the photo
capturePhoto.onclick = () => {
    const canvas = document.createElement("canvas");

    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;

    canvas.getContext("2d").drawImage(cameraVideo, 0, 0);

    canvas.toBlob(blob => {
        if (!blob) return;

        preview.src = URL.createObjectURL(blob);
        preview.hidden = false;

        scannerStatus.textContent = "Photo captured successfully!";
        closeCamera();
    }, "image/jpeg");
};


// Cancel camera
stopCamera.onclick = closeCamera;


// Upload a saved photo
uploadPicture.onclick = () => {
    closeCamera();
    medicinePhoto.click();
};


// Preview uploaded photo
medicinePhoto.onchange = () => {
    const photo = medicinePhoto.files[0];

    if (photo && photo.type.startsWith("image/")) {
        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;
        scannerStatus.textContent = "Photo uploaded successfully!";
    }
};*/

const openScanner = document.getElementById("openScanner");
const closeScanner = document.getElementById("closeScanner");
const scannerModal = document.getElementById("scannerModal");
const medicinePhoto = document.getElementById("medicinePhoto");
const preview = document.getElementById("preview");
const scannerStatus = document.getElementById("scannerStatus");

const takePicture = document.getElementById("takePicture");
const uploadPicture = document.getElementById("uploadPicture");
const cameraPanel = document.getElementById("cameraPanel");
const cameraVideo = document.getElementById("cameraVideo");

let camera;

// Open scanner
openScanner.onclick = () => scannerModal.hidden = false;

// Stop camera
function stopCamera() {
    if (camera) {
        camera.getTracks().forEach(track => track.stop());
        camera = null;
    }

    cameraVideo.srcObject = null;
    cameraPanel.hidden = true;
}

// Close scanner
closeScanner.onclick = () => {
    stopCamera();
    scannerModal.hidden = true;
};

// Open phone camera or computer webcam
takePicture.onclick = async () => {
    try {
        stopCamera();

        camera = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        cameraVideo.srcObject = camera;
        cameraPanel.hidden = false;
        await cameraVideo.play();
    } catch (error) {
        scannerStatus.textContent =
            "Camera unavailable. Allow camera access or upload a photo.";
    }
};

// Capture photo
document.getElementById("capturePhoto").onclick = () => {
    if (!camera || !cameraVideo.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    canvas.getContext("2d").drawImage(cameraVideo, 0, 0);

    canvas.toBlob(photo => {
        if (!photo) return;

        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;
        scannerStatus.textContent = "Photo captured successfully!";
        stopCamera();
    }, "image/jpeg");
};

// Cancel camera
document.getElementById("stopCamera").onclick = stopCamera;

// Upload a saved photo
uploadPicture.onclick = () => medicinePhoto.click();

medicinePhoto.onchange = () => {
    const photo = medicinePhoto.files[0];

    if (photo && photo.type.startsWith("image/")) {
        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;
        scannerStatus.textContent = "Photo selected successfully.";
    }
};

// Open medicine details when preview is clicked
preview.onclick = () => {
    const medicineName = document.getElementById("search").value.trim();

    if (!medicineName) {
        alert("Please enter the medicine name before opening its details.");
        return;
    }

    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    window.location.href = "detail.html?ingredient=" +
        encodeURIComponent(medicineName) +
        "&sport=" + encodeURIComponent(sport) +
        "&country=" + encodeURIComponent(country);
};

