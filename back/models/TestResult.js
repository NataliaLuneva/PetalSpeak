const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    resultType: {
        type: String,
        required: true
    },
    bouquetTitle: {
        type: String,
        required: true
    },
    refined: {
        type: Boolean,
        default: false
    },
    answers: {
        type: Array,
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("TestResult", testResultSchema);