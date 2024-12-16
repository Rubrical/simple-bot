const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const path = require('path');
const { combine, timestamp, printf, colorize } = format;

const logDirectory = path.join(__dirname, "../logs/");

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const logFormat = printf(({level, message, timestamp}) => `${timestamp} [${level}: ${message}]`);
const logger = createLogger({
    format: combine(
        timestamp({ format: "DD-MM-YYYY HH:mm:ss"}), 
        logFormat
    ),
    transports: [
        new transports.Console({
            format: combine(colorize(), logFormat)
        }),
        new transports.File({
            format: combine(logFormat),
            filename: path.join(logDirectory, "app.log")
        })
    ]
});

logger.add(new transports.File({ filename: path.join(logDirectory, "error.log"), level: "error" }));

module.exports = logger;