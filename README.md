# Outgoing Call FROM Number Selection for Studio Flows using Twilio Functions 
 
---

## Overview

Twilio Messaging offers Messaging Services which, among many awesome features, provides a Sender Pool with automatic "From" number selection. This allows our customers to just provide a pool of numbers and allow Twilio to select the best number for each specific SMS recipient. 

Messaging Services do not work with Programmable Voice, so Twilio users need to specify a FROM number when making voice calls. However, using Twilio Functions (and Twilio LookUp API!), it is certainly possible to implement logic for FROM number selection before initiating outgoing calls.

This blog will walk you through building a voice 2FA solution that can receives API request, selects the best FROM number and then initiates a Studio Flow to deliver the 2FA code via voice.

Let's take a quick look at the solution.

image

* An POST call to a Twilio Function starts things off
* The Twilio Function calls LookUp API to validate the number formatting and get details on the phone number
* Based on the details returned from the LookUp API, the Function selects the best FROM number to use for the outgoing call
* The Function creates a Studio Flow "Execution" which make the outgoing call and delivers the 2FA code

Let's build it!

### Setup Instructions

**Prerequisites**
* A Twilio Account - [Sign up](https://www.twilio.com/try-twilio)
* Twilio CLI - [CLI Quickstart](https://www.twilio.com/docs/twilio-cli/quickstart)
* Twilio Serverless Plugin - [Install](https://www.twilio.com/docs/labs/serverless-toolkit/getting-started)
* Two Twilio Numbers with VOICE capability - [Purchase a number](https://support.twilio.com/hc/en-us/articles/223135247-How-to-Search-for-and-Buy-a-Twilio-Phone-Number-from-Console)

**Initial Setup**

* Purchase two Twilio Phone Numbers
* Clone this repo
* From the repo directory, rename sample.env to .env
* From the repo directory, enter ```twilio serverless:deploy``` (you may need to ```twilio login``` first!)

The ```twilio serverless:deploy``` command will build a service in your Twilio account and upload some assests. Copy down the ```Domain``` and the full url for the Asset that ends with "/create-studio-flow.html"

Paste the url into a web browser. That will bring up a simple SPA that will create a studio flow for you. 

* Enter a name for the **STUDIO_FLOW_FRIENDLY_NAME**. For example, "Voice 2FA Demo Flow". Click the **Update** button to save the changes.
* Click on the **Deploy Flow** button to deploy the Studio Flow.
* Copy value in the the **STUDIO_FLOW** variable once it populates.

**A quick side note on what you just did...**  When you clicked **Update** you saved an Environment Variable the Twilio Functions Service you just deployed. When you clicked on **Deploy Flow**, you called a Function that opened up a json file that contained the description of the Studio Flow, and then created the flow in your Twilio Account. All of these Functions and assets are in this repo for you to check out, but the result was getting a flow deployed quickly to your account!

You can go to your Twilio Console and go to **Studio** and you will see a new flow title "Voice 2FA Demo Flow" (or whatever you entered for that variable). You can click into that flow to see how you could build a Studio Flow to deliver a 2FA code via voice. 

Now lets look at the Twilio Function that handles incoming requests to delivery voice 2FA codes. Again, the goal of this Twilio Function is to select the best FROM number and the kick off a Studio Flow Execution to deliver the code in a phone call. Here is a flow diagram:

image

* The POST request will contain the number to call "TO" and the code.
* The Function will first pass the TO number Twilio's LookUp API to validate that the number is formatted correctly and to return the country code for the number.
* The function will then first match on a phone number assigned to the country code, and then fallback to a regional number, and then ultimately a default number.
* Lastly, the function will initiate the Studio Flow Execution.

**Final Steps**

Let's update the .env file with a default phone and the STUDIO_FLOW we created above. 

From your favorite text editor, open the .env file and enter one of your two phone numbers as the DEFAULT_FROM_NUMBER. Next enter STUDIO_FLOW that you generated when your deployed the flow (you already created this environment variable, but adding it to your .env file will keep it from being overwritten when you deploy changes). Save the file.

Now, run ```twilio serverless:deploy``` again to deploy the changes. This time we only made changes to the .env file, but this is the same process to make changes to your functions and other assets.

With those changes in place, you can now try it out...

Edit this curl command:

curl -L -X POST 'http://YOUR-TWILIO-DOMAIN/initiate-outgoing-call' \
-H 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'to=YOUR-E.164-PHONE-NUMBER' \
--data-urlencode 'message=Hello, this is a demonstration verification service!' \
--data-urlencode 'code=513567'

* Replace YOUR-TWILIO-DOMAIN with the Domain your noted when delploying the service
* Replace YOUR-E.164-PHONE-NUMBER with your phone number (formatted to E.164)
* Run the command!

If everything is set up correctly, you should get a phone call from your default phone number to deliver to code you passed in.

**Great, how do I specify with From number to use?**

The function title initiate-outgoing-call.js has a helper function called getFromNumber(). This helper function will serve as your pool of numbers. The pool of numbers are divided into two objects:

* countryNumberPool => key is the country code, value is the number to use for that country
* regionalNumberPool => key is the first two chars of the to number (+1, +2, +3, ...), value is the number to use for that region.

To manage your pool of number, you just need to maintain the properties in those two objects. FROM number selection will first try to match for the country code, then fallback to a regional number, and finally your default phone number.

**Let's Try it out!**

The first time we ran the curl command, we only had the default number set so the FROM number selection fell back all the way to that number.

Now, let's use our second phone number... Uncomment line 65 of initiate-outgoing-call.js, and enter the two letter country code for the TO number you are using. Enter the second phone number you provisioned for the value. Run ```twilio serverless:deploy``` to update your Twilio Service with the changes.

Now, run the same curl command as before, but note that the FROM number should be the one assigned to your country code!

**Further Expansion**

This demonstration works for countries and regions. You could certainly expand this function to further by parsing the TO number further (area codes) to localize FROM number selection evern further.

**IMPORTANT!**

This blog is not ready for production use! For starters, you would need to secure the Twilio endpoints. Here are some ways you could do that:  [Basic Auth](https://www.twilio.com/docs/runtime/quickstart/basic-auth),[JWT](https://www.twilio.com/docs/runtime/quickstart/json-web-token).


### Supporting Assets/ Documentation/ Links

For additional information on products used, please see the Twilio docs:

[Twilio Functions](https://www.twilio.com/docs/runtime)

[Twilio Studio](https://www.twilio.com/docs/studio)

[Twilio LookUp](https://www.twilio.com/docs/lookup)

[Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit/developing)

[CLI](https://www.twilio.com/docs/twilio-cli/quickstart)