import mongoose from 'mongoose';

const homeworkSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD — qaysi kunga berilgan
        required: true,
        index: true
    },
    dueDate: {
        type: String, // YYYY-MM-DD — topshirish muddati
        default: null
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        default: null
    },
    filePublicId: {
        type: String,
        default: null
    },
    fileType: {
        type: String, // 'image', 'pdf', 'word'
        default: null
    }
}, {
    timestamps: true
});

homeworkSchema.index({ className: 1, date: -1 });
homeworkSchema.index({ teacherId: 1, date: -1 });

const Homework = mongoose.model('Homework', homeworkSchema);
export default Homework;
