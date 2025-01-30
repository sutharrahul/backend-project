import { app } from "./app.js";
import connection from "./db/connection.js";

const port = 8001;

connection("mongodb://127.0.0.1:27017/socialMedia-backend-01")
  .then(() => {
    app.listen(port, () => {
      console.log("MongoDb connected");
    });
  })
  .catch((err) => {
    console.log("MongodbConnection Error : ", err);
  });
