import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get User details from frontend
  // validation (email, username,) -  not empty
  // check if user already exist :- username and email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object create entry in Db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  console.log("req.files:", req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path; // Access the first file in the array
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // Access the first file in the array

  console.log("avatarLocalPath:", avatarLocalPath);
  console.log("coverImageLocalPath:", coverImageLocalPath);

  console.log(avatarLocalPath);
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file path is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log("avatar", avatar);
  console.log("CoverImage", coverImage);
  if (!avatar) {
    throw new ApiError(400, "Avatar file required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    password,
    email,
    username: username.toLowerCase(),
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "somthing went wrong while register user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

export { registerUser };
