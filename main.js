const MDMApp = require('./src/main/app');
const mdmApp = new MDMApp();

// Import device registration (assuming you wrote it in backend.js)
const { getDeviceId } = require('./deviceIdentifier.js');
const { MongoClient } = require('mongodb');

// MongoDB config
const MONGO_URL = "mongodb://localhost:27017";
const DB_NAME = "your_db";

async function registerDevice() {
    const { deviceId, macAddress } = getDeviceId();
    console.log("Device ID:", deviceId, "MAC:", macAddress);

    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const devices = db.collection("devices");

        await devices.updateOne(
            { _id: deviceId },
            { $set: { macAddress, registeredAt: new Date() } },
            { upsert: true }
        );

        console.log("Device registered successfully!");
    } catch (err) {
        console.error("Failed to register device:", err);
    } finally {
        await client.close();
    }
}

// Register device asynchronously after app starts
(async () => {
    await registerDevice();
})();

// Global error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception at top level:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at top level:', reason);
    process.exit(1);
});
