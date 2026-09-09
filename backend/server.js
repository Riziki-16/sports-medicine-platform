require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");


const app = express();

app.use(cors());

const PORT = 3000;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

app.get("/", function (req, res) {
    res.send("Sports Medicine API is running!");
});

db.getConnection()
    .then(function (connection) {
        console.log("MySQL database connected!");
        connection.release();

        app.listen(PORT, function () {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(function (error) {
        console.error("Database connection failed:", error.message);
    });
    app.get("/search", async function (req, res) {

    const medicine = req.query.medicine;
    const sport = req.query.sport;
    const country = req.query.country;

    if (!medicine || !sport || !country) {
    return res.status(400).json({
        error: "Medicine, sport and country are required"
    });
}

    try {
        const [results] = await db.query(`
            SELECT
                m.medicine_name AS search_for,
                s.chemical_name AS ingredient,
                GROUP_CONCAT(DISTINCT sn.other_name SEPARATOR ', ') AS other_names,
                sp.sports_name AS sport,
                c.country_name AS country,
                r.status AS status
            FROM medicines m
            JOIN medicine_substances ms
                ON m.medicine_id = ms.medicine_id
            JOIN substances s
                ON ms.substance_id = s.substance_id
            LEFT JOIN substance_names sn
                ON s.substance_id = sn.substance_id
            JOIN restriction_rules r
                ON s.substance_id = r.substance_id
            JOIN sports sp
                ON r.sports_id = sp.sports_id
            JOIN countries c
                ON r.country_id = c.country_id
            WHERE m.medicine_name = ?
              AND sp.sports_name = ?
              AND c.country_name = ?
            GROUP BY
                m.medicine_id,
                s.substance_id,
                sp.sports_id,
                c.country_id,
                r.status
        `, [medicine, sport, country]);

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