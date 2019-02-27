    //
//  main.js
//  Coin Flip Plugin
//
//  Created by Grahame Wright, Baptiewright Designs
//  March 2019

let websocket = null;
let pluginUUID = null;
let globalSettingsCache = {};
let settingsCache = {};
let coinstate = 0;
let spinning = "";
const coinflipAction = {

    type : "com.baptiewright.coinflip.action",

    onKeyUp : function(context, settings, coordinates, state) {
        stopStart(context,settings);
    },

    onWillAppear : function(context, settings, coordinates) {
        //settingsCache[context] = settings;
    },

    SetTitle : function(context,jsonPayload) {
        let payload = {};
        payload.title = jsonPayload['title'];
        payload.target = "DestinationEnum.HARDWARE_AND_SOFTWARE";
        const json = {
            "event": "setTitle",
            "context": context,
            "payload": payload,
        };
        websocket.send(JSON.stringify(json));
    }

};

function stopStart(context,settings) {
    var coinstate = settings['coinstate'];
    if (!coinstate){
        coinstate = 0;
    }
    var result = 0;
    var thisTimer = null;
    if (coinstate == 0 || coinstate == 1){
        console.log("Flip It!");
        coinstate = 2;
        settings['coinstate'] = 2;
        updateSettings(context,settings);
        setState(context,0);
        setTitle(context,"Flipping!");
        thisTimer = setInterval(function (sx) {
            console.log("Caught It!");
            result = Math.random() >= 0.5;
            coinstate = 0;
            if (result){
                coinstate = 1;
            }
            headsOrTails(context,settings,coinstate);
            clearInterval(thisTimer);
    }, 1500);
    }
    else {
        console.log("Cancel It!");
        result = Math.random() >= 0.5;
        coinstate = 0;
        if (result){
            coinstate = 1;
        }
        headsOrTails(context,settings,coinstate);
    }
}

function headsOrTails(context,settings,coinstate)
{
    setState(context,1);
    settings['coinstate'] = coinstate;
    if (coinstate == 1){
        console.log('tails');
        setImage(context,"tails");
        setTitle(context,"Tails");
    }
    else {
        console.log('heads');
        setImage(context,"heads");
        setTitle(context,"Heads");
    }
    updateSettings(context,settings);
}

function setTitle(context, title) {
    var json = {
        "event": "setTitle",
        "context": context,
        "payload": {
            "title": title,
            "target": "DestinationEnum.HARDWARE_AND_SOFTWARE"
        }
    };

    websocket.send(JSON.stringify(json));
}

function updateSettings(context,settings)
{
    if (websocket) {
        var json = {
            "event": "setSettings",
            "context": context,
            "payload": settings
        };
        //console.log(json);
        websocket.send(JSON.stringify(json));
        }
}


function setState(context, state) {
    if (websocket) {
        payload = {};
        payload.state = state;
        var json = {
            "event": "setState",
            "context": context,
            "payload": payload
        };
        websocket.send(JSON.stringify(json));
    }
}

function setImage(context,imageName) {
    loadImageAsDataUri(`${imageName}.png`, function (imgUrl) {
        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                image: imgUrl || "",
                target: "DestinationEnum.HARDWARE_AND_SOFTWARE"
            }
        };
        //console.log(json);
        websocket.send(JSON.stringify(json));
    })
}

function loadImageAsDataUri(url, callback) {
    var image = new Image();
    image.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0);
        callback(canvas.toDataURL("image/png"));
    };
    image.src = url;
};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo)
{
    pluginUUID = inPluginUUID;
    // Open the web socket
    websocket = new WebSocket("ws://localhost:" + inPort);

    function registerPlugin(inPluginUUID)
    {
        const json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onopen = function()
    {
        // WebSocket is connected, send message
        registerPlugin(pluginUUID);
        // getFile(function(status,data) {
        //     if (status) {
        //         console.log("Gif Loaded");
        //         var myFile = new File([data], "spinning.gif", {type:"image/gif"});
        //         console.log(myFile);
        //         //var file = new File(data,"spinning.gif");
        //         //console.log("file",myFile);
        //         var reader = new FileReader();
        //         reader.readAsDataURL(myFile);
        //         reader.onloadend = () => spinning = reader.result;
        //         console.log(spinning);
        //     }
        // });
    };

    websocket.onmessage = function (evt)
    {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
        const event = jsonObj['event'];
        const action = jsonObj['action'];
        const context = jsonObj['context'];
        const jsonPayload = jsonObj['payload'];
        //console.log("main plugin onmessage",jsonObj);
        if(event == "keyUp")
        {
            const settings = jsonPayload['settings'];
            const coordinates = jsonPayload['coordinates'];
            const state = jsonPayload['state'];
            coinflipAction.onKeyUp(context, settings, coordinates, state);
        }
        else if(event == "willAppear")
        {
            const settings = jsonPayload['settings'];
            const coordinates = jsonPayload['coordinates'];
            setState(context,0);
        }
        else if(event == "didReceiveSettings") {
                //console.log("incoming local",jsonPayload);
            }

        else if(event == "didReceiveGlobalSettings") {
                //console.log("incoming global",jsonObj);
                //globalSettingsCache = jsonPayload.settings;
            }
        else if(event == "sendToPlugin") {
                //console.log("incoming plugin message",jsonPayload);
            }
        }
};

function doSpinningImage(context) {

    if (websocket)
    {
        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                image: spinning,
                target: "DestinationEnum.HARDWARE"
            }
        };
        console.log(json);
        websocket.send(JSON.stringify(json));  
    }
}

function getFile(callback) {
    var url = "spinning.gif";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            try {
                data = xhr.responseText;
                callback(true,data);
            }
            catch(e) {
                callback(false,null);
            }
        }
        else {
            callback(false,null);
        }
    };
    xhr.onerror = function () {
        callback(false,null);
    };
    xhr.ontimeout = function () {
        callback(false,null);
    };
    xhr.send();
}