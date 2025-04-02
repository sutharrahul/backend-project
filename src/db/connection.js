import mongoose from "mongoose";

async function connection(url) {
  try {
    await mongoose.connect(url);
    console.log(`\n MongoDb connected `);

    //    console.log(`\n MongoDb connected ${connectionInstance.host} `); read more about that
  } catch (error) {
    console.log("MongoDB connection error ", error);
    process.exit(1);
  }
}

export default connection;
