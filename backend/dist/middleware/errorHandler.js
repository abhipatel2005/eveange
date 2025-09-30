export const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    // Handle specific error types
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation Error";
    }
    if (err.name === "UnauthorizedError") {
        statusCode = 401;
        message = "Unauthorized";
    }
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired";
    }
    // Duplicate key error (Supabase/PostgreSQL)
    if (err.code === "23505") {
        statusCode = 400;
        message = "Duplicate entry";
    }
    // Foreign key constraint error
    if (err.code === "23503") {
        statusCode = 400;
        message = "Referenced resource not found";
    }
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
