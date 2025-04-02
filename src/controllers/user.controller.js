import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    // generating accessToke and refreshToken
    const accessToke = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // save refreshToke in DB
    user.refreshToken = refreshToken;

    // refereshToken saved in DB
    await user.save({ validateBeforeSave: false });
    //when we are save this. Owr monsoose model will kick and as for user password so in this
    // case we are using validateBeforeSave false means don't validate any thing just save it

    return { accessToke, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "somthing went rond while generating refresh and access token"
    );
  }
};

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

  console.log(req.body);
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
  // console.log("req.files:", req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path; // Access the first file in the array
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // Access the first file in the array

  // console.log("avatarLocalPath:", avatarLocalPath);
  // console.log("coverImageLocalPath:", coverImageLocalPath);

  // console.log(avatarLocalPath);
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file path is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // console.log("avatar", avatar);
  // console.log("CoverImage", coverImage);
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

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalide user credentials");
  }

  const { accessToke, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refereshToken"
  );

  // cookies Options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToke, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToke,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = req.user;

  User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //thi remove the field form document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiError(200, {}, "user logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToke = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToke) {
    throw new ApiError(401, "unauthorize request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToke,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToke !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token expired or userd");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToke, newRefreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    return res
      .status(200)
      .cookie("accessToken", accessToke, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToke, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalide refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .statun(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .statun(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  req
    .status(200)
    .json(new ApiResponse(200, user, "Account details successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;
  if (!avatarLocalpath) {
    throw new ApiError(400, "avatar file is missing ");
  }

  const avatar = await uploadOnCloudinary(avatarLocalpath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .statun(200)
    .json(new ApiResponse(200, user, "Avatar image upload successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalpath = req.file?.path;
  if (!coverLocalpath) {
    throw new ApiError(400, "cover file is missing ");
  }

  const coverImage = await uploadOnCloudinary(coverLocalpath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .statun(200)
    .json(new ApiResponse(200, user, "Cover image upload successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "user name is missng");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log(channel);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }
  res
    .send(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .send(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
