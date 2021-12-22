const multer = require('multer');
let Rutatemp = "./resources/static/assets/uploads";
const excelFilter = (req, file, cb) => {
    if (
        file.mimetype.includes("excel") ||
        file.mimetype.includes("spreadsheetml")
    ) {
        cb(null, true);
        console.log("filtro OK")

    } else {
        cb("Please upload only excel file.", false);
        console.log("filtro malo")

    }
};

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, Rutatemp);
    },
    filename: (req, file, cb) => {
        console.log(file.originalname);
        cb(null, `${Date.now()}-${file.originalname}`);
    },

});

let uploadFile = multer({ storage: storage, fileFilter: excelFilter });



module.exports = uploadFile;