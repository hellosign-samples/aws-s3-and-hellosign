By Taylor Krusen  
March, 2022

# Using the HelloSign API with AWS S3

This sample code demonstrates the combined use of the [HelloSign API](https://www.hellosign.com/developers) and the [AWS S3 API](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html) to send a [non-embedded signature request](https://app.hellosign.com/api/signatureRequestWalkthrough) from a file stored in S3. The server processes [events from HelloSign](https://app.hellosign.com/api/eventsAndCallbacksWalkthrough) throughout the signing flow. Once the document has been signed, it's downloaded from HelloSign and uploaded back into S3. 

This sample uses the [HelloSign NodeJS SDK](https://github.com/HelloFax/hellosign-nodejs-sdk) and the [AWS JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html).

*Note:* This sample is for educational purposes. Use the parts that are helpful and toss the rest. You'll probably need to modify the overall flow to fit your specific need around eSignature.

## Prerequesites
* An [AWS account](aws.amazon.com/free) with an S3 bucket
* A [HelloSign account](https://app.hellosign.com/api/pricing) with an API app created
Note: you can create a free account from the [API pricing](https://app.hellosign.com/api/pricing) page.
* Have [ngrok](https://ngrok.com/product) installed on your machine. This sample uses webhooks and ngrok is needed to send the payloads to your localhost environment.

## Setup
1. Configure your [AWS credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) to use v3 of the [AWS JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html).
2. Add your HelloSign credentials to the `.env-example` file. **Note:** We recommend using something more secure in a production, such as environment variables in your AWS environment.
3. Add a PDF file to the /files-to-sign folder. This is the document you'll be signing in this example flow. (Feel free to use the "fake-rental-agreement.pdf" included in this repo).
4. Run `npm install` to download libraries used in this demo.
5. Create a new S3 bucket and copy the name into the _.env-example_ file.
6. Update the `REGION` in /libs/s3Client.js to match the region of your S3 bucket.
7. Update the `signerName` and `signerEmail` fields in _.env-example_ with your own information. This is used for the signature request sent by HelloSign.
8. *Important*: Once filled out, rename `.env-example` to `.env`.

## Flow of code
Our code is stepping through the following series of actions:
1. Uploading local file to an S3 bucket
2. Grabbing a presigned url for the file in S3
3. Using the HelloSign API to send a signature request
4. Consuming a callback (webhook) event payload from HelloSign once signing completes
5. Using data from the event payload to download the signed document locally to "/signed-files"
6. Uploading the signed document to S3 bucket

## Running this sample
Make sure you've completed the prerequisite steps before running this. Work through any errors you encounter (likely due to missing credentials or `userVars`).

1. Clone this repo to your local environment.
2. From a shell environment (Terminal for me, as a Mac user) in the root folder of this repo, run `node server` to start the express server. You'll see a log indicating the server is running. 
3. From a second shell environment, run `ngrok http 3000` (port must match `PORT` in the server.js file). This creates a public url to your localhost which is used for webhooks.
4. Copy the forwarded https url from ngrok.
5. In the HelloSign [API Settings page](https://app.hellosign.com/home/myAccount?current_tab=integrations#api), open the settings for the API App you created earlier. Paste the copied ngrok url into the "Event callback" field and append the /hellosign-events POST route defined in _server.js_. (My callback url looks like this: `https://a0a5-50-47-128-110.ngrok.io/hellosign-events`)  
*Note*: this should be the same API app you set with `HS_CLIENT_ID` in your `.env` file.
6. On the API Settings page, click the "test" button to verify your webhook handler is working. You should see a success message that your server received the test event.
7. From a third shell environment, run `node index` to initiate your signature flow. The first three steps (upload to S3, get presigned url, send signature request) will happen in order and log to your console. You can switch back to the express server to watch webhooks come through (i.e. `signature_request_sent`) once the signature flow has started.
8. Go to the email address you sent the signature request and complete the entire signing flow. Keep an eye on the terminal where your express server is running to watch the HelloSign events coming through during the process.
9. Once signing is completed, an event payload (`signature_request_all_signed`) from HelloSign will be sent to your server and trigger the final steps: downloading the signed file from HelloSign and uploading it to your S3 bucket.
10. Inspect the results by looking at the local files, files in s3, and terminal. You can download and open the file from S3 to verify it is the signed version. The console logs can also help you better understand the overall flow.
11. Give yourself a well-deserved pat on the back. You did it! 

## Note from author
This demo uses a basic example of the signature flows possible with HelloSign. Some additional ideas of how you could use the HelloSign API with AWS:
* Enhance this sample: modify /signature_request/send to use `form_fields_per_document` and place your signer fields directly on the pdf (rather than using the appended signing page this flow defaults to).
* Use the `metadata` parameter on a signature request to store a unique string that can used to apply custom logic to your document approval workflow.
* Create a template in HelloSign and prefill information about your signers using data from your AWS environment (such as Dynamo or RDS).
* Create an [embedded signing flow](https://app.hellosign.com/api/embeddedSigningWalkthrough) for a document stored in S3 and embed the signing experience directly in your app.
* Pull a file from S3 to use for [embedded requesting](https://app.hellosign.com/api/embeddedRequestingWalkthrough) and give your users the ability to create a signature request directly in your app. 

## License
Apache 2.0
