# Outgoing Voice Call FROM Number Selection for Studio Flows using Twilio Functions 
 
---

## Overview

For voice solutions within a single country, selecting the "From" number to use is simple because there is typically just one phone number. However, many voice solutions need to make calls across the globe, and the optimal customer experience for these outgoing calls is to provide localized "From" numbers.  For globalized voice solutions making outgoing calls, we recommend that customers implement a process for selecting FROM numbers based on the specific TO number for each call.

While you could certainly build a solution internally to select FROM numbers before making API calls to Twilio to initiate outgoing calls, this blog posts outlines a solution that uses Twilio Functions to handle FROM number selection on-the-fly. This solution also uses Twilio LookUp to determine the country code for each TO number and also validate the TO number format before initiating the outgoing call.

FROM number selection is relevant to any solution that needs to initiate outgoing calls. This blog will walk you through building a voice 2FA solution that can receive API requests, select the best FROM number for the TO number, and then initiate Studio Flows to deliver the 2FA codes via voice.

Let's take a quick look at the solution.

<img width="717" alt="Solution Overview" src="https://user-images.githubusercontent.com/78064764/147796364-fe51c3a9-c8b1-4819-8d47-a37c77ed256e.png">

* An POST call to a Twilio Function starts things off
* The Twilio Function calls LookUp API to validate the number formatting and get details on the phone number
* Based on the details returned from the LookUp API, the Function selects the best FROM number to use for the outgoing call
* The Function creates a Studio Flow "Execution" which makes the outgoing call and delivers the 2FA code

### Let's build it!

## Setup Instructions

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

The ```twilio serverless:deploy``` command will build a service in your Twilio account and upload some assets. The output of the command will look like this:

<img width="705" alt="twilio serverless:deploy output" src="https://user-images.githubusercontent.com/78064764/147796672-d3939ba3-b2bd-486e-abce-214cf9db5ad5.png">

Copy down the ```Domain``` and the full url for the Asset that ends with "/create-studio-flow.html". Both are marked with a red arrow in the image above.

Paste the url that ends with "/create-studio-flow.html" and was copied in the step above, into a web browser. That will bring up a simple SPA that will create a studio flow for you. The SPA will look like this:

![Screen Shot 2021-12-30 at 4 53 10 PM](https://user-images.githubusercontent.com/78064764/147796981-22fd2635-2ee3-48a3-9ff6-75ea0a3865a0.png)

* Enter a name for the **STUDIO_FLOW_FRIENDLY_NAME**. For example, "Voice 2FA Demo Flow". Click the **Update** button to save the changes.
* Click on the **Deploy Flow** button to deploy the Studio Flow.
* Copy value in the **STUDIO_FLOW** variable once it populates.

**A quick side note on what you just did...**  When you clicked **Update** you saved an environment variable to the Twilio Functions Service you just deployed. When you clicked on **Deploy Flow**, you called a Function that opened up a json file that contained the description of the Studio Flow, and then created the flow in your Twilio Account. All of these Functions and assets are in this repo for you to check out but they are secondary to the purpose of this blog. The result is getting a Studio Flow deployed quickly to your account!

You can go to your Twilio Console and go to **Studio** and you will see a new flow titled "Voice 2FA Demo Flow" (or whatever you entered for that variable). You can click into that flow to see how you could build a Studio Flow to deliver a 2FA code via voice. In Studio, the flow looks like this:

![Studio Flow](https://user-images.githubusercontent.com/78064764/147797582-fd432909-cdc8-4f52-b57f-b88dd80802c5.png)

Now lets look at the Twilio Function that handles incoming requests to deliver voice 2FA codes. Again, the goal of this Twilio Function is to select the best FROM number and then kick off a Studio Flow Execution to deliver the code in a phone call. Here is a flow diagram:

<img width="546" alt="Function Process Flow" src="https://user-images.githubusercontent.com/78064764/147796368-9ded2d98-4eba-4676-ac9a-644bafcfc386.png">

* The POST request will contain the "TO" number to call and the code.
* The Function will first pass the TO number to Twilio's LookUp API to validate that the number is formatted correctly and to return the country code for the number. **(Line 132 of initiate-outgoing-call.js)**
* The function will then first check it the country code matches a number from the pool **(Line 73 of initiate-outgoing-call.js)**, and then fallback to a regional number, and then ultimately a default number. **(Line 112 of initiate-outgoing-call.js)**
* Lastly, the function will initiate the Studio Flow Execution with the selected FROM number. **(Line 157 of initiate-outgoing-call.js)**

### Final Steps

Let's update the .env file with a default phone and the STUDIO_FLOW we created above. 

From your favorite text editor, open the .env file and enter one of your two phone numbers as the DEFAULT_FROM_NUMBER. Next enter the value for STUDIO_FLOW that you generated when your deployed the flow (you already created this environment variable, but adding it to your .env file will keep it from being overwritten when you deploy changes). Save the file.

Now, run ```twilio serverless:deploy``` again to deploy the changes. This time we only made changes to the .env file, but this is the same process to push changes to your functions and other assets to your Twilio Service.

With those changes in place, you can now try it out...

Edit this curl command:

curl -L -X POST 'http://YOUR-TWILIO-DOMAIN/initiate-outgoing-call' \
-H 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'to=YOUR-E.164-PHONE-NUMBER' \
--data-urlencode 'message=Hello, this is a demonstration verification service!' \
--data-urlencode 'code=513567'

* Replace YOUR-TWILIO-DOMAIN with the Domain your noted when deploying the service
* Replace YOUR-E.164-PHONE-NUMBER with your phone number (formatted to E.164)
* Run the command!

If everything is set up correctly, you should get a phone call from your default phone number to deliver to the code you passed in.

### Great, how do I specify which number to use?

The function titled initiate-outgoing-call.js has a helper function called getFromNumber(). This helper function will serve as your pool of numbers. The pool of numbers are divided into two objects:

* countryNumberPool => key is the country code, value is the number to use for that country
* regionalNumberPool => key is the first two chars of the to number (+1, +2, +3, ...), value is the number to use for that region.

To manage your pool of numbers, you just need to maintain the properties in those two objects. FROM number selection will first try to match for the country code, then fallback to a regional number, and finally your default phone number.

You can manage this code in your source code repository, and use ```twilio serverless:deploy``` to update your service whenever you add/edit numbers.

#### Let's Try it out!

The first time we ran the curl command, we only had the default number set so the FROM number selection fell back all the way to that number.

Now, let's use our second phone number... Uncomment line 65 of initiate-outgoing-call.js, and enter the two letter country code for the TO number you are using (in my case it was "US" since I am in the United States). Enter the second phone number you provisioned for the value. Run ```twilio serverless:deploy``` to update your Twilio Service with the changes.

Now, run the same curl command as before, but note that the FROM number should be the one assigned to your country code!


## Excellent! You have deployed a Twilio Serverless solution that validates TO numbers using Twilio LookUp, can handle FROM number selection, and can initiate outgoing voice calls using Twilio Studio!


### Further Expansion

This demonstration works for countries and regions. You could certainly get more granular by parsing the TO number beyond the first two characters (area codes) to localize FROM number selection even further.

Also important to mention that Twilio has a terrific service called Verify, which handles delivering user verification on voice as well as many other channels [Twilio Verify](https://www.twilio.com/verify). If you need to implement or upgrade your 2FA solution, check out Verify!

### IMPORTANT!

The code in this blog is not ready for production use! For starters, you would need to secure the Twilio endpoints. Here are some ways you could do that:  [Basic Auth](https://www.twilio.com/docs/runtime/quickstart/basic-auth), [JWT](https://www.twilio.com/docs/runtime/quickstart/json-web-token).

### Supporting Assets/ Documentation/ Links

For additional information on products used, please see the Twilio docs:

[Twilio Functions](https://www.twilio.com/docs/runtime)

[Twilio Studio](https://www.twilio.com/docs/studio)

[Twilio LookUp](https://www.twilio.com/docs/lookup)

[Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit/developing)

[CLI](https://www.twilio.com/docs/twilio-cli/quickstart)

[Twilio Verify](https://www.twilio.com/verify)
