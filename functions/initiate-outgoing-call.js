/*
  
  initiate-outgoing-call.js

  This Twilio Function initiates a Twilio Studio Execution
  that makes and outgoing voice call after selecting the best 
  FROM number to use from a "pool" of active numbers from the
  Twilio Account.

  This Function first makes a call to Twilio LookUp API to make
  sure that the TO number is properly formatted AND to pull the
  country code associated to the number.

  The Phone Number details returned from the LookUp API are passed
  to a function to select the best FROM number to use to make the
  outgoing call (either a number that matches the country code or 
  a regional number).

  The FROM number is then included in the call to create a Studio
  execution. 

  SAMPLE CURL COMMAND TO CALL THIS FUNCTION

  curl -L -X POST 'http://YOUR-TWILIO-DOMAIN/initiate-outgoing-call' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'to=+YOUR-E.164-PHONE-NUMBER' \
  --data-urlencode 'message=Hello, this is a demonstration verification service!' \
  --data-urlencode 'code=513567'
  
  MESSAGE ABOUT SECURITY!
  
  This demonstration sets the Twilio Function security to "public" which means that it
  is accessible via a public URL. For any use beyond exploration, use authentication
  to secure the function enpoint. Here are some examples:
  
  https://www.twilio.com/docs/runtime/quickstart/basic-auth
  https://www.twilio.com/docs/runtime/quickstart/json-web-token

*/


/**  
  * getFromNumber
  * This function serves to manage a Pool of your Twilio Numbers
  * that can be used to make outgoing phone calls. An object from
  * LookUp API is passed in, and the countryCode is first
  * checked. A number matching the country code, if present,
  * is returned. If there is no matching number, the function
  * procedes to select a regional number and ultimately a
  * default number. 
  * @param object $numberDetails - returned from LookUp API
  * @return FROM phone number to use in request
*/
function getFromNumber(numberDetails, context) {

  // Object literal containing country
  // properties and corresponding phone
  // number to use. Add key/value pairs
  // here from active numbers in your 
  // Twilio Account
  const countryNumberPool = {
    
    // ENTER 2 LETTER COUNTRY AND MATCHING NUMBER

    //'US': '+1xxxxxxx', 
    //'UK': '+4xxxxxxx',    
    //'AU': '+3xxxxxxx',    
    //'CO': '+4xxxxxxx'   

  };

  // If a matching country/number is found, return
  if(countryNumberPool[numberDetails.countryCode] !== undefined) {
    
    console.log("Found a country number to use...");

    return countryNumberPool[numberDetails.countryCode];

  // Else, find a regional number...
  } else {

    // Take the first two chars of the TO number
    let numberPrefix = numberDetails.phoneNumber.substring(0,2);

    // Object literal containing regional
    // properties and corresponding phone
    // number to use. Add key/value pairs
    // here from active numbers in your 
    // Twilio Account    
    const regionalNumberPool = {
      
      // ENTER NUMBER FOR EACH REGION PLUS DEFAULT NUMBER

      //'+1': '+1xxxxxxx', 
      //'+2': '+2xxxxxxx',    
      //'+3': '+3xxxxxxx',    
      //'+4': '+4xxxxxxx',
      //'+5': '+5xxxxxxx',
      //'+6': '+6xxxxxxx',
      //'+7': '+7xxxxxxx',
      //'+8': '+8xxxxxxx',
      //'+9': '+9xxxxxxx',

      // DEFAULT number is stored in an environment variable
      'default': context.DEFAULT_FROM_NUMBER

    };

    console.log("Using a regional number...");

    // Select matching regional number of default number
    let n = regionalNumberPool[numberPrefix] ? regionalNumberPool[numberPrefix] : regionalNumberPool['default'];  
    
    return n;

  }

}

exports.handler = async function(context, event, callback) {
  
  console.log("event is ==> ", event);
  
  const client = context.getTwilioClient();

  let numberDetails = {}; // Empty object to be filled by LookUp API

  // Use LookUp API to get the basic details for
  // the phone number. Fail on poorly formatted numbers
  try {

    numberDetails = await client.lookups.v1.phoneNumbers(event.to).fetch();

    console.log("numberDetails is ==> ", numberDetails);

  } catch (err) {

    console.log("Error trying to get number details for TO number. Error ==> ", err);  
    
    callback(err, "Error trying to access LookUp API");

  }

  // Pass the object returned from LookUp API to the getFromNumber
  // function to get the best FROM number to use
  let from = getFromNumber(numberDetails, context);

  console.log("from # is ==> ", from);
  
  // Set variables to use for this Studio Exection
  // (Split and Join on event.code used to add pauses when
  // code is read out)
  let message = event.message ? event.message : "Hi, this the default vefication welcome message.";
  let code = event.code ? event.code.toString().split('').join('. ') : "No code passed";

  // Create the Studio execution
  client.studio.flows(context.STUDIO_FLOW)
    .executions
    .create({
        to: event.to, 
        from: from,
        parameters: {
          message: message,
          code: code
        }})
     .then(function(execution) {
       console.log("Execution Id:" + execution.sid);
       callback(null, "Initiated Studio Flow: " + execution.sid);
     });

};