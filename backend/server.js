require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { createWorker } = require("tesseract.js");

const app = express();

app.use(cors());

// CONFIGURE IMAGE UPLOAD FOR OCR
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new Error("Only image files are allowed"));
        }
    }
});

// MAKE MEDICINE IMAGES ACCESSIBLE TO THE FRONTEND
app.use("/images", express.static(path.join(__dirname, "images")));

// AUTOMATIC MEDICINE IMAGE SEARCH
const imageFolder = path.join(__dirname, "images");

// Convert filenames into a common format
function normalizeImageName(name) {
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]/g, "");
}

// Find the correct medicine image
app.get("/find-image", async function (req, res) {

    const medicineName = req.query.name;

    if (!medicineName) {
        return res.status(400).json({
            error: "Medicine name is required"
        });
    }

    try {
        const files = await fs.promises.readdir(imageFolder);

        // Supported image formats
        const allowedExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
        ];

        // Ignore files that are not images
        const imageFiles = files.filter(file =>
            allowedExtensions.includes(path.extname(file).toLowerCase())
        );

        const searchName = normalizeImageName(medicineName);

        // Handle different spellings of the same medicine
        const aliases = {
            betapyn: ["betayn"]
        };

        const possibleNames = [
            searchName,
            ...(aliases[searchName] || [])
        ];

        // Find an image with a matching filename
        const matchedImage = imageFiles.find(file =>
            possibleNames.includes(normalizeImageName(file))
        );

        if (!matchedImage) {
            return res.status(404).json({
                error: "Medicine image not found",
                medicine: medicineName
            });
        }

        res.json({
            imageUrl: "/images/" + encodeURIComponent(matchedImage),
            fileName: matchedImage
        });

    } catch (error) {
        console.error("Image search error:", error);

        res.status(500).json({
            error: "Unable to search medicine images"
        });
    }
});

const PORT = process.env.PORT || 3000;

// DATABASE CONNECTION
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    ssl: {
        ca: fs.readFileSync(__dirname + "/ca.pem")
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get("/", function (req, res) {
    res.send("Sports Medicine API is running!");
});

// NORMALIZE MEDICINE NAMES


function normalizeMedicineName(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


// IDENTIFY MEDICINE USING DATABASE

async function findMedicineName(lines) {

    // Get known medicine names from the database.
    const [databaseNames] = await db.query(`
        SELECT medicine_name AS name
        FROM medicines
        WHERE medicine_name IS NOT NULL
        AND TRIM(medicine_name) <> ''

        UNION

        SELECT brand_name AS name
        FROM brands
        WHERE brand_name IS NOT NULL
        AND TRIM(brand_name) <> ''

        UNION

        SELECT other_name AS name
        FROM substance_names
        WHERE other_name IS NOT NULL
        AND TRIM(other_name) <> ''

        UNION

        SELECT sub_chemical_name AS name
        FROM sub_chemical_names
        WHERE sub_chemical_name IS NOT NULL
        AND TRIM(sub_chemical_name) <> ''
    `);

    // Normalize medicine names.
    const knownNames = databaseNames
        .map(function(item) {
            return {
                name: String(item.name).trim(),
                normalized: normalizeMedicineName(item.name)
            };
        })
        .filter(function(item) {
            return item.normalized.length >= 4;
        });

    // Calculate the difference between two strings.
    function levenshteinDistance(a, b) {

        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {

                const cost = a[j - 1] === b[i - 1] ? 0 : 1;

                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[b.length][a.length];
    }

    // Store possible medicine matches.
    const matches = new Map();

    // Examine each OCR line.
    lines.forEach(function(line) {

        const originalText = String(line.text || "")
            .replace(/\s+/g, " ")
            .trim();

        const normalizedLine = normalizeMedicineName(originalText);

        const lineConfidence = Number(line.confidence) || 0;

        if (!normalizedLine) {
            return;
        }

        // Break OCR text into individual words.
        const words = originalText
            .toLowerCase()
            .match(/[a-z0-9]+/g) || [];

        // Create groups of consecutive words.
        const textParts = [normalizedLine];

        for (let size = 1; size <= 4; size++) {

            for (let i = 0; i <= words.length - size; i++) {

                const part = words
                    .slice(i, i + size)
                    .join("");

                textParts.push(normalizeMedicineName(part));
            }
        }

        const uniqueParts = [...new Set(textParts)];

        // Compare OCR text against database names.
        knownNames.forEach(function(known) {

            const medicineName = known.name;
            const normalizedName = known.normalized;

            let matchType = "";
            let bestScore = 0;

            uniqueParts.forEach(function(part) {

                if (!part) return;

                let currentType = "";
                let currentScore = 0;

                // Exact match.
                if (part === normalizedName) {

                    currentType = "Exact match";
                    currentScore = 100;

                }

                // Medicine name found inside a longer OCR line.
                else if (
                    normalizedName.length >= 5 &&
                    normalizedLine.includes(normalizedName)
                ) {

                    currentType = "Text match";
                    currentScore = 90;

                }

                // Check for small OCR spelling mistakes.
                else if (
                    normalizedName.length >= 5 &&
                    part.length >= 5
                ) {

                    const distance = levenshteinDistance(
                        part,
                        normalizedName
                    );

                    const allowedErrors =
                        normalizedName.length >= 9 ? 2 : 1;

                    if (distance <= allowedErrors) {

                        currentType = "Close match";

                        currentScore = 75 -
                            (distance * 10);

                    }
                }

                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    matchType = currentType;
                }
            });

            if (!matchType) return;

            // Include OCR confidence in the final score.
            const score = bestScore + (lineConfidence * 0.2);

            // Avoid duplicate medicine suggestions.
            const key = normalizeMedicineName(medicineName);
            const existing = matches.get(key);

            if (!existing || score > existing.score) {

                matches.set(key, {

                    name: medicineName,

                    score: Math.round(score),

                    ocrConfidence: Math.round(lineConfidence),

                    matchType: matchType

                });
            }
        });
    });

    // Sort matches from strongest to weakest.
    const candidates = Array.from(matches.values())
        .sort(function(a, b) {
            return b.score - a.score;
        })
        .slice(0, 5);

    // Suggest the strongest database match.
    const suggestedName = candidates.length > 0
        ? candidates[0].name
        : "";

    return {
        suggestedName: suggestedName,
        candidates: candidates
    };
}


// MEDICINE IMAGE TEXT RECOGNITION (OCR)

app.post("/ocr", upload.single("medicineImage"), async function(req, res) {

    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: "Please capture a medicine image."
        });
    }

    let worker;

    try {
        worker = await createWorker("eng");

        // Tell Tesseract to read text arranged in a block
        await worker.setParameters({
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1"
        });

        // Read the uploaded medicine image
        const result = await worker.recognize(req.file.buffer);

        const text = result.data.text.trim();
        const confidence = result.data.confidence;

        console.log("OCR extracted text:", text);
        console.log("OCR confidence:", confidence);

        if (!text) {
            return res.status(400).json({
                success: false,
                error: "No readable text found. Please take a clearer picture."
            });
        }

       // Log OCR confidence but allow medicine identification to continue
        console.log("OCR confidence:", confidence);

        // Find possible medicine names using the database
        const identification = await findMedicineName(
            result.data.lines || []
        );

        const suggestedName = identification.suggestedName;

        console.log("Suggested medicine:", suggestedName);
        console.log("Medicine candidates:", identification.candidates);

        res.json({
            success: true,
            extractedText: text,
            suggestedName: suggestedName,
            candidates: identification.candidates,
            confidence: confidence
        });

    } catch (error) {
        console.error("OCR error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to read medicine image."
        });

    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
});

// CHECK DATABASE CONNECTION
db.getConnection()
    .then(connection => {
        console.log("MySQL database connected!");
        connection.release();
    })
    .catch(error => {
        console.error("Database connection failed:", error);
    });


app.get("/search", async function (req, res) {

    const medicine = req.query.medicine;
    const sport = req.query.sport;
    const country = req.query.country;
    console.log({ medicine, sport, country });

    if (!medicine || !sport || !country) {
        return res.status(400).json({
            error: "Medicine, sport and country are required"
        });
    }

    try {
       const [results] = await db.query(`
    SELECT
    
COALESCE(
    NULLIF(TRIM(m.medicine_name), ''),

    -- Use the sub-chemical linked to the searched brand
    (
        SELECT MIN(TRIM(scn2.sub_chemical_name))
        FROM brands b2
        JOIN brand_sub_chemicals bsc2
            ON bsc2.brand_id = b2.brand_id
        JOIN sub_chemical_names scn2
            ON scn2.sub_chemical_id = bsc2.sub_chemical_id
        WHERE b2.brand_name LIKE CONCAT('%', TRIM(?), '%')
          AND b2.substance_id = s.substance_id
    ),

    -- Preserve the existing fallback for other searches
    (
        SELECT MIN(TRIM(scn2.sub_chemical_name))
        FROM sub_chemical_names scn2
        WHERE scn2.substance_id = s.substance_id
    ),

    (
        SELECT MIN(bn.brand_name)
        FROM brands bn
        WHERE bn.substance_id = s.substance_id
    ),

    TRIM(s.chemical_name)
) AS search_for,

TRIM(s.chemical_name) AS ingredient,
m.medicine_name AS medicine_name,
cat.category_name AS category,
(
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM brands bx
            JOIN brand_sub_chemicals bcx
                ON bcx.brand_id = bx.brand_id
            WHERE bx.brand_name LIKE CONCAT('%', ?, '%')
        )
        THEN (
            SELECT GROUP_CONCAT(
                DISTINCT TRIM(scn3.sub_chemical_name)
                ORDER BY scn3.sub_chemical_name
                SEPARATOR ', '
            )
            FROM brand_sub_chemicals bsc3
            JOIN brands b3
                ON b3.brand_id = bsc3.brand_id
            JOIN sub_chemical_names scn3
                ON scn3.sub_chemical_id = bsc3.sub_chemical_id
            WHERE b3.brand_name LIKE CONCAT('%', ?, '%')
              AND b3.substance_id = s.substance_id
        )
        ELSE GROUP_CONCAT(
            DISTINCT scn.sub_chemical_name
            ORDER BY scn.sub_chemical_name
            SEPARATOR ', '
        )
    END
) AS sub_chemical_name,
sf.specific_code AS specific_code,
sf.specific_name AS specific_name,
   (
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM brands bx
            JOIN brand_sub_chemicals bcx
                ON bcx.brand_id = bx.brand_id
            WHERE bx.brand_name LIKE CONCAT('%', ?, '%')
        )
        THEN (
            SELECT GROUP_CONCAT(
                DISTINCT TRIM(b3.brand_name)
                ORDER BY b3.brand_name
                SEPARATOR ', '
            )
            FROM brands b3
            JOIN brand_sub_chemicals bsc
                ON bsc.brand_id = b3.brand_id
            WHERE b3.brand_name LIKE CONCAT('%', ?, '%')
              AND b3.substance_id = s.substance_id
        )
        ELSE (
            SELECT GROUP_CONCAT(
                DISTINCT names.other_name
                ORDER BY names.other_name
                SEPARATOR ', '
            )
            FROM (
                SELECT TRIM(sn2.other_name) AS other_name
                FROM substance_names sn2
                WHERE sn2.substance_id = s.substance_id

                UNION

                SELECT TRIM(scn2.sub_chemical_name) AS other_name
                FROM sub_chemical_names scn2
                WHERE scn2.substance_id = s.substance_id
            ) AS names
            WHERE names.other_name IS NOT NULL
              AND names.other_name <> ''
        )
    END
) AS other_names,
   (
    SELECT GROUP_CONCAT(
        DISTINCT bg.brand_name
        ORDER BY bg.brand_name
        SEPARATOR ', '
    )
    FROM brands bg
    WHERE
        bg.medicine_id = m.medicine_id
        OR (
            bg.substance_id = s.substance_id
            AND NOT EXISTS (
                SELECT 1
                FROM brands bm
                WHERE bm.medicine_id = m.medicine_id
            )
        )
) AS brand_names,

    (
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'brand_id', b2.brand_id,
            'brand_name', b2.brand_name,
            'image_url', bi.image_url
        )
    )
    FROM brands b2
    LEFT JOIN brand_images bi
        ON b2.brand_id = bi.brand_id
    WHERE
        b2.medicine_id = m.medicine_id
        OR (
            b2.substance_id = s.substance_id
            AND NOT EXISTS (
                SELECT 1
                FROM brands bm
                WHERE bm.medicine_id = m.medicine_id
            )
        )
) AS brands,
    sp.sports_name AS sport,
    c.country_name AS country,
   CASE
    WHEN s.category_id IS NOT NULL THEN 'Restricted'
    ELSE COALESCE(r.status, 'Not classified')
END AS status,
    d.dosage_information AS dosage,
    w.warning_information AS warning,

(
    SELECT GROUP_CONCAT(
        DISTINCT mp.program_information
        SEPARATOR '\n\n'
    )
    FROM monitoring_programs mp
    WHERE mp.substance_id = s.substance_id
) AS monitoring_program

    FROM substances s
    LEFT JOIN categories cat
    ON cat.category_id = s.category_id

LEFT JOIN specifics sf
    ON sf.specific_id = s.specific_id

LEFT JOIN medicine_substances ms
    ON s.substance_id = ms.substance_id

LEFT JOIN medicines m
    ON ms.medicine_id = m.medicine_id

    LEFT JOIN substance_names sn
        ON s.substance_id = sn.substance_id

        LEFT JOIN sub_chemical_names scn
    ON s.substance_id = scn.substance_id

    LEFT JOIN dosages d
        ON s.substance_id = d.substance_id

    LEFT JOIN warnings w
        ON w.substance_id = s.substance_id

    LEFT JOIN restriction_rules r
        ON s.substance_id = r.substance_id
        AND r.sports_id = (
            SELECT sports_id
            FROM sports
            WHERE sports_name = ?
        )
        AND r.country_id = (
            SELECT country_id
            FROM countries
            WHERE country_name = ?
        )

    LEFT JOIN sports sp
        ON r.sports_id = sp.sports_id

    LEFT JOIN countries c
        ON r.country_id = c.country_id

  
WHERE
(
    (
        EXISTS (
            SELECT 1
            FROM brands bmap
            WHERE bmap.brand_name LIKE CONCAT('%', ?, '%')
        )
        AND EXISTS (
            SELECT 1
            FROM brands bmatch
            WHERE bmatch.brand_name LIKE CONCAT('%', ?, '%')
              AND bmatch.substance_id = s.substance_id
              AND (
                  EXISTS (
                      SELECT 1
                      FROM brand_sub_chemicals bmatchsc
                      WHERE bmatchsc.brand_id = bmatch.brand_id
                  )
                  OR TRIM(m.medicine_name) = TRIM(s.chemical_name)
              )
        )
    )
    OR
    (
        NOT EXISTS (
            SELECT 1
            FROM brands bmap
            WHERE bmap.brand_name LIKE CONCAT('%', ?, '%')
        )
        AND (
            m.medicine_name LIKE CONCAT('%', ?, '%')
            OR TRIM(s.chemical_name) LIKE CONCAT('%', ?, '%')
            OR TRIM(COALESCE(s.sub_chemical_name, '')) = ?
            OR EXISTS (
                SELECT 1
                FROM sub_chemical_names scsearch
                WHERE scsearch.substance_id = s.substance_id
                  AND scsearch.sub_chemical_name LIKE CONCAT('%', ?, '%')
            )
            OR sn.other_name LIKE CONCAT('%', ?, '%')
            OR EXISTS (
                SELECT 1
                FROM brands bsearch
                WHERE bsearch.substance_id = s.substance_id
                  AND bsearch.brand_name LIKE CONCAT('%', ?, '%')
            )
        )
    )
)

GROUP BY
    m.medicine_id,
    s.substance_id,
    sp.sports_id,
    c.country_id,
    r.status,
    d.dosage_information,
    w.warning_information
`, [
     medicine,
    medicine, medicine, medicine, medicine,
    sport, country,
    medicine, medicine, medicine,
    medicine, medicine, medicine,
    medicine, medicine, medicine
]);

       res.json({
    totalResults: results.length,
    results: results
});

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database search failed"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
