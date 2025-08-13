// serveur GPS - Smart Soccer Tracker (MySQL + CSV auto)
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'mdp',
    database: 'soccer_tracker'
};

const exportsDir = path.join(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir);
}

app.post('/gps', async (req, res) => {
    const {
        latitude,
        longitude,
        altitude,
        vitesseKmh,
        vitesseMps,
        distance,
        hdop,
        satellites,
        direction,
        date,
        time
    } = req.body;

    if (!latitude || !longitude || !date || !time) {
        return res.status(400).json({ error: 'Données GPS incomplètes' });
    }
// Reformater la date "16/7/2025" => "2025-07-16"
const [day, month, year] = date.split('/');
const paddedDay = day.padStart(2, '0');
const paddedMonth = month.padStart(2, '0');
const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;

// S'assurer que time est bien au format HH:MM:SS
const paddedTime = time.split(':').map(t => t.padStart(2, '0')).join(':');

// Créer le timestamp
const timestamp = new Date(`${formattedDate}T${paddedTime}Z`);

if (isNaN(timestamp.getTime())) {
    console.error('❌ TIMESTAMP invalide après formatage:', { formattedDate, paddedTime });
    return res.status(400).json({ error: 'Date ou heure GPS invalide' });
}

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 1) Insérer la donnée GPS
        await connection.execute(
            `INSERT INTO gps_data (
                timestamp, latitude, longitude, altitude,
                vitesseKmh, vitesseMps, distance,
                hdop, satellites, direction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [timestamp, latitude, longitude, altitude,
             vitesseKmh, vitesseMps, distance,
             hdop, satellites, direction]
        );
        console.log('✅ Donnée GPS insérée:', { timestamp, latitude, longitude });  
        res.status(200).json({ message: 'Donnée GPS enregistrée avec succès' });
    } catch (err) {
        console.error('❌ Erreur serveur:', err);
        res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement GPS' });
        }
        finally {
        if (connection) await connection.end();
    }
});

app.listen(PORT, () => {
    console.log(`📡 Serveur GPS à l'écoute sur http://localhost:${PORT}`);
});
