import multer from 'multer'

export default function upload(type) {
    const fileFormat = (type === 'img') ? '.jpg' : '.mp3';
    const folder = (type === 'img') ? './image/teacher' : './audio/teacher';

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, folder);
        },
        filename: function (req, file, cb) {
            cb(null, req.params.id + fileFormat);
        }
    });

    const upload = multer({ storage: storage }).single('image');

    return upload
}