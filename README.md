By Taylor Krusen  
March, 2022

# Using the HelloSign API with AWS S3

This sample code demonstrates the combined use of the [HelloSign API](https://www.hellosign.com/developers) and the [AWS S3 API](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html) to send a [non-embedded signature request](https://app.hellosign.com/api/signatureRequestWalkthrough) for a file stored in S3 and then save the file back to S3 once it's been signed. The sample uses multiple features for each API which are explained in more detail below. The code comments may also provide additional clarity. 

**Disclaimer:** This sample is an open source project, owned and maintained by HelloSign (a Dropbox company), that was built for education and inspiration only. For any problems with the code or feature requests, please open a GitHub Issue in this repo.

## Localhost vs Production
This sample uses Node.js and is designed to be **executed from your local environment** using an [Express](https://expressjs.com/) server. It's designed to demonstrate the functionality of the combined APIs in an observable, extensible manner.  
The code in this sample _should not_ be considered production or deployment-ready. Please take what you learn from this sample and repurpose it **in the context of your AWS environment** according to the best practices of your chosen tooling. Be sure to follow the official guidance around security as laid out in the (AWS developer documentation)[https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html].

## Tooling and Prerequisite Steps

You'll need the tools below to follow along with the sample. You may also need to complete some prerequisite steps to gain access to some of the tools.

**Amazon Web Services**  
* [AWS account](https://aws.amazon.com/free) -- Create an account if you don't have one. This sample will work with the free tier.
* [S3 Bucket](https://docs.aws.amazon.com/quickstarts/latest/s3backup/step-1-create-bucket.html) -- Create an S3 bucket with BPA and SSE-S3 controls.
* [AWS JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) -- Already listed in _package.json_. Installed with other node modules during setup.  

**HelloSign API**
* [HelloSign account](https://app.hellosign.com/api/pricing) -- Create an account if you don't have one. The free account is fine for this sample(and API calls have `test_mode` turned on).  
* HS API App -- Go to HelloSign's [API Settings page](https://app.hellosign.com/home/myAccount?current_tab=integrations#api) and create an app.
* [HS NodeJS SDK](https://github.com/HelloFax/hellosign-nodejs-sdk) -- Already listed in _package.json_ and gets installed with other node modules during setup.

**Misc Tools**  
* [Ngrok](https://ngrok.com/download) -- Download the free version to run locally for this sample. Ngrok is an http tunneling that exposes your local environment so webhook payloads can be sent to your localhost server.  
* [Express](https://expressjs.com/) -- Lightweight Node.js web server powering this sample. Installed with node modules.
* [Multer](https://github.com/expressjs/multer) -- Middleware for the express server to help consume HelloSign webhooks that are sent as multipart/form-data. Installed with node modules.

## Setup
1. Configure your [AWS credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) to use v3 of the [AWS JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html).
2. Add your HelloSign credentials to the `.env-example` file. **Note:** We recommend using something more secure in a production, such as environment variables in your AWS environment.
3. Add a PDF file to the /files-to-sign folder*. This is the document you'll be signing in this example flow. (Feel free to use the "fake-rental-agreement.pdf" included in this repo).
4. Run `npm install` to download libraries used in this demo.
5. Create a new S3 bucket with BPA and SSE-S3 controls, then copy the name into the _.env-example_ file.
6. Update the `REGION` in /libs/s3Client.js to match the region of your S3 bucket.
7. Update the `signerName` and `signerEmail` fields in _.env-example_ with your own information. This is used for the signature request sent by HelloSign.
8. *Important*: Once filled out, **rename `.env-example` to `.env`**.

* The local pdf file is just an example. In production, the documents used for eSignature flows can come from anywhere! They might be scanned, built with a text editor, or generated by a third party tool used for something like sales, legal, or property management. 

## Flow of code
At a high level, there are three main pieces working together in this sample:
* An [Express](https://expressjs.com/) running locally that processes [event payloads from HelloSign](https://app.hellosign.com/api/eventsAndCallbacksWalkthrough) and responds to events throughout the signing flow. 
* [Ngrok](https://ngrok.com/download) running in a shell script so the webhook events can make it to the express server running on your localhost.
* The [index.js](https://github.com/hellosign-samples/aws-s3-and-hellosign/blob/main/index.js) file that initates the sample flow.

Our code is stepping through the following series of actions:
1. Uploading local file to an S3 bucket
2. Grabbing a presigned url for the file in S3 (only valid for 30 seconds)
3. Using the HelloSign API to send a signature request
4. Consuming a callback (webhook) event payload from HelloSign once signing completes
5. Using data from the event payload to download the signed document locally to "/signed-files"
6. Uploading the signed document to S3 bucket  

Once the sample finishes running, you'll have copy of the signed file stored in your S3 bucket as well as your HelloSign account. 

## Running this sample
Make sure you've completed the require tooling and prerequisites steps before running this sample.

1. Clone this repo to your local environment.
2. From a shell environment (Terminal for me, as a Mac user) in the root folder of this repo, run `node server` to start the express server. You'll see a log indicating the server is running. 
3. From a second shell environment, run `ngrok http 3000` (port must match `PORT` in the server.js file). This creates a public url to your localhost which is used for webhooks.
4. Copy the forwarded https url from ngrok.
5. In the HelloSign [API Settings page](https://app.hellosign.com/home/myAccount?current_tab=integrations#api), open the settings for the API App you created earlier. Paste the copied ngrok url into the "Event callback" field and append the **/hellosign-events** POST route defined in _server.js_. (My callback url looks like this: `https://a0a5-50-47-128-110.ngrok.io/**hellosign-events**`)  
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
