'use strict';

const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('[Config] DATABASE_URL environment variable is required');
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    // Return dates as ISO strings rather than JS Date objects
    useUTC: true,
    dateStrings: true,
    typeCast(field, next) {
      if (field.type === 'DATETIME') {
        return field.string();
      }
      return next();
    },
  },
  timezone: '+00:00',
});

module.exports = { sequelize };
