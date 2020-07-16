const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const Member = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  group: {
    type: String,
    default: 'user',
    enum: ['admin', 'user'],
    lowercase: true,
    trim: true
  }
});

Member.plugin(mongooseCommonPlugin, {
  object: 'member',
  omitCommonFields: false,
  uniqueID: false
});

const Client = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    index: true
  },
  last_name: {
    type: String,
    required: true,
    index: true
  },
  dob: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female']
  },
  created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
  creation_date: {
    type: Date,
    required: true
  },
  members: [Member]
});

Client.virtual('name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

Client.plugin(mongooseCommonPlugin, { object: 'client', uniqueID: true });
Client.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Client', Client);
module.exports.Member = Member;
