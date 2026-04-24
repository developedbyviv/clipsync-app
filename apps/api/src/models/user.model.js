'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    // NULL for Google-only users
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    // Populated from Google profile
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // NULL for email/password users
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Default scope never returns password_hash — security baseline
    defaultScope: {
      attributes: {
        exclude: ['password_hash'],
      },
    },
    scopes: {
      // Use User.scope('withPassword') to include hash for login verification
      withPassword: {
        attributes: { include: ['password_hash'] },
      },
    },
  }
);

module.exports = User;
