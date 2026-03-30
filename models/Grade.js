import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    status: {
        type: String,
        enum: ['red', 'yellow', 'green'],
        required: true
    },
    comment: {
        type: String,
        trim: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true,
        index: true
    },
    period: {
        type: Number,
        min: 1,
        max: 9
    }
}, {
    timestamps: true
});

// Compound index for frequent queries
gradeSchema.index({ studentId: 1, date: 1 });
gradeSchema.index({ studentId: 1, subject: 1 });

const Grade = mongoose.model('Grade', gradeSchema);

export default Grade;
