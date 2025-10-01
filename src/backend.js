import { getDeviceId } from "./deviceIdentifier.js";
import { MongoClient } from "mongodb";

const MONGO_URL = "mongodb://localhost:27017";
const DB_NAME = "your_db";

async function registerDevice() {
  const { deviceId, macAddress } = getDeviceId();
  console.log("Device ID:", deviceId, "MAC:", macAddress);

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const devices = db.collection("devices");

  // Insert or update device
  await devices.updateOne(
    { _id: deviceId },
    { $set: { macAddress, registeredAt: new Date() } },
    { upsert: true }
  );

  console.log("Device registered in MongoDB!");
  await client.close();
}

export default registerDevice;
