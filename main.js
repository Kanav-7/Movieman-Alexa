
var http = require('http');

exports.handler = function (event, context) {
    try {
        //console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

// session starts
function onSessionStarted(sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId);
}

// when not specified what to do
function onLaunch(launchRequest, session, callback) {
    // console.log("onLaunch requestId=" + launchRequest.requestId);

    // skill launch
    getWelcomeResponse(callback);
}

// user specifies intent
function onIntent(intentRequest, session, callback) {
    // console.log("onIntent requestId=" + intentRequest.requestId);
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // skill's intent handlers
    if ("MovieIntent" === intentName) {
        getSyn(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

// user ends session
function onSessionEnded(sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId);
}

// skill's behaviour

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Movieman " +
        "I can tell you everything about any movie,tell me a movie name you want to know about";
    var repromptText = "You can get help by saying help and stop by saying stop and cancel by saying cancel.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "To use Movieman tell me a valid movie name";
    var repromptText = "Go ahead and tell me a valid movie name.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using Movieman. Do visit us again. Thanks!";
    var shouldEndSession = true;//exiting the skill

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function makeTheoRequest(word, theoResponseCallback) {

   if (word === undefined || word === ' ' || encodeURIComponent(word) === "undefined") {
     theoResponseCallback(new Error('undefined'));
   }
  // api here

  var query_url ='http://www.omdbapi.com/?t=' + encodeURIComponent(word) + '&apikey=d6cac471';
  var body = '';
  var jsonObject;

  http.get(query_url, (res) => {
    if (res.statusCode==200) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', () => {
          jsonObject = JSON.parse(body);

           theoResponseCallback(null, body);

        });
    }
    else if (res.statusCode==303) {
        query_url ='http://www.omdbapi.com/?t=' + encodeURIComponent(word) + '&apikey=d6cac471';
        http.get(query_url, (res2) => {
            res2.setEncoding('utf8');
            res2.on('data', function (chunk) {
              body += chunk;
            });
            res2.on('end', () => {
              jsonObject = JSON.parse(body);
               theoResponseCallback(null, body);
            });
        });
    }
   
    else {
      theoResponseCallback(new Error(res.statusCode));
    }
  }).on('error', (e) => {
     theoResponseCallback(new Error(e.message));
  });
}

function getSyn(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var maxLength = 0;

    makeTheoRequest( intent.slots.movie.value, function theoResponseCallback(err, theoResponseBody) {
        var speechOutput;

        if (err) 
        {
            if (err=='undefined'){
                 speechOutput = "Sorry, movie name can't be identified. Please speak again with valid movie name";
            }
            else {
                speechOutput = "Sorry, this service is experiencing a problem with your request. Please check whether movie name provided is valid";
            }
        }

         else 
         {

            var theoResponse = JSON.parse(theoResponseBody);
            
            if(theoResponse.hasOwnProperty('Error'))
                speechOutput = theoResponse.Error;
            else
            {
  
                if(theoResponse.Released == "N/A" && theoResponse.Director == "N/A" && theoResponse.Genre == "N/A" && theoResponse.Actors == "N/A" && theoResponse.imdbRating == "N/A" && theoResponse.Ratings[1].Value == "N/A" && theoResponse.Metascore == "N/A" && theoResponse.Language == "N/A" && theoResponse.Plot == "N/A")
                    speechOutput = "Details about this movie is not available."
                else    
                { 
                    speechOutput = 'Here is what I found: Name of movie is ' + intent.slots.movie.value;
                    if(theoResponse.Released!= undefined && theoResponse.Released!= "N/A" )
                        speechOutput+= '.\n It has release date of ' +  theoResponse.Released;     
                    if(theoResponse.Director!= undefined && theoResponse.Director != "N/A" )
                        speechOutput+= '.\n It is directed by ' +  theoResponse.Director;
                    if(theoResponse.Genre!= undefined && theoResponse.Genre != "N/A" )
                        speechOutput+= '.\n it\'s genre includes ' + theoResponse.Genre;
                    if(theoResponse.Actors!= undefined && theoResponse.Actors != "N/A" )
                        speechOutput+= '.\n Actors Include ' + theoResponse.Actors;
                    if(theoResponse.imdbRating!= undefined && theoResponse.imdbRating != "N/A" )
                        speechOutput+= '.\n IMDB rating of movie is ' + theoResponse.imdbRating;
                    if(theoResponse.Ratings[1]!= undefined && theoResponse.Ratings[1].Value != "N/A" )
                        speechOutput+= '.\n Rotten Tomatoes rating is ' + theoResponse.Ratings[1].Value;
                    if(theoResponse.Metascore!= undefined && theoResponse.Metascore != "N/A" )
                        speechOutput+= '.\n It\'s Metascore is ' + theoResponse.Metascore;
                    if(theoResponse.Language!= undefined && theoResponse.Language != "N/A" )
                        speechOutput+= '.\n Language of movie is ' + theoResponse.Language;
                    if(theoResponse.Plot!= undefined && theoResponse.Plot != "N/A" )
                        speechOutput+= '.\n Plot of movie is, ' + theoResponse.Plot;
                }
            }
         }

        callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });

}


//Helper functions

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Movieman",
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
