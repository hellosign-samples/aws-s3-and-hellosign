// Please refer to the README file and follow setup instructions before running demo
// IMPORTANT: remember to add your own info to .env.example and rename to .env

//** Imports **/

// Custom helper functions for HelloSign API
import * as hsHelper from './libs/hellosign-helpers.js';
// Custom helper functions for AWS API
import * as awsHelper from './libs/aws-helpers.js';

// Runs server in nodejs
import express from 'express';
// Used for processing the multipart event payloads sent by HelloSign
import multer from 'multer';
// Configuring express app
const app = express();
const upload = multer();
const PORT = 3000;

//** Routes **/

// Route to process hellosign callbacks
app.post('/hellosign-events', upload.array(), (req, res) => {
    // Grabs payload body and makes it easier to use
    const data = JSON.parse(req.body.json);
    const event = data.event;
    // Verify the event_event hash for security
    const isSafeEvent = hsHelper.verifyEventHash(event);
    // Bail out of unsafe payloads before they're processed
    if (!isSafeEvent) {
        console.log("Unsafe event. Can't verify source of data.");
        return res.status(401).end("Event hash doesn't match");
    }
    // Gives visbility into which events are firing throughout signing flow
    console.log('Received HelloSign event: ' + event.event_type);
    // Listen for event that indicates the file is fully signed
    if (event.event_type === "signature_request_all_signed") {
        // Grabs information from signature request in event payload
        const signedFileInfo = {
            signatureRequestId: data.signature_request.signature_request_id,
            fileName: data.signature_request.metadata.file_name,
            s3BucketName: data.signature_request.metadata.s3_bucket
        }
        // Pass signed file info to the moveSigned function
        setImmediate(moveSignedFileToS3, signedFileInfo);
    }
    // HelloSign expects this response to event payloads
    res.set('Content-Type', 'text/plain');
    res.status(200).send('Hello API Event Received');
});

// Helper function that moves signed file from HelloSign to s3
const moveSignedFileToS3 = async (signedFileInfo) => {
    const { signatureRequestId, fileName, s3BucketName } = signedFileInfo;
    try {
        // Downloads the signed file locally
        const signedFilePath = await hsHelper.downloadSignedFile(signatureRequestId, fileName);
        // Uploads signed file to s3
        await awsHelper.uploadFileToS3(signedFilePath, s3BucketName);
        console.log("_.~^~._.~^~._.~^~._.~^~._.~^~._.~^~._");
        console.log("Demo signature flow completed! Cheers.");
        console.log("^~._.~^~._.~^~._.~^~._.~^~._.~^~._.~^");
    } catch (err) {
        console.log('Something failed trying to move the signed file from HelloSign to s3:', err );
    }
};

// Start Express server (don't forget ngrok!)
app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));

