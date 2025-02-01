const asyncHandler = (requstHandler) => {
  return (req, res, next) => {
    Promise.resolve(requstHandler()).catch((err) => next(err));
  };
};

export { asyncHandler };

/*const asyncHandler2 = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.code || 5000).json({
      success: false,
      message: error.message,
    });
  }
};*/
