/*

  deploy-studio-flow.js

  Pulls in functions, environment variables, and studio.private.json
  => Updates studio.private.json with service details and
  then deploys the flow
  => Lastly, update environment variables for flow & webhook

*/

// ADD twilio-service-helper
const assets = Runtime.getAssets();

console.log("assets ares ===> ", assets);

const tsh = require(assets['/twilio-service-helper.js'].path);

exports.handler = async function(context, event, callback) {
    
    console.log("in deploy-studio-flow...");

    var fs = require('fs');
   
    // Get the path to the json for the Studio Flow stored in the assets directory
    const studioJsonPath = assets["/studio.json"].path;
    
    console.log("studioJsonPath...", studioJsonPath);

    // Read in the json for the Studio Flow
    let flowDefinition = fs.readFileSync(studioJsonPath, 'utf8');
  
    // The Twilio node Client library 
    const client = context.getTwilioClient();
  
    // Get current environment settingd
    const environment = await tsh.getCurrentEnvironment(client, context.DOMAIN_NAME,);

    // Get the lastest build for this service
    const build = await tsh.getLastBuild(client, environment);
    
    console.log("flowDefinition ==> ", flowDefinition);

    // Function to deploy new Twilio Studio Flow using updated flowDefinition
    function deployStudio() {
      return client.studio.flows
        .create({
          friendlyName: context.STUDIO_FLOW_FRIENDLY_NAME,
          status: 'published',
          definition: flowDefinition,
        })
        .then((flow) => flow)
        .catch((err) => {
          console.log(err.details);
          throw new Error(err.details)
        });
    }

    const flow = await deployStudio(flowDefinition);
    
    console.log('Studio delployed: ' + flow.sid);

    let targetVariable = await tsh.getTargetVariable(client, environment, "STUDIO_FLOW");
    await tsh.updateEnvironmentVariable(client, environment, targetVariable, "STUDIO_FLOW", flow.sid);    
    
    // This will end the function!
    return callback(null, 'Setup successfully ran! ==> ', flow.sid);

}