let cachedDict = {};
let accessToken;
let refreshToken;

function httpAuthAsync(method, url, callback, data = null) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.responseType = "json";
    url = "https://mgylabs.herokuapp.com" + url;
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == xmlHttp.DONE) {
            callback(xmlHttp.status, xmlHttp.response);
        }
    };
    xmlHttp.open(method, url, true);
    xmlHttp.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded;charset=UTF-8"
    );
    xmlHttp.send(data);
}

function httpRequestAsync(method, url, callback, jsonData = null) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.responseType = "json";
    url = "https://mgylabs.herokuapp.com" + url;
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == xmlHttp.DONE) {
            if (xmlHttp.status == 401) {
                let form = `refresh=${refreshToken}`;
                httpAuthAsync(
                    "POST",
                    "/auth/token/refresh",
                    function (status, response) {
                        if (status == 200) {
                            accessToken = response.access;
                            refreshToken = response.refresh;
                            chrome.storage.local.set({
                                accessToken: response.access,
                                refreshToken: response.refresh,
                                login: true,
                            });
                            httpRequestAsync(method, url, callback, jsonData);
                        } else {
                            chrome.storage.local.remove([
                                "accessToken",
                                "refreshToken",
                                "login",
                            ]);
                        }
                    },
                    form
                );
            } else {
                callback(xmlHttp.status, xmlHttp.response);
            }
        }
    };
    xmlHttp.open(method, url, true);
    xmlHttp.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.send(JSON.stringify(jsonData));
}

chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            hostEquals: "www.twitch.tv",
                            schemes: ["https"],
                        },
                    }),
                ],
                actions: [new chrome.declarativeContent.ShowPageAction()],
            },
        ]);
    });
});

chrome.storage.local.get(["accessToken", "refreshToken"], function (items) {
    accessToken = items.accessToken;
    refreshToken = items.refreshToken;
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(
        sender.tab
            ? "from a content script:" + sender.tab.url
            : "from the extension"
    );
    console.log(request);
    if (request.action === "getHls") {
        httpRequestAsync(
            "GET",
            `/highlighter/v1/twitch/${request.vid}?limit=3`,
            function (status, response) {
                if (status == 200) {
                    let result = [];
                    response.highlights.forEach((element) => {
                        result.push([
                            (element.start / response.duration) * 100,
                            ((element.end - element.start) /
                                response.duration) *
                                100,
                        ]);
                    });
                    sendResponse({ vsections: result });
                } else if (status == 404) {
                    sendResponse({
                        vsections: null,
                        message:
                            "Highlighter is not yet available for this video.",
                    });
                }
            }
        );
    } else if (request.action === "auth.token") {
        httpAuthAsync(
            "POST",
            "/auth/token",
            function (status, response) {
                if (status == 200) {
                    accessToken = response.access;
                    refreshToken = response.refresh;
                    chrome.storage.local.set(
                        {
                            accessToken: response.access,
                            refreshToken: response.refresh,
                            login: true,
                        },
                        function () {
                            sendResponse({ result: true });
                        }
                    );
                } else {
                    sendResponse({ result: false });
                }
            },
            request.formData
        );
    }
    return true;
});
