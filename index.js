//Modules and middleware
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const { request } = require('http');
const app = express();
app.use(express.json());

//atlas url
const url = process.env.ATLAS_URL;

//mongodb connect
mongoose.connect(url)
    .then(() => {
        console.log("connected to atlas mongodb");
    })
    .catch(err => {
        console.error(err);
    })

//define mentor schema
const mentorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

//define student schema
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    currentMentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mentor"
    },
    previousMentor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mentor"
    }]
});


//Create a mentor model
const Mentor = mongoose.model('Mentor', mentorSchema);

//Create a student model
const Student = mongoose.model('Student', studentSchema);

//Get mentor and student details
app.get('/',(req,res)=>{
    Mentor.find({},{})
     .then(mentor=>{
         Student.find({},{})
            .then(student=>{
                res.status(200).json({"Mentor":mentor,"Student":student})
                console.log(mentor, student)
          })
     })
})


//Create a mentor
app.post('/mentor', (request, response) => {

    const { name } = request.body
    const mentor = new Mentor({ name });
    mentor.save()
        .then(mentor => {
            if (mentor) {
                response.status(201).json({ message: `Mentor ${name}  created successfully` });
            }
        })
        .catch(err => {
            response.status(404).json({ err: "Failed to create mentor", "Json-request must include": '{"name":"mentor-name"}' })
        })

})

//Create a student
app.post('/student', (request, response) => {

    const { name } = request.body;
    const student = new Student({ name });
    student.save()
        .then(student => {
            if (student) {
                response.status(201).json({ message: `Student ${name}  created successfully` });
            }
        })
        .catch(err => {
            response.status(404).json({ err: "Failed to create student", "Json-request must include": '{"name":"student-name"}' });
        })
})

//Assign student to mentor
app.post('/assign/:mentorId/:studentId', (request, response) => {

    const { mentorId, studentId } = request.params;
    Student.findById(studentId)
        .then(student => {
            if (!student.currentMentor) {
                return Mentor.findById(mentorId)
                    .then(mentor => {
                        if (mentor) {
                            return Student.findByIdAndUpdate(studentId, { currentMentor: mentorId });
                        }
                    })
            } else {
                response.status(404).json({ Message: "Already, Student assigned to mentor" });
            }
        })
        .then(Updatedstudent => {
            if (Updatedstudent) {
                response.status(201).json({ Message: "Student assigned to mentor successfully" });
            }

        })
        .catch(err => {
            response.status(404).json({ Error: "Failed to assign student to mentor- Please check given mentorId and studentId " });
        })
});

//Reassign student to mentor
app.post('/reassign/:mentorId/:studentId', (request, response) => {

    const { mentorId, studentId } = request.params;
    Mentor.findById(mentorId)
        .then(mentor => {
            if (mentor) {
                return Student.findById(studentId)
                    .then(student => {
                        if (student.currentMentor) {
                            if (!student.previousMentor.includes(student.currentMentor)) {
                                let previousmentor = [...student.previousMentor, student.currentMentor];
                                return Student.findByIdAndUpdate(studentId, { currentMentor: mentorId, previousMentor: previousmentor });
                            } else {
                                return Student.findByIdAndUpdate(studentId, { currentMentor: mentorId });
                            }
                        }
                    })
            } else {
                response.status(404).json({ Message: "Mentor not found" })
            }
        })
        .then(updatedstudent => {
            if (updatedstudent) {
                response.status(201).json({ Message: "Mentor reassigned to student successfully" });
            } else {
                response.status(404).json({ Message: "Student not found " });
            }
        })
        .catch(err => {
            response.status(404).json({ Message: "Failed to assign student" });
        });
});

//Get all students for a particular mentor
app.get('/mentor/:mentorId', (request, response) => {

    const { mentorId } = request.params;
    Student.find({ currentMentor: mentorId })
        .populate('currentMentor')
        .then(student => {
            response.status(200).json(student);
        })
        .catch(err => {
            response.status(404).json({ err: "Failed to get students" });
        })
})

//Get the previously assigned mentor for a particular student
app.get('/student/:studentId', (request, response) => {

    const { studentId } = request.params;
    Student.findById(studentId)
        .populate('previousMentor')
        .then((student) => {
            if (!student) {
                return response.status(404).json({ error: 'Student not found' });
            } else {
                response.json(student.previousMentor);
            }
        })
        .catch((err) => {
            response.status(404).json({ err: 'Failed to get student-mentor' });
        });
});



const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

})
