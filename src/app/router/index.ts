import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
import userRouter from "./user";

import {
  emailJWTValidation,
  getSingleRestaurantValidation,
  loginValidation,
  otpValidation,
  resetPasswordValidation,
  restaurantGetValidation,
  retryOTPValidation,
  signupValidation,
} from "../middleware/inputValidation";
import { signInUser } from "../handlers/user/signin/signInUser";

import { dropDatabase } from "../modules/misc/dropMongo";

import { verifyOTP } from "../handlers/user/signin/verifyOTP";
import { blockJWT, protect } from "../middleware/auth";
import {
  apiLimiter,
  loginRateLimiter,
  requestVerificationLimit,
} from "../middleware/apiLimiter";
import { passwordReset } from "../handlers/user/signin/passwordReset";
import { generateNewPassword } from "../handlers/user/signin/generateNewPassword";

import client from "../../../lib/redis/init";
import { verifyEmail } from "../handlers/user/signup/verifyEmail";
import { createNewUser } from "../handlers/user/signup/createNewUser";
import { handleErrors } from "../middleware/handleErrors";

import path from "path";
import fs from "fs";
import { testStream } from "../handlers/testStreaming/testStream";
import { createNewRider } from "../handlers/rider/signup/createNewRider";
import { SignInRider as signInRider } from "../handlers/rider/signin/signinRider";
import { verifyEmailRider } from "../handlers/rider/signup/verifyEmail";
import { verifyOTPRider } from "../handlers/rider/signin/verifyOTP";
import { generateNewPasswordRider } from "../handlers/rider/signin/generateNewPassword";
import { passwordResetRider } from "../handlers/rider/signin/passwordReset";
import http from "http";
import riderRouter from "./rider";

import { getRestaurantsAll } from "../handlers/restaurant/getRestaurant/getAllRestaurants";
import { retryOtp } from "../handlers/user/signin/retryOtp";
import cookieParser from "cookie-parser";
import { populateRestaurant } from "../handlers/restaurant/getRestaurant/populateRestaurant";
import { getSkipRestaurantsByName } from "../handlers/restaurant/getRestaurant/getSkipRestaurantsByName";
import { getRestaurantsByName } from "../handlers/restaurant/getRestaurant/getRestaurantsByName";
import { getRestaurantsSkip } from "../handlers/restaurant/getRestaurant/getSkipRestauarant";
import userAgent from "express-useragent";
import restAdminRouter from "./restaurantAdmin";
import { createNewUserRest } from "../handlers/restaurantAdmin/signup/createNewUser";
import multer from "multer";
import { signInRestAdmin } from "../handlers/restaurantAdmin/signin/signInUser";
import { verifyOTPRestAdmin } from "../handlers/restaurantAdmin/signin/verifyOTP";
import { getSingleRestaurant } from "../handlers/restaurant/getRestaurant/getSingleRestaurant";
import { getUserMenu } from "../handlers/restaurant/getUserMenu";
import helmet from 'helmet'
import { Worker } from "worker_threads";
const app = express();
const upload = multer();

const server = http.createServer(app);
app.use(helmet())
app.use(userAgent.express());
app.use(cookieParser());
app.set("trust proxy", true);
app.use(cors());

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

(async () => {
  client.on("error", (err) => console.log("❌- Redis Client Error", err));

  await client
    .connect()
    .then((e) => {
      console.log("🚀 connected");
    })
    .catch((e) => {
      console.log(`error is ${e}`);
    });
})();

app.get("/", async (req, res) => {
  console.log(req.ip);
  res.status(200).json({ success: "👍 Okay" });
});

// app.get("/:ip", async (req, res) => {
//   console.log({ ip: req.params.ip });
//   res.status(200).json({ ip: req.params.ip });
// });

app.use(apiLimiter);

//? User EndPoints
app.post("/api/auth/signup", signupValidation, handleErrors, createNewUser);
app.post(
  "/api/auth/login",
  loginRateLimiter,
  loginValidation,
  handleErrors,
  signInUser
);
app.get("/verify/:token", emailJWTValidation, handleErrors, verifyEmail);
app.get("/reset/:token", emailJWTValidation, handleErrors, generateNewPassword);
app.put("/api/auth/otp", otpValidation, handleErrors, verifyOTP);
app.put(
  "/api/auth/reset-password",
  resetPasswordValidation,
  handleErrors,
  passwordReset
);
app.get(
  "/api/auth/retry-otp",
  requestVerificationLimit,
  retryOTPValidation,
  handleErrors,
  retryOtp
);

//? Rider EndPoints
app.post(
  "/api/auth/signup-rider",
  signupValidation,
  handleErrors,
  createNewRider
);
app.post("/api/auth/login-rider", loginValidation, handleErrors, signInRider);
app.get(
  "/verify-rider/:token",
  emailJWTValidation,
  handleErrors,
  verifyEmailRider
);
app.get(
  "/reset-rider/:token",
  emailJWTValidation,
  handleErrors,
  generateNewPasswordRider
);
app.put("/api/auth/otp-rider", otpValidation, handleErrors, verifyOTPRider);
app.put(
  "/api/auth/reset-password",
  resetPasswordValidation,
  handleErrors,
  passwordResetRider
);

//? Restaurant EndPoints
app.post("/api/auth/signup-restAdmin", createNewUserRest);
app.post("/api/check", (req, res) => {
  console.log(req.body);
});
app.post(
  "/api/auth/login-restAdmin",
  loginRateLimiter,
  loginValidation,
  handleErrors,
  signInRestAdmin
);
app.put(
  "/api/auth/verifyOtp-admin",
  otpValidation,
  handleErrors,
  verifyOTPRestAdmin
);
app.get("/drop", dropDatabase);
//app.get("/populate", populateRestaurant);
app.get(
  "/api/restaurants",
  restaurantGetValidation,
  handleErrors,
  (req: Request, res: Response) => {
    if (req.query.name) {
      if (req.query.start && req.query.take) {
        return getSkipRestaurantsByName(req, res);
      } else {
        return getRestaurantsByName(req, res);
      }
    } else {
      if (req.query.start && req.query.take) {
        return getRestaurantsSkip(req, res);
      } else {
        return getRestaurantsAll(req, res);
      }
    }
  }
);
app.get(
  "/api/restaurant/:id",
  getSingleRestaurantValidation,
  handleErrors,
  getSingleRestaurant
);
app.get("/file/:id", (req, res) => {
  
});

//? Misc EndPoints
// app.get("/pic/:id", (req, res) => {
//   const { id } = req.params;

//   if (fs.existsSync(path.join(rootDir, "/uploads/", `${id}`))) {
//     return res.sendFile(path.join(rootDir, "/uploads/", `${id}`));
//   }
//   return res.sendFile(path.join(rootDir, "/uploads/", `nopic.png`));
// });

app.get("/testVideo", testStream);
app.get("/getMenu", getUserMenu);
//checkVerificationStream("642b3dd392a744e5f57c1e4b");
app.use("/api", blockJWT, protect, userRouter);
app.use("/api", blockJWT, protect, riderRouter);
app.use("/api", blockJWT, protect, restAdminRouter);

// app.post("/auth/login", createNewUser);
export default server;
