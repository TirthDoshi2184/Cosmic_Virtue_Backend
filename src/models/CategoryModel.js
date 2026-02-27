const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    howtoUse: {
        type: [String],
        default: [],
        trim: true,    
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    isactive:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);