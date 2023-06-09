import { Router } from "express";
import { getRider } from "../handlers/rider/profile/getRider";
import { setPrefsRider } from "../handlers/rider/profile/setPrefs";
import { uploadPhotoOcean } from "../handlers/user/profile/uploadProfilePicture";
import { createRestaurant } from "../handlers/restaurant/createRestaurant/createRestaurant";
import { CreateRestaurantValidation, createMenuValidation } from "../middleware/inputValidation";
import { handleErrors } from "../middleware/handleErrors";
import { getRestaurantAdmin } from "../handlers/restaurantAdmin/profile/getRestaurantAdmin";
import { createMenu } from "../handlers/restaurant/createRestaurant/createMenu";

const restAdminRouter = Router();

restAdminRouter.post(
  "/create-restaurant",
  uploadPhotoOcean,
  CreateRestaurantValidation,
  handleErrors,

  createRestaurant
);
restAdminRouter.get("/auth/rest-admin", getRestaurantAdmin);
restAdminRouter.put("/admin/create-menu",uploadPhotoOcean, createMenuValidation, handleErrors, createMenu)

export default restAdminRouter;
