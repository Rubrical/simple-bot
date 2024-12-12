const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, './../logs');

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    return `${timestamp} [${level}]: ${stack || message}`;
                })
            )
        }),
        new winston.transports.File({
            filename: path.join(logDirectory, "error.log"),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logDirectory, "app.log"),
            level: 'info'
        }),
    ],
});

module.exports = logger;