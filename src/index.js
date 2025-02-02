import { app } from "./app.js";
import connection from "./db/connection.js";

const port = 8001;

connection("mongodb://127.0.0.1:27017/socialMedia-backend-01")
  .then(() => {
    app.listen(port, () => {
      console.log(`server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("server Connection Error : ", err);
  });
