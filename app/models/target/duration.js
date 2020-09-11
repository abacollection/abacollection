const mongoose = require('mongoose');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const durationSchema = new mongoose.Schema();

module.exports = durationSchema;
