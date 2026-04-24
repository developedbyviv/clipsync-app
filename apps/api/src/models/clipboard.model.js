'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Clipboard = sequelize.define(
  'Clipboard',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    pin: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
      validate: {
        is: /^\d{6}$/,
        notEmpty: true,
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    read_and_destroy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Nullable FK — anonymous clipboards allowed
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'clipboards',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // Fast dashboard queries: clipboards by user
      { fields: ['user_id'] },
    ],
  }
);

module.exports = Clipboard;
