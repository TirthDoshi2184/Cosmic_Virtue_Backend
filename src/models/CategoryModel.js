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
        default:false,
        index : true, // index for faster queries on active categories
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);