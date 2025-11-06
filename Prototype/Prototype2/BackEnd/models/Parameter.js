import mongoose from 'mongoose';
const { Schema } = mongoose;

const parameterSchema = new Schema({
    jobTitle: { 
        type: String, 
        required: true 
    },
    company: { 
        type: String, 
        required: true 
    },
    jobDescription: { 
        type: String, 
        required: true 
    },
});

export default mongoose.model('Parameter', parameterSchema);