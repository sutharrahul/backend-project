import express from "express";
import corse from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  corse({
    origin: process.env.CORS_ORIGN,
    credentials: true,
  })
);

app.use(express.json()); //can also set a limit app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// importing routers
import userRouter from "./routers/user.routes.js";

app.use("/api/v1/user", userRouter);

export { app };
