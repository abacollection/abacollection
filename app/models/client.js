const mongoose = require('mongoose');
const validator = require('validator');
const mongooseCommonPlugin = require('mongoose-common-plugin');

const Users = require('./user');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const config = require('../../config');

const Client = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    index: true
  },
  last_name: {
    type: String,
    required: true,
    index:true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female']
  },
  created_by: [
    { type: mongoose.Schema.ObjectId, ref: 'User'}
  ],
  creation_date: {
    type: Date,
    required: true
  }
});

Client.plugin(mongooseCommonPlugin, { object: 'client' });

module.exports = mongoose.model('Client', Client);
