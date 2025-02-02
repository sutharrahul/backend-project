import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  // get User details from frontend
  // validation (email, userName,) -  not empty
  // check if user already exist :- username and email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object create entry in Db
  // remove password and refresh token field from response
  // check for user creation
  // return response
  const { userName, email, fullName, password } = req.body;
  console.log("email: ", email);
});

export { registerUser };
