import express, { urlencoded } from "express";
import corse from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  corse({
    origin: process.env.CORS_ORIGN,
    credentials: true,
  })
);

app.use(express.json);
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

export { app };
