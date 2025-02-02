import mongoose from "mongoose";

async function connection(url) {
  try {
    await mongoose.connect(url);
    console.log(`\n MongoDb connected`);
  } catch (error) {
    console.log("MongoDB connection error ", error);
    process.exit(1);
  }
}

export default connection;
