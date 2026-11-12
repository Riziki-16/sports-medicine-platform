require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const fs = require("fs");


const app = express();

app.use(cors());

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
    w.warning_information AS warning

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
