const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phoneNumber: {
  type: Number,
  required: false,  // CHANGE: was true
  sparse: true,     // ADD: allows multiple null values with unique index
  unique: true      // ADD: so phone lookups are fast and unique
},
password: {
  type: String,
  required: false,  // CHANGE: was true — phone users have no password
},
}, { timestamps: true });

// Hash password before saving (Mongoose 6+ version)
UserSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return; // ADD: !this.password guard
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
// Method to compare passwords during login
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);