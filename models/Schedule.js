import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
        index: true
    },
    className: {
        type: String,
        required: true
    },
    day: {
        type: Number, // 1 (Mon) to 6 (Sat)
        required: true,
        min: 1,
        max: 6
    },
    period: {
        type: Number, // 1st lesson, 2nd lesson, etc.
        required: true,
        min: 1,
        max: 10
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    teacherName: {
        type: String,
        trim: true
    },
    room: {
        type: String,
        trim: true
    },
    startTime: {
        type: String // e.g., "08:30"
    },
    endTime: {
        type: String // e.g., "09:15"
    }
}, {
    timestamps: true
});

// Compound index for unique slots per class/day/period
scheduleSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
